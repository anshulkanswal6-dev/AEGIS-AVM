"""
AEGIS Execution Service
=======================
Executes actions from a structured spec_json using the existing ActionEngine.
Does NOT run generated main.py files — uses engines directly.
"""

from __future__ import annotations

import os
import traceback
from typing import Any, Callable, Dict, List, Optional

import config
from action_engine import ActionEngine, ActionContext

# Shared engine instance
_action_engine = ActionEngine()


def execute_actions(
    spec_json: Dict[str, Any],
    log_fn: Optional[Callable] = None,
    automation_id: str = "unknown",
    owner_id: Optional[str] = None,
    project_name: str = "",
    context_data: Optional[Dict[str, Any]] = None,
    wallet_app_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Execute all actions defined in a spec_json.

    Args:
        spec_json: The automation specification with trigger/actions/params.
        log_fn: Optional callable(event, message, details) for logging.
        automation_id: Unique ID for the automation being executed.
        owner_id: Optional owner Profile ID.
        project_name: Optional project name for notifications.

    Returns:
        {"success": bool, "results": [...], "errors": [...]}
    """
    results: List[Dict[str, Any]] = []
    errors: List[Dict[str, Any]] = []

    # Build ActionContext from new spec structure
    chain_info = spec_json.get("chain", {})
    wallet_info = spec_json.get("wallet", {})
    trigger_params = {}
    if isinstance(spec_json.get("trigger"), dict):
        trigger_params = spec_json["trigger"].get("params", {})
    
    # Merge for backward compatibility
    top_params = spec_json.get("params", {})
    merged = {**top_params, **trigger_params}

    chain = chain_info.get("name") or merged.get("chain") or config.CHAIN_NAME
    rpc_url = chain_info.get("rpc") or merged.get("rpc_url") or config.RPC_URL
    wallet_address = wallet_info.get("address") or merged.get("wallet_address", "")

    ctx = ActionContext(
        chain=chain,
        rpc_url=rpc_url,
        wallet_address=wallet_address,
        wallet_app_id=wallet_app_id,
        automation_id=automation_id,
        owner_id=owner_id,
        project_name=project_name or spec_json.get("project_name"),
        secrets={"executor_mnemonic": config.ALGORAND_EXECUTOR_MNEMONIC},
        memory={},
    )

    # Auto-resolve wallet_app_id from profile metadata if not provided
    if not ctx.wallet_app_id and wallet_address:
        try:
            from runtime_store import get_store
            store = get_store()
            profile = store.get_profile_by_wallet(wallet_address)
            if profile:
                meta = profile.get("metadata") or {}
                app_id = meta.get("agent_wallet_app_id")
                if app_id:
                    ctx.wallet_app_id = int(app_id)
                    print(f"[ExecutionService] Resolved wallet_app_id={ctx.wallet_app_id} from profile")
        except Exception as e:
            print(f"[ExecutionService] Could not resolve wallet_app_id: {e}")

    context_data = context_data or {}

    def resolve_placeholders(text: Any) -> Any:
        if not isinstance(text, str) or not context_data:
            return text
        res = text
        for k, v in context_data.items():
            res = res.replace(f"{{{{{k}}}}}", str(v))
        return res

    actions = spec_json.get("actions", [])
    if not isinstance(actions, list):
        actions = [actions]

    def safe_log(event: str, message: str, details: Optional[Dict] = None):
        if not log_fn:
            return
        try:
            log_fn(event, message, details)
        except Exception as le:
            print(f"[AEGIS CRITICAL] Logging system failed: {le}")

    for i, action in enumerate(actions):
        action_type = action.get("type", "unknown") if isinstance(action, dict) else str(action)
        
        # Build action_params by merging global context with action-specific overrides
        action_params = {merged_key: merged_val for merged_key, merged_val in merged.items()}
        if isinstance(action, dict) and action.get("params"):
            action_params.update(action["params"])

        # Normalize notification fields for backward compatibility
        if action_type in ["notify", "send_email_notification"]:
            if not action_params.get("message"):
                action_params["message"] = action_params.get("body") or action_params.get("email_body") or "AEGIS Alert Triggered"
            
            # Apply placeholders to message
            action_params["message"] = resolve_placeholders(action_params["message"])
            
            if not action_params.get("to"):
                action_params["to"] = action_params.get("email_address") or merged.get("to")
            if not action_params.get("subject"):
                action_params["subject"] = action_params.get("email_subject") or "AEGIS Alert"

        safe_log("action_start", f"Executing action {i+1}/{len(actions)}: {action_type}", {"action_type": action_type})

        try:
            result = _action_engine.execute(action_type, action_params, ctx)
            success = result.get("success", False)
            
            # Map action type to natural language for the status stream
            msg = f"automation executed {action_type}"
            if action_type == "send_native_token":
                if success:
                    msg = f"automation sent payment to {action_params.get('recipient_address', 'recipient')}"
                else:
                    msg = f"payment failed: {result.get('error', 'unknown error')}"
            elif action_type == "send_erc20":
                if success:
                    msg = f"automation sent ERC20 to {action_params.get('recipient_address', 'recipient')}"
                else:
                    msg = f"ERC20 transfer failed: {result.get('error', 'unknown error')}"
            elif action_type == "swap":
                msg = f"automation swapped {action_params.get('from_token', 'token')} to {action_params.get('to_token', 'token')}"
            elif action_type == "send_email_notification":
                if success:
                    msg = "email sent"
                elif result.get("error") == "cooldown_active":
                    msg = f"email skipped (cooldown: {result.get('remaining')}s)"
                else:
                    msg = "email failed"
            elif action_type == "notify":
                msg = f"automation sent notification via {action_params.get('channel', 'email')}"
            elif action_type == "log_message":
                msg = action_params.get('message', 'automation logged a message')

            if success:
                safe_log("action_executed", msg, result)
            else:
                safe_log("action_failed", msg, result)

            results.append({
                "index": i,
                "action_type": action_type,
                "result": result,
            })

            if not success:
                errors.append({
                    "index": i,
                    "action_type": action_type,
                    "error": result.get("error", "Action returned success=False"),
                })
                # ABORT remaining actions if a critical action fails
                safe_log("execution_aborted", "stopping automation cycle due to action failure", {"failed_index": i})
                break

        except Exception as e:
            error_info = {
                "index": i,
                "action_type": action_type,
                "error": str(e),
                "traceback": traceback.format_exc(),
            }
            errors.append(error_info)
            safe_log("action_error", f"Action {action_type} failed with exception: {str(e)}", error_info)
            break

    # 3. Handle Structured Notifications
    notification_cfg = spec_json.get("notification")
    if notification_cfg and isinstance(notification_cfg, dict):
        channels = notification_cfg.get("channels", [])
        if not isinstance(channels, list): channels = [channels]
        
        safe_log("notification_start", f"Processing notifications for channels: {', '.join(channels)}", {"channels": channels})
        
        cooldown = notification_cfg.get("cooldown") or notification_cfg.get("notification_cooldown") or merged.get("notification_cooldown")
        local_project_name = project_name or spec_json.get("project_name", "AEGIS Project")
        
        for channel in channels:
            if channel == "none": continue
            
            try:
                # Reuse the existing action_notify logic but with specific params
                notify_params = {
                    "channel": channel, 
                    "notification_cooldown": cooldown,
                    "project_name": local_project_name
                }
                if channel == "telegram":
                    msg = notification_cfg.get("telegram", {}).get("message", "AEGIS Automation Triggered")
                    notify_params["message"] = resolve_placeholders(msg)
                elif channel == "email":
                    email_cfg = notification_cfg.get("email", {})
                    notify_params.update({
                        "to": email_cfg.get("to") or merged.get("to") or email_cfg.get("email_address"),
                        "subject": email_cfg.get("subject") or email_cfg.get("email_subject") or "AEGIS Alert",
                        "message": resolve_placeholders(email_cfg.get("body") or email_cfg.get("email_body") or "Automation condition met.")
                    })
                
                # Execute via engine (it handles the adapter logic internally)
                notify_result = _action_engine.execute("notify", notify_params, ctx)
                
                if notify_result.get("success"):
                    safe_log("notification_sent", f"Notification delivered via {channel}", {"channel": channel})
                else:
                    error_reason = notify_result.get("error")
                    # If it's a cooldown, don't log as 'failed'-fatal, log as 'skipped'
                    if error_reason == "cooldown_active":
                        safe_log("notification_skipped", f"Notification via {channel} skipped (cooldown active)", {"channel": channel})
                    else:
                        safe_log("notification_failed", f"Failed to send {channel} notification: {error_reason}", {"channel": channel})
                        # NEW: Count notification failure as an execution error
                        errors.append({
                            "type": "notification",
                            "channel": channel,
                            "error": error_reason
                        })
            
            except Exception as ne:
                safe_log("notification_error", f"Error during {channel} notification dispatch: {str(ne)}", {"channel": channel})
                errors.append({"type": "notification", "channel": channel, "error": str(ne)})

    overall_success = (len(errors) == 0)
    return {
        "success": overall_success,
        "total_actions": len(actions),
        "successful": len(results),
        "failed": len(errors),
        "results": results,
        "errors": errors,
    }
