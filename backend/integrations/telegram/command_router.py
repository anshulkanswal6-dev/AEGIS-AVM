"""
AEGIS Telegram Command Router
==============================
Handles incoming Telegram commands from linked users.
This is a SEPARATE layer from the automation alert/notification pipeline.

Architecture:
  Incoming message → parse command → resolve user by chat_id → handler → response

Does NOT touch:
  - NotificationAdapter
  - Automation alert flow
  - Any notification cooldown logic
"""

import os
import time
import random
import traceback
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Tuple

from .service import TelegramService

# ─── In-memory state for /delete confirmation ────────────────────────
# Maps chat_id → {"automation_id": str, "project_name": str, "expires": float}
_pending_deletes: Dict[str, Dict[str, Any]] = {}

# ─── In-memory state for /play feature ────────────────────────────────
# Maps chat_id → bool (True if awaiting name)
_pending_play: Dict[str, bool] = {}


# ─── Entry Point (called from poller.py) ──────────────────────────────

def handle_command(chat_id: str, text: str, telegram_user_id: str):
    """
    Main entry point for all non-/start Telegram messages.
    Resolves user, parses command, dispatches to handler.
    """
    svc = TelegramService()
    text = (text or "").strip()

    # ── Handle non-command text ──
    if not text.startswith("/"):
        # Check for /play name entry
        if chat_id in _pending_play:
            _handle_play_name(chat_id, text, svc)
            return

        # Check for pending /delete confirmation
        if text.upper() == "YES" and chat_id in _pending_deletes:
            _handle_delete_confirm(chat_id, svc)
            return
        svc.send_message(chat_id, "🤖 Use /help to see available commands")
        return

    # ── Parse command and args ──
    command, args = _parse_command(text)

    # ── Commands that don't need user resolution ──
    if command == "hi":
        cmd_hi(chat_id, svc)
        return
    if command == "help":
        cmd_help(chat_id, svc)
        return
    if command == "health":
        cmd_health(chat_id, svc)
        return
    if command == "test_telegram":
        cmd_test(chat_id, svc)
        return
    if command == "play":
        cmd_play(chat_id, svc)
        return

    # ── Resolve user from chat_id ──
    user_id = _resolve_user(chat_id)
    if not user_id:
        svc.send_message(
            chat_id,
            "🔗 <b>Account not linked</b>\n\n"
            "Please connect your Telegram from the AEGIS dashboard → Integrations tab."
        )
        return

    # ── Dispatch to handler ──
    try:
        if command == "projects":
            cmd_projects(chat_id, svc, user_id)
        elif command == "deployed":
            cmd_deployed(chat_id, svc, user_id)
        elif command == "automation":
            cmd_automation(chat_id, svc, user_id, args)
        elif command == "status":
            cmd_status(chat_id, svc, user_id, args)
        elif command == "wallet":
            cmd_wallet(chat_id, svc, user_id)
        elif command == "agentwallet":
            cmd_agentwallet(chat_id, svc, user_id)
        elif command == "balance":
            cmd_balance(chat_id, svc, user_id)
        elif command == "hi":
            cmd_hi(chat_id, svc)
        elif command == "help":
            cmd_help(chat_id, svc)
        elif command == "logs":
            cmd_logs(chat_id, svc, user_id, args)
        elif command == "runs":
            cmd_runs(chat_id, svc, user_id, args)
        elif command == "pause":
            cmd_pause(chat_id, svc, user_id, args)
        elif command == "resume":
            cmd_resume(chat_id, svc, user_id, args)
        elif command == "next":
            cmd_next(chat_id, svc, user_id, args)
        elif command == "delete":
            cmd_delete(chat_id, svc, user_id, args)
        elif command == "unlink":
            cmd_unlink(chat_id, svc, user_id)
        else:
            svc.send_message(chat_id, f"❓ Unknown command: /{command}\n\nUse /help to see available commands.")
    except Exception as e:
        print(f"[TelegramCmd] Error handling /{command}: {e}")
        traceback.print_exc()
        svc.send_message(chat_id, f"⚠️ Something went wrong processing /{command}.\n\nPlease try again.")


# ═══════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════

def _parse_command(text: str) -> Tuple[str, str]:
    """Parse '/command args' into (command, args)."""
    # Handle bot-suffixed commands like /help@AegisSentinelBot
    parts = text.split(None, 1)
    raw_cmd = parts[0].lstrip("/").lower()
    # Strip @botname suffix
    if "@" in raw_cmd:
        raw_cmd = raw_cmd.split("@")[0]
    args = parts[1].strip() if len(parts) > 1 else ""
    # Strip angle brackets — users may type /pause <test4> literally
    args = args.strip("<>").strip()
    return raw_cmd, args


