"""
AEGIS Runtime Service
=====================
Core orchestration logic:
- Deploy automations into the runtime store
- Evaluate trigger conditions using TriggerEngine
- Execute actions via execution_service when triggers match
- Update automation status and metrics
"""

from __future__ import annotations

import os
import re
import traceback
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from trigger_engine import TriggerEngine, TriggerContext
from runtime_store import AutomationRecord, get_store
from config import DEFAULT_CHAIN, DEFAULT_RPC_URL, DEFAULT_SCHEDULE_INTERVAL_SECONDS
import log_service
import execution_service


# Shared trigger engine instance
_trigger_engine = TriggerEngine()


# =========================================================
# Interval parsing helper
# =========================================================

_INTERVAL_MULTIPLIERS = {
    "s": 1, "sec": 1, "seconds": 1,
    "m": 60, "min": 60, "minutes": 60,
    "h": 60 * 60, "hr": 60 * 60, "hours": 60 * 60,
    "d": 86400, "day": 86400, "days": 86400,
    "w": 604800, "week": 604800, "weeks": 604800,
}


def parse_interval_to_seconds(interval_str: str) -> int:
    """Parse '30s', '5m', '1h', '24h' etc. to seconds."""
    match = re.match(r"^(\d+)\s*([a-zA-Z]+)$", str(interval_str).strip())
    if not match:
        return DEFAULT_SCHEDULE_INTERVAL_SECONDS
    value = int(match.group(1))
    unit = match.group(2).lower()
    multiplier = _INTERVAL_MULTIPLIERS.get(unit, 1)
    return value * multiplier


# =========================================================
# Deploy
# =========================================================

