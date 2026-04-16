"""
AEGIS Log Service
=================
Structured logging into the runtime store.
Thin wrapper around RunLogEntry creation + store.add_log().
"""

from __future__ import annotations

import traceback
from typing import Any, Dict, List, Optional

from runtime_store import RunLogEntry, TerminalLogEntry, get_store


def _write(automation_id: str, level: str, event: str, message: str, details: Optional[Dict[str, Any]] = None) -> RunLogEntry:
    """Internal helper — creates and persists a log entry."""
    entry = RunLogEntry(
        automation_id=automation_id,
        level=level,
        event=event,
        message=message,
        details=details,
    )
    store = get_store()
    store.add_log(entry)
    # Also print to console for demo visibility
    safe_msg = message.encode('ascii', 'replace').decode('ascii')
    print(f"[AEGIS {level.upper()}] [{automation_id[:8]}] {event}: {safe_msg}")
    return entry


def log_info(automation_id: str, event: str, message: str, details: Optional[Dict[str, Any]] = None) -> RunLogEntry:
    return _write(automation_id, "info", event, message, details)


def log_warn(automation_id: str, event: str, message: str, details: Optional[Dict[str, Any]] = None) -> RunLogEntry:
    return _write(automation_id, "warn", event, message, details)


def log_error(automation_id: str, event: str, message: str, details: Optional[Dict[str, Any]] = None) -> RunLogEntry:
    return _write(automation_id, "error", event, message, details)


def log_debug(automation_id: str, event: str, message: str, details: Optional[Dict[str, Any]] = None) -> RunLogEntry:
    return _write(automation_id, "debug", event, message, details)


def log_exception(automation_id: str, event: str, exc: Exception) -> RunLogEntry:
    """Log an exception with full traceback in details."""
    )


def log_user_activity(wallet_address: str, event: str, message: str, level: str = "info", details: Optional[Dict[str, Any]] = None) -> RunLogEntry:
    """Log a global user activity (deposit, withdrawal, creation, etc)."""
    entry = RunLogEntry(
        automation_id="GLOBAL",
        level=level,
        event=event,
        message=message,
        details=details,
    )
    store = get_store()
    store.add_global_log(wallet_address, entry)
    
    # Console visibility
    safe_msg = message.encode('ascii', 'replace').decode('ascii')
    print(f"[AEGIS USER] [{wallet_address[:6]}] {event.upper()}: {safe_msg}")
    return entry


def get_logs(automation_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieve recent logs for an automation."""
    store = get_store()
    entries = store.get_logs(automation_id, limit=limit)
    return [e.to_dict() for e in entries]


def clear_logs(automation_id: str) -> int:
    """Clear all logs for an automation. Returns count deleted."""
    store = get_store()
    return store.clear_logs(automation_id)


# --- Terminal Logs ---

def log_terminal(project_id: str, message: str, level: str = "info") -> TerminalLogEntry:
    """Log terminal output for a session/project."""
    entry = TerminalLogEntry(
        project_id=project_id,
        level=level,
        message=message
    )
    try:
        store = get_store()
        store.add_terminal_log(entry)
    except Exception as e:
        # If DB persists error (e.g. FK violation), we just log to stdout
        print(f"[AEGIS TERMINAL LOG ERROR] Could not persist log to store: {e}")
    
    # Also print to console for internal visibility
    safe_message = message.encode('ascii', 'replace').decode('ascii')
    print(f"[TERMINAL] [{project_id[:8]}] {safe_message}")
    return entry


def get_terminal_logs(project_id: str, limit: int = 100) -> List[Dict[str, Any]]:
    """Retrieve recent terminal logs."""
    store = get_store()
    entries = store.get_terminal_logs(project_id, limit=limit)
    return [e.to_dict() for e in entries]


def clear_terminal_logs(project_id: str) -> int:
    """Soft-clear terminal logs."""
    store = get_store()
    return store.clear_terminal_logs(project_id)