def _resolve_user(chat_id: str) -> Optional[str]:
    """Resolve platform user_id from telegram_chat_id."""
    try:
        from runtime_store import get_store
        from supabase_store import SupabaseStore
        store = get_store()
        if not isinstance(store, SupabaseStore):
            return None
        result = store.client.table("user_telegram_accounts") \
            .select("user_id") \
            .eq("telegram_chat_id", chat_id) \
            .execute()
        if result.data:
            return result.data[0]["user_id"]
        return None
    except Exception as e:
        print(f"[TelegramCmd] User resolution failed: {e}")
        return None


def _get_supabase_client():
    """Get the Supabase client from the store."""
    from runtime_store import get_store
    from supabase_store import SupabaseStore
    store = get_store()
    if not isinstance(store, SupabaseStore):
        return None
    return store.client


def _resolve_project(user_id: str, project_name: str) -> Optional[Dict[str, Any]]:
    """
    Resolve a project by name for the given user.
    Includes fallback to 'guest' projects (00000000-0000-0000-0000-000000000000).
    Prioritizes:
    1. Active status
    2. Exact name match
    3. Most recent update
    """
    client = _get_supabase_client()
    if not client:
        return None

    # Search for projects belonging to user OR the guest ID
    user_ids = [user_id, "00000000-0000-0000-0000-000000000000"]
    
    # Try exact match first
    result = client.table("projects") \
        .select("*") \
        .in_("user_id", user_ids) \
        .ilike("name", project_name) \
        .execute()

    matches = result.data or []

    # If no exact, try partial
    if not matches:
        result = client.table("projects") \
            .select("*") \
            .in_("user_id", user_ids) \
            .ilike("name", f"%{project_name}%") \
            .execute()
        matches = result.data or []

    if not matches:
        return None

    # Prioritize: Active > Draft, then by Updated At
    def rank(p):
        status_rank = 0 if p.get("status") == "active" else 1
        # Also prefer the actual user's project over guest if both are same status
        owner_rank = 0 if p.get("user_id") == user_id else 1
        return (status_rank, owner_rank, p.get("updated_at", ""))

    matches.sort(key=rank)
    return matches[0]


def _get_latest_project(user_id: str) -> Optional[Dict[str, Any]]:
    """Get the most recently updated project for a user."""
    client = _get_supabase_client()
    if not client:
        return None
    result = client.table("projects") \
        .select("*") \
        .eq("user_id", user_id) \
        .order("updated_at", desc=True) \
        .limit(1) \
        .execute()
    return result.data[0] if result.data else None


def _resolve_project_or_latest(user_id: str, args: str, chat_id: str, svc: TelegramService) -> Optional[Dict[str, Any]]:
    """
    Helper: resolve project from args, or fallback to latest.
    Returns project dict or None (and sends error message).
    """
    if args:
        project = _resolve_project(user_id, args)
        if not project:
            svc.send_message(
                chat_id,
                f"❌ Project <b>{_esc(args)}</b> not found.\n\nUse /projects to see your projects."
            )
            return None
        return project
    else:
        project = _get_latest_project(user_id)
        if not project:
            svc.send_message(chat_id, "📂 You have no projects yet.")
            return None
        svc.send_message(chat_id, f"📂 Using latest project: <b>{_esc(project.get('name', ''))}</b>")
        return project


def _get_automation_for_project(project_id: str, user_id: str = None, project_name: str = None) -> Optional[Dict[str, Any]]:
    """
    Get the automation linked to a project.
    Strategy:
      1. Direct project_id match
      2. Fallback: user_id + automation name matching project name
      3. Fallback: user_id + any automation (if only one exists)
    """
    client = _get_supabase_client()
    if not client:
        return None

    # 1. Direct match by project_id
    result = client.table("automations") \
        .select("*") \
        .eq("project_id", project_id) \
        .limit(1) \
        .execute()
    if result.data:
        print(f"[TelegramCmd] Found automation by project_id: {project_id}")
        return result.data[0]

    # 2. Fallback: match by user_id + name (case-insensitive)
    if project_name:
        user_ids = [user_id, "00000000-0000-0000-0000-000000000000"]
        # Filter out None if user_id is missing
        actual_ids = [uid for uid in user_ids if uid]
        
        result = client.table("automations") \
            .select("*") \
            .in_("user_id", actual_ids) \
            .ilike("name", f"%{project_name}%") \
            .order("user_id", desc=True) \
            .limit(1) \
            .execute()
            
        if result.data:
            print(f"[TelegramCmd] Found automation by name match (including global): '{project_name}' → {result.data[0].get('id')}")
            return result.data[0]

    # 3. Log miss for debugging
    print(f"[TelegramCmd] No automation found for project_id={project_id}, user_id={user_id}, name={project_name}")
    return None