def deploy_automation(
    name: str,
    spec_json: Dict[str, Any],
    session_id: str = "",
    wallet_address: str = "",
    description: str = "",
    files: Optional[Dict[str, str]] = None,
    automation_id: Optional[str] = None,
    project_id: Optional[str] = None  # Explicit project from frontend
) -> AutomationRecord:
    """
    Deploy an automation into the runtime store.
    Returns the created AutomationRecord.
    
    Priority for project resolution:
    1. Explicit project_id from frontend (always wins)
    2. session_id-based lookup (legacy fallback)
    """
    store = get_store()
    
    # Supabase Integration: Ensure Profile exists
    # Ensure we have a valid UUID for user_id to avoid Supabase crashes
    # 00000000-0000-0000-0000-000000000000 is used as the 'system' or 'anonymous' user
    user_id = "00000000-0000-0000-0000-000000000000"
    if wallet_address:
         user_id = store.ensure_profile(wallet_address)
    elif not user_id:
         # Fallback for stores that don't support profiles but need a string
         user_id = "default_user"
    
    # Final UUID safety for Supabase
    if not wallet_address and os.getenv("STORE_BACKEND") == "supabase":
         user_id = "00000000-0000-0000-0000-000000000000"
    
    # --- Project Resolution ---
    # Priority: explicit project_id > session_id fallback
    resolved_project_id = None
    
    # Clean incoming IDs
    def is_valid_uuid(val):
        if not val or val == "undefined": return False
        try:
            import uuid
            uuid.UUID(str(val))
            return True
        except: return False

    clean_project_id = project_id if is_valid_uuid(project_id) else None
    clean_session_id = session_id if is_valid_uuid(session_id) else None

    # Resolve Project
    resolved_project_id = store.get_or_create_project(
        name=name, 
        user_id=user_id, 
        wallet_address=wallet_address, 
        project_id=clean_project_id or clean_session_id
    )
    print(f"[AEGIS Deployment] Project resolved to: {resolved_project_id}")

    # --- Automation Resolution ---
    existing = None
    clean_auto_id = automation_id if is_valid_uuid(automation_id) else None
    
    if clean_auto_id:
        existing = store.get_automation(clean_auto_id)
    
    if not existing and resolved_project_id:
        # Look for any automation belonging to this project
        project_records = store.list_automations(project_id=resolved_project_id)
        if project_records:
            existing = project_records[0]
    
    # Use existing ID or generate fresh
    final_automation_id = existing.id if existing else (clean_auto_id or str(uuid.uuid4()))
    
    # Calculate next_run_at based on trigger type
    interval_seconds = _get_interval_from_spec(spec_json)
    next_run = datetime.now(timezone.utc) + timedelta(seconds=interval_seconds)

    if existing:
        automation_id = final_automation_id
        print(f"[AEGIS Deployment] Updating existing automation: {automation_id}")
        updates = {
            "name": name,
            "description": description,
            "project_id": resolved_project_id,
            "user_id": user_id, 
            "wallet_address": wallet_address,
            "spec_json": spec_json,
            "status": "active",
            "next_run_at": next_run.isoformat(),
            "files": files or {},
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        record = store.update_automation(automation_id, updates)
    else:
        automation_id = final_automation_id
        print(f"[AEGIS Deployment] Creating NEW automation: {automation_id} under project {resolved_project_id}")
        record = AutomationRecord(
            id=automation_id,
            name=name,
            project_id=resolved_project_id,
            description=description,
            session_id=session_id or str(uuid.uuid4()),
            wallet_address=wallet_address,
            spec_json=spec_json,
            status="active",
            next_run_at=next_run.isoformat(),
            files=files or {},
        )
        record.user_id = user_id
        store.save_automation(record)

    # Re-link versioning if files present
    if files:
        version_id = store.create_version(automation_id, files)
        store.update_automation(automation_id, {"current_version_id": version_id})

    # Update heartbeat
    store.update_heartbeat(automation_id)

    # Specific Deployment Log
    log_service.log_info(
        automation_id, "deployed",
        f"Automation '{name}' deployed and activated.",
        {"trigger_type": _get_trigger_type(spec_json), "interval_seconds": interval_seconds, "project_id": resolved_project_id}
    )
    print(f"[AEGIS Deployment] Automation {automation_id} is now ACTIVE (project={resolved_project_id}).")

    return record


# =========================================================
# Evaluate a single automation
# =========================================================

def evaluate_automation(automation_id: str) -> Dict[str, Any]:
    """
    Evaluate a single automation:
    1. Load from store
    2. Check trigger condition
    3. If matched, execute actions
    4. Update metrics and logs

    Returns: {"triggered": bool, "result": ...}
    """
    store = get_store()
    record = store.get_automation(automation_id)

    if not record:
        return {"triggered": False, "error": "Automation not found"}

    if record.status != "active":
        return {"triggered": False, "error": f"Automation is {record.status}"}

    spec = record.spec_json
    trigger_type = _get_trigger_type(spec)
    trigger_params = _get_trigger_params(spec)

    # Build TriggerContext with new spec structure support
    # Structure: spec["chain"]["name"], spec["wallet"]["address"], etc.
    chain_info = spec.get("chain", {})
    wallet_info = spec.get("wallet", {})
    
    chain = chain_info.get("name") or spec.get("params", {}).get("chain", DEFAULT_CHAIN)
    rpc_url = chain_info.get("rpc") or spec.get("params", {}).get("rpc_url", DEFAULT_RPC_URL) or os.getenv("RPC_URL", "")
    
    # Wallet address with fallback to trigger params
    wallet_address = wallet_info.get("address") or trigger_params.get("wallet_address") or spec.get("params", {}).get("wallet_address", "") or os.getenv("WALLET_ADDRESS", "")

    # Handle creation time for dynamic placeholders (e.g. [[current_time_plus_2_minutes]])
    created_at_dt = None
    if record.created_at:
        try:
            # fromisoformat handles 'Z' and offset formats
            created_at_str = record.created_at.replace("Z", "+00:00")
            created_at_dt = datetime.fromisoformat(created_at_str)
        except Exception:
            pass

    ctx = TriggerContext(
        chain=chain,
        rpc_url=rpc_url,
        wallet_address=wallet_address,
        now=datetime.now(timezone.utc),
        memory=record.memory or {},
        automation_created_at=created_at_dt,
    )

    # Defensive validation: Log if wallet_address is missing for known sensitive triggers
    wallet_sensitive_triggers = ["wallet_balance_below", "wallet_balance_above", "test_balance_low_then_claim_faucet"]
    if trigger_type in wallet_sensitive_triggers and not wallet_address:
        log_service.log_error(automation_id, "context_error", "wallet_address missing from deployed automation spec during trigger evaluation")

    # Clean status log for the UI
    log_service.log_info(automation_id, "trigger_check", f"Checking condition: {trigger_type}")

    try:
        triggered, match_data = _trigger_engine.evaluate(trigger_type, trigger_params, ctx)
        # Persist memory even if not triggered (e.g. updating last_known_balance)
        store.update_automation(automation_id, {"memory": ctx.memory})
    except Exception as e:
        log_service.log_exception(automation_id, "trigger_error", e)
        store.update_automation(automation_id, {
            "error_count": record.error_count + 1,
            "last_error": str(e),
        })
        return {"triggered": False, "error": str(e)}
    
    now_iso = datetime.now(timezone.utc).isoformat()

    if triggered:
        log_service.log_info(automation_id, "trigger_matched", "automation live")

        # Supabase: Create a Run entry
        run_id = store.create_run(automation_id, record.current_version_id, trigger_payload=trigger_params)

        # Execute actions
        def _log_fn(event: str, message: str, details: Optional[Dict] = None):
            log_service.log_info(automation_id, event, message, details)

        result = execution_service.execute_actions(
            spec, 
            _log_fn, 
            automation_id=automation_id, 
            owner_id=record.user_id, 
            project_name=record.name,
            context_data=match_data
        )

        # Calculate next_run_at
        interval_seconds = _get_interval_from_spec(spec)
        next_run = datetime.now(timezone.utc) + timedelta(seconds=interval_seconds)

        update_fields = {
            "last_run_at": now_iso,
            "next_run_at": next_run.isoformat(),
            "run_count": record.run_count + 1,
        }

        # Supabase: Update the Run
        store.update_run(run_id, {
            "status": "success" if result["success"] else "failed",
            "result": result,
            "error_message": str(result.get("errors", "")) if not result["success"] else None
        })

        # Update heartbeat
        store.update_heartbeat(automation_id)

        # Auto-complete for run_once triggers
        if trigger_type == "run_once_at_datetime":
            update_fields["status"] = "completed"
            print(f"[AEGIS Runtime] Automation {automation_id} marked as COMPLETED (run-once).")

        if not result["success"]:
            update_fields["error_count"] = record.error_count + 1
            update_fields["last_error"] = str(result.get("errors", []))

        store.update_automation(automation_id, update_fields)
        return {"triggered": True, "result": result}
    else:
        # Not triggered — still update next_run_at and heartbeat
        interval_seconds = _get_interval_from_spec(spec)
        next_run = datetime.now(timezone.utc) + timedelta(seconds=interval_seconds)
        store.update_automation(automation_id, {"next_run_at": next_run.isoformat()})
        store.update_heartbeat(automation_id)
        return {"triggered": False}


# =========================================================
# Query helpers
# =========================================================

def get_active_automations() -> List[AutomationRecord]:
    """Return all active automations."""
    store = get_store()
    return store.list_automations(status="active")


def get_all_automations(status: Optional[str] = None, project_id: Optional[str] = None, wallet_address: Optional[str] = None) -> List[AutomationRecord]:
    """Return all automations, optionally filtered by status, project, or wallet ownership."""
    store = get_store()
    return store.list_automations(status=status, project_id=project_id, wallet_address=wallet_address)


def pause_automation(automation_id: str) -> Optional[AutomationRecord]:
    """Pause an active automation."""
    store = get_store()
    record = store.update_automation(automation_id, {"status": "paused"})
    if record:
        log_service.log_info(automation_id, "paused", "automation paused")
    return record


def resume_automation(automation_id: str) -> Optional[AutomationRecord]:
    """Resume a paused automation."""
    store = get_store()
    record = store.update_automation(automation_id, {"status": "active"})
    if record:
        log_service.log_info(automation_id, "resumed", "automation live")
    return record


def update_automation_record(automation_id: str, updates: Dict[str, Any]) -> Optional[AutomationRecord]:
    """Update an automation's metadata in storage."""
    store = get_store()
    return store.update_automation(automation_id, updates)


def delete_automation(automation_id: str) -> bool:
    """Delete an automation from the store."""
    store = get_store()
    log_service.log_info(automation_id, "deleted", "Automation deleted by user")
    return store.delete_automation(automation_id)


def delete_project(project_id: str) -> bool:
    """Delete a project from the store."""
    store = get_store()
    return store.delete_project(project_id)


def get_automation_detail(automation_id: str) -> Optional[Dict[str, Any]]:
    """Get full automation details including recent logs."""
    store = get_store()
    record = store.get_automation(automation_id)
    if not record:
        return None
    data = record.to_dict()
    data["recent_logs"] = log_service.get_logs(automation_id, limit=20)
    return data


# =========================================================
# Internal helpers
# =========================================================

def _get_trigger_type(spec: Dict[str, Any]) -> str:
    """Extract trigger type from spec_json."""
    trigger = spec.get("trigger", {})
    if isinstance(trigger, dict):
        return trigger.get("type", "run_every_interval")
    return str(trigger)


def _get_trigger_params(spec: Dict[str, Any]) -> Dict[str, Any]:
    """Extract trigger params from spec_json with multi-level fallback."""
    trigger = spec.get("trigger", {})
    params = {}
    
    # 1. Start with top-level spec.params
    top_params = spec.get("params", {})
    if isinstance(top_params, dict):
        params.update(top_params)
        
    # 2. Add fields from trigger object itself (except type and params)
    if isinstance(trigger, dict):
        # Add flat trigger fields
        for k, v in trigger.items():
            if k not in ["type", "params"]:
                params[k] = v
        # 3. Layer on nested trigger.params (Highest priority)
        trigger_params = trigger.get("params", {})
        if isinstance(trigger_params, dict):
            params.update(trigger_params)
            
    return params


def _get_interval_from_spec(spec: Dict[str, Any]) -> int:
    """Determine the polling/scheduling interval from spec_json."""
    # Check runtime.interval_seconds first
    runtime = spec.get("runtime", {})
    if isinstance(runtime, dict) and "interval_seconds" in runtime:
        val = runtime["interval_seconds"]
        try:
            return int(val)
        except (ValueError, TypeError):
            # Fallback to string-based parsing if it's "30s"
            return parse_interval_to_seconds(str(val))

    # Check trigger params for interval
    trigger_params = _get_trigger_params(spec)
    if "interval" in trigger_params:
        return parse_interval_to_seconds(str(trigger_params["interval"]))

    return DEFAULT_SCHEDULE_INTERVAL_SECONDS