def _esc(text: str) -> str:
    """Escape HTML special characters for Telegram."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _fmt_time(iso_str: Optional[str]) -> str:
    """Format an ISO timestamp to show both UTC and IST."""
    if not iso_str:
        return "N/A"
    try:
        # Parse and convert to UTC
        dt_utc = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        
        # Calculate IST (UTC + 5:30)
        from datetime import timedelta
        dt_ist = dt_utc + timedelta(hours=5, minutes=30)
        
        utc_str = dt_utc.strftime("%H:%M:%S UTC")
        ist_str = dt_ist.strftime("%H:%M:%S IST")
        
        return f"{ist_str} ({utc_str})"
    except Exception:
        return iso_str[:19] if iso_str else "N/A"


# ═══════════════════════════════════════════════════════════════════════
# COMMAND HANDLERS
# ═══════════════════════════════════════════════════════════════════════

def cmd_hi(chat_id: str, svc: TelegramService):
    svc.send_message(
        chat_id,
        "👋 <b>Hello from AEGIS!</b>⋆.ೃ࿔*:･\n\n"
        "I'm your Remote AEGIS Brain Assistant.💬 \n"
        "Use /help to see what I can do.😎"
    )


def cmd_help(chat_id: str, svc: TelegramService):
    svc.send_message(
        chat_id,
        "<b>🧠 AEGIS Brain Commands</b>\n\n"
        "📝 <b>Info</b>\n"
        "/projects — List all projects\n"
        "/deployed — Show deployed projects\n"
        "/automation &lt;name&gt; — Automation details\n"
        "/status &lt;name&gt; — Project status\n"
        "/logs &lt;name&gt; — Recent logs (3 min)\n"
        "/runs &lt;name&gt; — Run history\n"
        "/next &lt;name&gt; — Next scheduled run\n\n"
        "💰 <b>Wallet</b>\n"
        "/wallet — Connected metamask\n"
        "/agentwallet — Your Agent Wallet\n"
        "/balance — Quick balance check\n\n"
        "🕹️ <b>Control</b>\n"
        "/pause &lt;name&gt; — Pause automation\n"
        "/resume &lt;name&gt; — Resume automation\n"
        "/delete &lt;name&gt; — Delete automation\n\n"
        "🔮 <b>System</b>\n"
        "/health — Platform health\n"
        "/test_telegram — Test delivery\n"
        "/unlink — Unlink Telegram\n\n"
        "👻 <b>Miscellaneous</b>\n"
        "/play — Fortune Cookie Game\n"
        "/help — View all commands\n\n"
        "ⓘ <i>If you skip &lt;projectname&gt;, the latest project is used.</i>"
    )


def _get_project_automation_map(user_id: str, project_ids: list) -> Dict[str, Dict]:
    """Batch-fetch all automations for a list of project IDs."""
    client = _get_supabase_client()
    if not client or not project_ids:
        return {}
    try:
        result = client.table("automations") \
            .select("project_id, status, is_enabled") \
            .in_("project_id", project_ids) \
            .execute()
        mapping = {}
        for a in result.data:
            pid = a.get("project_id")
            # If a project has multiple automations, prefer the enabled one
            if pid not in mapping or a.get("is_enabled"):
                mapping[pid] = a
        return mapping
    except Exception as e:
        print(f"[TelegramCmd] Batch automation fetch failed: {e}")
        return {}


def _resolve_display_status(auto: Optional[Dict], project: Dict) -> str:
    """Determine the display status for a project based on automation state."""
    if not auto:
        # No automation linked — use project table status
        return project.get("status", "draft")
    
    status = auto.get("status", "draft")
    
    # If paused or completed, respect that
    if status in ("paused", "completed"):
        return status

    # Check live status from the latest run in Supabase
    client = _get_supabase_client()
    if client:
        try:
            latest = client.table("automation_runs") \
                .select("status") \
                .eq("automation_id", auto["id"]) \
                .order("started_at", desc=True) \
                .limit(1) \
                .execute()
            
            if latest.data and latest.data[0].get("status") == "failed":
                return "failed"
        except Exception as e:
            print(f"[TelegramCmd] Status check fallback error: {e}")

    # Fallback to local keys (legacy or if DB query fails)
    error_count = auto.get("error_count", 0) or 0
    last_error = auto.get("last_error")
    if error_count > 0 and last_error:
        return "failed"
    
    return status


def cmd_projects(chat_id: str, svc: TelegramService, user_id: str):
    client = _get_supabase_client()
    if not client:
        svc.send_message(chat_id, "⚠️ Database unavailable.")
        return

    result = client.table("projects") \
        .select("id, name, status, created_at") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True) \
        .limit(10) \
        .execute()

    if not result.data:
        svc.send_message(chat_id, "📂 You have no projects yet.\n\nCreate one from the AEGIS dashboard.")
        return

    # Batch-fetch automation statuses
    project_ids = [p["id"] for p in result.data]
    auto_map = _get_project_automation_map(user_id, project_ids)

    lines = ["<b>📂 Your Projects</b>\n"]
    for p in result.data:
        auto = auto_map.get(p["id"])
        status = _resolve_display_status(auto, p)
        emoji = {"active": "🟢", "paused": "🟡", "failed": "🔴", "draft": "⚪", "completed": "✅"}.get(status, "⚪")
        lines.append(f"{emoji} <b>{_esc(p.get('name', 'Untitled'))}</b> — {status}")

    svc.send_message(chat_id, "\n".join(lines))


def cmd_deployed(chat_id: str, svc: TelegramService, user_id: str):
    """Show only projects that have a deployed automation."""
    client = _get_supabase_client()
    if not client:
        svc.send_message(chat_id, "⚠️ Database unavailable.")
        return

    # Get user's projects
    proj_result = client.table("projects") \
        .select("id, name") \
        .eq("user_id", user_id) \
        .execute()

    if not proj_result.data:
        svc.send_message(chat_id, "📂 No projects found.")
        return

    project_ids = [p["id"] for p in proj_result.data]
    auto_map = _get_project_automation_map(user_id, project_ids)

    # Filter to only projects with automations
    deployed = []
    for p in proj_result.data:
        auto = auto_map.get(p["id"])
        if auto:
            deployed.append((p, auto))

    if not deployed:
        svc.send_message(chat_id, "🚀 No deployed automations yet.\n\nDeploy one from the AEGIS dashboard.")
        return

    lines = ["<b>🚀 Deployed Automations</b>\n"]
    for p, auto in deployed:
        status = _resolve_display_status(auto, p)
        emoji = {"active": "🟢", "paused": "🟡", "failed": "🔴", "completed": "✅"}.get(status, "⚪")
        lines.append(f"{emoji} <b>{_esc(p.get('name', 'Untitled'))}</b> — {status}")

    svc.send_message(chat_id, "\n".join(lines))


def cmd_automation(chat_id: str, svc: TelegramService, user_id: str, args: str):
    project = _resolve_project_or_latest(user_id, args, chat_id, svc)
    if not project:
        return

    auto = _get_automation_for_project(project["id"], user_id, project.get("name"))
    if not auto:
        svc.send_message(chat_id, f"⚙️ No automation deployed for <b>{_esc(project.get('name', ''))}</b>.")
        return

    status = auto.get("status", "unknown")
    trigger_type = auto.get("trigger_type", "unknown")
    next_run = _fmt_time(auto.get("next_run_at"))

    emoji = {"active": "🟢", "paused": "🟡", "failed": "🔴"}.get(status, "⚪")

    msg = (
        f"<b>⚙️ Automation Details</b>\n\n"
        f"📂 Project: <b>{_esc(project.get('name', ''))}</b>\n"
        f"🔖 Name: {_esc(auto.get('name', 'Unnamed'))}\n"
        f"{emoji} Status: {status}\n"
        f"🎯 Trigger: <code>{trigger_type}</code>\n"
        f"⏭️ Next run: {next_run}\n"
        f"🆔 <code>{auto.get('id', 'N/A')}</code>"
    )
    svc.send_message(chat_id, msg)


def cmd_status(chat_id: str, svc: TelegramService, user_id: str, args: str):
    project = _resolve_project_or_latest(user_id, args, chat_id, svc)
    if not project:
        return

    auto = _get_automation_for_project(project["id"], user_id, project.get("name"))
    display_status = _resolve_display_status(auto, project)
    auto_emoji = {"active": "🟢", "paused": "🟡", "failed": "🔴", "completed": "✅"}.get(display_status, "⚪")

    msg = (
        f"<b>📊 Status</b>\n\n"
        f"📂 Project: <b>{_esc(project.get('name', ''))}</b>\n"
        f"{auto_emoji} Status: {display_status}"
    )

    if auto:
        client = _get_supabase_client()
        run_count = 0
        error_count = 0
        last_run_at = auto.get("last_run_at")

        if client:
            try:
                # Fetch counts from automation_runs table (the source of truth for execution)
                runs_res = client.table("automation_runs") \
                    .select("status", count="exact") \
                    .eq("automation_id", auto["id"]) \
                    .execute()
                
                run_count = runs_res.count or 0
                
                # Filter for failed runs manually or via another query
                # Simplest for now: count success vs failed in the same dataset or dedicated query
                err_res = client.table("automation_runs") \
                    .select("id", count="exact") \
                    .eq("automation_id", auto["id"]) \
                    .eq("status", "failed") \
                    .execute()
                error_count = err_res.count or 0
                
            except Exception as e:
                print(f"[TelegramCmd] Stats fetch failed: {e}")
                run_count = auto.get("run_count", 0) or 0
                error_count = auto.get("error_count", 0) or 0

        msg += f"\n🔄 Runs: {run_count} | Errors: {error_count}"
        msg += f"\n⏱️ Last run: {_fmt_time(last_run_at)}"
    
    svc.send_message(chat_id, msg)


def _get_metamask_wallet(user_id: str) -> Optional[str]:
    """Fetch user's primary connected Algorand wallet from profiles table."""
    client = _get_supabase_client()
    if not client:
        return None
    try:
        result = client.table("profiles") \
            .select("wallet_address") \
            .eq("id", user_id) \
            .execute()
        
        if result.data:
            return result.data[0].get("wallet_address")
    except Exception as e:
        print(f"[TelegramCmd] Wallet lookup failed: {e}")
    return None


def _get_agent_wallet(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Search for an Agent Wallet App ID.
    Source of Truth: profile metadata.
    """
    client = _get_supabase_client()
    if not client:
        return None

    try:
        prof = client.table("profiles").select("wallet_address, metadata").eq("id", user_id).execute()
        if not prof.data:
            return None
        
        metadata = prof.data[0].get("metadata") or {}
        wallet_app_id = metadata.get("agent_wallet_app_id")
        
        if wallet_app_id:
            return {
                "address": prof.data[0].get("wallet_address"),
                "app_id": wallet_app_id
            }
    except Exception as e:
        print(f"[TelegramCmd] Agent lookup failed: {e}")
    
    return None


def cmd_agentwallet(chat_id: str, svc: TelegramService, user_id: str):
    """Specific command for Agent Wallet details (AVM)."""
    wallet_info = _get_agent_wallet(user_id)
    if not wallet_info or not wallet_info.get("app_id"):
        svc.send_message(
            chat_id, 
            "⚠️ No agent wallet app found for your account. Create one from the AEGIS dashboard."
        )
        return

    try:
        from algosdk.v2client import algod
        algod_url = os.getenv("ALGOD_URL", "https://testnet-api.algonode.cloud")
        client = algod.AlgodClient("", algod_url)
        
        app_id = int(wallet_info["app_id"])
        app_info = client.application_info(app_id)
        app_address = app_info['params']['address']
        
        account_info = client.account_info(app_address)
        balance_microalgos = account_info.get('amount', 0)
        balance_algo = balance_microalgos / 1_000_000
        chain = "Algorand Testnet"

        msg = (
            f"<b>🤖 Agent Wallet (AVM)</b>\n\n"
            f"🆔 App ID: <code>{app_id}</code>\n"
            f"📍 Address:\n<code>{app_address}</code>\n\n"
            f"💎 Balance: <b>{balance_algo:.4f}</b> ALGO\n"
            f"🔗 Chain: {chain}"
        )
        svc.send_message(chat_id, msg)
    except Exception as e:
        print(f"[TelegramCmd] /agentwallet error: {e}")
        svc.send_message(chat_id, f"⚠️ Error fetching agent stats.")


def cmd_wallet(chat_id: str, svc: TelegramService, user_id: str):
    """Show user's connected Algorand address and balance."""
    wallet_address = _get_metamask_wallet(user_id)
    if not wallet_address:
        svc.send_message(chat_id, "⚠️ No connected wallet found.")
        return

    try:
        from algosdk.v2client import algod
        algod_url = os.getenv("ALGOD_URL", "https://testnet-api.algonode.cloud")
        client = algod.AlgodClient("", algod_url)
        
        account_info = client.account_info(wallet_address)
        balance_microalgos = account_info.get('amount', 0)
        balance_algo = balance_microalgos / 1_000_000
        chain = "Algorand Testnet"

        msg = (
            f"<b>👛 Connected Wallet</b>\n\n"
            f"📍 Address:\n<code>{wallet_address}</code>\n\n"
            f"💎 Balance: <b>{balance_algo:.4f}</b> ALGO\n"
            f"🔗 Chain: {chain}"
        )
        svc.send_message(chat_id, msg)
    except Exception as e:
        print(f"[TelegramCmd] /wallet error: {e}")
        svc.send_message(chat_id, f"⚠️ Error fetching balance.")


def cmd_balance(chat_id: str, svc: TelegramService, user_id: str):
    """Quick balance check for connected wallet."""
    wallet_address = _get_metamask_wallet(user_id)
    if not wallet_address:
        svc.send_message(chat_id, "⚠️ No connected wallet found.")
        return

    try:
        from algosdk.v2client import algod
        algod_url = os.getenv("ALGOD_URL", "https://testnet-api.algonode.cloud")
        client = algod.AlgodClient("", algod_url)
        
        info = client.account_info(wallet_address)
        balance_microalgos = info.get('amount', 0)
        balance_algo = balance_microalgos / 1_000_000
        
        svc.send_message(chat_id, f"💎 Balance: <b>{balance_algo:.4f}</b> ALGO")
    except Exception as e:
        print(f"[TelegramCmd] /balance error: {e}")
        svc.send_message(chat_id, "⚠️ Error.")

def cmd_logs(chat_id: str, svc: TelegramService, user_id: str, args: str):
    """Fetch logs from terminal_logs for last 3 minutes."""
    project = _resolve_project_or_latest(user_id, args, chat_id, svc)
    if not project:
        return

    client = _get_supabase_client()
    if not client:
        svc.send_message(chat_id, "⚠️ Database unavailable.")
        return

    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()

    result = client.table("terminal_logs") \
        .select("timestamp, level, message") \
        .eq("project_id", project["id"]) \
        .gte("timestamp", cutoff) \
        .order("timestamp", desc=True) \
        .limit(20) \
        .execute()

    if not result.data:
        svc.send_message(
            chat_id,
            f"📄 No logs in the last 30 minutes for <b>{_esc(project.get('name', ''))}</b>."
        )
        return

    lines = [f"<b>📄 Logs — {_esc(project.get('name', ''))}</b>\n<i>(last 30 minutes)</i>\n"]
    for log in reversed(result.data):  # oldest first
        ts = _fmt_time(log.get("timestamp"))
        level = log.get("level", "info").upper()
        msg = log.get("message", "")
        lines.append(f"<code>{ts}</code> [{level}]\n{_esc(msg)}")

    svc.send_message(chat_id, "\n".join(lines))


def cmd_runs(chat_id: str, svc: TelegramService, user_id: str, args: str):
    """Fetch recent runs for the project's automation."""
    project = _resolve_project_or_latest(user_id, args, chat_id, svc)
    if not project:
        return

    auto = _get_automation_for_project(project["id"], user_id, project.get("name"))
    if not auto:
        svc.send_message(chat_id, f"⚙️ No automation deployed for <b>{_esc(project.get('name', ''))}</b>.")
        return

    client = _get_supabase_client()
    if not client:
        svc.send_message(chat_id, "⚠️ Database unavailable.")
        return

    result = client.table("automation_runs") \
        .select("status, started_at, ended_at") \
        .eq("automation_id", auto["id"]) \
        .order("started_at", desc=True) \
        .limit(8) \
        .execute()

    if not result.data:
        svc.send_message(chat_id, f"🏃 No runs found for <b>{_esc(project.get('name', ''))}</b>.")
        return

    lines = [f"<b>🏃 Recent Runs — {_esc(project.get('name', ''))}</b>\n"]
    for run in result.data:
        status = run.get("status", "unknown")
        emoji = {"success": "✅", "failed": "❌", "running": "🔄"}.get(status, "⚪")
        started = _fmt_time(run.get("started_at"))
        lines.append(f"{emoji} {status} — {started}")

    svc.send_message(chat_id, "\n".join(lines))


def cmd_pause(chat_id: str, svc: TelegramService, user_id: str, args: str):
    project = _resolve_project_or_latest(user_id, args, chat_id, svc)
    if not project:
        return

    auto = _get_automation_for_project(project["id"], user_id, project.get("name"))
    if not auto:
        svc.send_message(chat_id, f"⚙️ No automation deployed for <b>{_esc(project.get('name', ''))}</b>.")
        return

    if auto.get("status") == "paused":
        svc.send_message(chat_id, f"⏸️ <b>{_esc(project.get('name', ''))}</b> is already paused.")
        return

    import runtime_service
    result = runtime_service.pause_automation(auto["id"])
    if result:
        # Unschedule from worker
        from worker import get_worker
        get_worker().unschedule_automation(auto["id"])
        svc.send_message(chat_id, f"⏸️ <b>{_esc(project.get('name', ''))}</b> paused successfully.")
    else:
        svc.send_message(chat_id, f"⚠️ Could not pause <b>{_esc(project.get('name', ''))}</b>.")


def cmd_resume(chat_id: str, svc: TelegramService, user_id: str, args: str):
    project = _resolve_project_or_latest(user_id, args, chat_id, svc)
    if not project:
        return

    auto = _get_automation_for_project(project["id"], user_id, project.get("name"))
    if not auto:
        svc.send_message(chat_id, f"⚙️ No automation deployed for <b>{_esc(project.get('name', ''))}</b>.")
        return

    if auto.get("status") == "active":
        svc.send_message(chat_id, f"▶️ <b>{_esc(project.get('name', ''))}</b> is already active.")
        return

    import runtime_service
    result = runtime_service.resume_automation(auto["id"])
    if result:
        # Re-schedule in worker
        from worker import get_worker
        interval = runtime_service._get_interval_from_spec(result.spec_json)
        get_worker().schedule_new_automation(auto["id"], interval)
        svc.send_message(chat_id, f"▶️ <b>{_esc(project.get('name', ''))}</b> resumed successfully.")
    else:
        svc.send_message(chat_id, f"⚠️ Could not resume <b>{_esc(project.get('name', ''))}</b>.")


def cmd_next(chat_id: str, svc: TelegramService, user_id: str, args: str):
    project = _resolve_project_or_latest(user_id, args, chat_id, svc)
    if not project:
        return

    auto = _get_automation_for_project(project["id"], user_id, project.get("name"))
    if not auto:
        svc.send_message(chat_id, f"⚙️ No automation deployed for <b>{_esc(project.get('name', ''))}</b>.")
        return

    next_run = auto.get("next_run_at")
    if next_run:
        svc.send_message(
            chat_id,
            f"⏭️ Next run for <b>{_esc(project.get('name', ''))}</b>:\n\n"
            f"🕐 {_fmt_time(next_run)}"
        )
    else:
        svc.send_message(chat_id, f"⏭️ No scheduled next run for <b>{_esc(project.get('name', ''))}</b>.")


def cmd_delete(chat_id: str, svc: TelegramService, user_id: str, args: str):
    """Two-step delete: ask for confirmation first."""
    project = _resolve_project_or_latest(user_id, args, chat_id, svc)
    if not project:
        return

    auto = _get_automation_for_project(project["id"], user_id, project.get("name"))

    # Store pending delete with 60-second expiry
    _pending_deletes[chat_id] = {
        "automation_id": auto["id"] if auto else None,
        "project_id": project["id"],
        "project_name": project.get("name", "Unknown"),
        "expires": time.time() + 60
    }

    svc.send_message(
        chat_id,
        f"⚠️ <b>Confirm Deletion</b>\n\n"
        f"This will delete <b>{_esc(project.get('name', ''))}</b> and all its associated data.\n\n"
        f"Reply <b>YES</b> within 60 seconds to confirm.\n"
        f"Send anything else to cancel."
    )


def _handle_delete_confirm(chat_id: str, svc: TelegramService):
    """Process a YES confirmation for /delete."""
    pending = _pending_deletes.pop(chat_id, None)
    if not pending:
        svc.send_message(chat_id, "❓ No pending deletion to confirm.")
        return

    # Check expiry
    if time.time() > pending["expires"]:
        svc.send_message(chat_id, "⏰ Deletion timed out. Use /delete again.")
        return

    automation_id = pending["automation_id"]
    project_id = pending["project_id"]
    project_name = pending["project_name"]

    try:
        # Unschedule from worker if an automation exists
        if automation_id:
            from worker import get_worker
            get_worker().unschedule_automation(automation_id)

        import runtime_service
        # Delete project (which now also handles its automations in our new store logic)
        deleted = runtime_service.delete_project(project_id)
        
        if deleted:
            svc.send_message(chat_id, f"🗑️ Project <b>{_esc(project_name)}</b> deleted successfully.")
        else:
            svc.send_message(chat_id, f"⚠️ Could not delete <b>{_esc(project_name)}</b>. It might have already been removed.")
    except Exception as e:
        print(f"[TelegramCmd] Delete failed: {e}")
        svc.send_message(chat_id, f"⚠️ Deletion failed: {_esc(str(e))}")


def cmd_unlink(chat_id: str, svc: TelegramService, user_id: str):
    from .linking import unlink_telegram_account
    success = unlink_telegram_account(user_id)
    if success:
        svc.send_message(
            chat_id,
            "⛓️‍💥 <b>Telegram Unlinked</b>\n\n"
            "You will no longer receive alerts.💨\n"
            "Reconnect anytime from the AEGIS dashboard.🥂"
        )
    else:
        svc.send_message(chat_id, "⚠️ Could not unlink. Please try again.")


def cmd_test(chat_id: str, svc: TelegramService):
    svc.send_message(
        chat_id,
        "✅ <b>Test Successful! 🎉</b>\n\n"
        "Remote Brain delivery is working.💬\n"
        "You'll receive real-time updates here.😎"
    )


def cmd_health(chat_id: str, svc: TelegramService):
    """Platform health summary."""
    checks = []

    # 1. Worker status
    try:
        from worker import get_worker
        worker = get_worker()
        w_status = "🟢 Running" if worker.is_running else "🔴 Stopped"
        checks.append(f"⚙️ Worker: {w_status}")
    except Exception:
        checks.append("⚙️ Worker: ⚠️ Unknown")

    # 2. Database
    try:
        client = _get_supabase_client()
        if client:
            client.table("profiles").select("id").limit(1).execute()
            checks.append("🗄️ Database: 🟢 Connected")
        else:
            checks.append("🗄️ Database: 🟡 Non-Supabase mode")
    except Exception:
        checks.append("🗄️ Database: 🔴 Unreachable")

    # 3. Telegram Bot
    try:
        me = svc.get_me()
        if me and me.get("ok"):
            bot_name = me.get("result", {}).get("username", "Unknown")
            checks.append(f"🤖 Bot: 🟢 @{bot_name}")
        else:
            checks.append("🤖 Bot: 🔴 Error")
    except Exception:
        checks.append("🤖 Bot: 🔴 Unreachable")

    # 4. RPC
    try:
        from web3 import Web3
        rpc_url = os.getenv("RPC_URL", "https://testnet-rpc.monad.xyz")
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        block = w3.eth.block_number
        checks.append(f"🔗 RPC: 🟢 Block #{block}")
    except Exception:
        checks.append("🔗 RPC: 🔴 Unreachable")

    msg = "<b>🛡️ AEGIS Health</b>\n\n" + "\n".join(checks)
    svc.send_message(chat_id, msg)


# ═══════════════════════════════════════════════════════════════════════
# GAME HANDLERS (/play)
# ═══════════════════════════════════════════════════════════════════════

def cmd_play(chat_id: str, svc: TelegramService):
    """Start the /play fortune cookie segment."""
    _pending_play[chat_id] = True
    msg = (
        "🥠 <b>AEGIS Fortune Cookie</b>\n\n"
        "Tell me your name ✨"
    )
    svc.send_message(chat_id, msg)


def _handle_play_name(chat_id: str, name: str, svc: TelegramService):
    """Respond to the name provided during /play game."""
    # Clear state first to ensure no loop
    if chat_id in _pending_play:
        del _pending_play[chat_id]

    fortunes_pool = [
        "Big opportunities are quietly aligning in your favor today ✨",
        "A small step today could lead to something unforgettable 🚀",
        "Good energy is following you more closely than you think 🌟",
        "Someone will notice your efforts very soon 👀",
        "Today is a great day to trust your instincts 💡",
        "A pleasant surprise may be closer than expected 🎉",
        "You are moving toward something meaningful, even if slowly 🌈",
        "Confidence will open the right door for you today 🔑",
        "The effort you put in now will return with rewards later 🔥",
        "A fresh idea could become your biggest advantage today ⚡",
        "The universe seems unusually cooperative with you today 🌙",
        "Something you were waiting for may finally begin to shift 🌊",
        "Luck is gently working in your favor today 🍀",
        "The right timing will make your next move powerful ⏳",
        "A calm mind will bring you the clearest answers today 🧠",
        "Your consistency is building something valuable behind the scenes 🛠️",
        "A bold choice today may create a beautiful outcome 🎯",
        "Your presence will leave a stronger impression than usual 😎",
        "Today carries the energy of progress and possibility 🚀",
        "A hidden opportunity may reveal itself when you least expect it 👁️",
        "Your next conversation could lead to something exciting 🤝",
        "The path ahead is opening more than it appears right now 🌤️",
        "You are closer to a breakthrough than you realize 💥",
        "A little courage today could create a big win tomorrow 🏆",
        "Something good is making its way toward you right now ✨"
    ]
    
    # Pick one random fortune
    import random
    fortune = random.choice(fortunes_pool)

    # Escape name just in case
    safe_name = _esc(name[:50]) # Limit length

    response = (
        f"Hi {safe_name}! 👋\n\n"
        f"🥠 <b>Your fortune cookie says:</b>\n\n"
        f"<i>\"{fortune}\"</i>"
    )
    svc.send_message(chat_id, response)

