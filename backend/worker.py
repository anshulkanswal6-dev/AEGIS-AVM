"""
AEGIS Worker
============
Long-running process that:
- On start: loads all active automations from store and schedules them
- Runs a background polling loop for monitoring-type triggers
- Provides start() / stop() lifecycle methods
- Can run as a background thread (via FastAPI startup) or standalone
"""

from __future__ import annotations

import threading
import time
from typing import Optional

from config import POLLING_INTERVAL_SECONDS
from scheduler import get_scheduler
from runtime_store import get_store
import runtime_service


class Worker:
    """Background worker that drives all deployed automations."""

    def __init__(self):
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._running = False

    def start(self):
        """Start the worker in a daemon thread."""
        if self._running:
            print("[AEGIS Worker] Already running.")
            return

        self._stop_event.clear()
        self._running = True

        # Start the APScheduler
        sched = get_scheduler()
        sched.start()

        # Load and schedule all active automations
        self._load_active_automations()

        # Start polling thread for non-scheduled checks
        self._thread = threading.Thread(target=self._poll_loop, daemon=True, name="aegis-worker")
        self._thread.start()
        print(f"[AEGIS Worker] Started. Polling every {POLLING_INTERVAL_SECONDS}s.")

    def stop(self):
        """Stop the worker gracefully."""
        if not self._running:
            return

        self._stop_event.set()
        self._running = False

        sched = get_scheduler()
        sched.shutdown()

        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5)

        print("[AEGIS Worker] Stopped.")

    @property
    def is_running(self) -> bool:
        return self._running

    def schedule_new_automation(self, automation_id: str, interval_seconds: int):
        """Schedule a newly deployed automation."""
        sched = get_scheduler()
        sched.schedule_automation(automation_id, interval_seconds)

    def unschedule_automation(self, automation_id: str):
        """Remove an automation from the scheduler (e.g., on pause/delete)."""
        sched = get_scheduler()
        sched.unschedule_automation(automation_id)

    def _load_active_automations(self):
        """Load all active automations and schedule them."""
        try:
            active = runtime_service.get_active_automations()
            sched = get_scheduler()
            for record in active:
                interval = runtime_service.parse_interval_to_seconds(
                    self._extract_interval(record.spec_json)
                )
                sched.schedule_automation(record.id, interval)
            print(f"[AEGIS Worker] Loaded {len(active)} active automation(s).")
        except Exception as e:
            print(f"[AEGIS Worker] Error loading automations: {e}")

    def _poll_loop(self):
        """
        Background polling loop.
        This handles automations whose triggers aren't purely time-based
        (e.g., price monitors, balance checks) and serves as a fallback
        when APScheduler isn't available.
        """
        while not self._stop_event.is_set():
            try:
                # Check for any newly active automations not yet scheduled
                sched = get_scheduler()
                active = runtime_service.get_active_automations()
                for record in active:
                    if not sched.is_scheduled(record.id):
                        interval = runtime_service.parse_interval_to_seconds(
                            self._extract_interval(record.spec_json)
                        )
                        sched.schedule_automation(record.id, interval)
            except Exception as e:
                # NEW: Handle network transience gracefully
                if "getaddrinfo failed" in str(e) or "Connection" in str(e):
                    print(f"[AEGIS Worker] Network/DNS error: {e}. Retrying in 30s...")
                    # Sleep an extra long time on network error
                    time.sleep(25)
                else:
                    print(f"[AEGIS Worker] Poll loop error: {e}")

            # Sleep in small increments so stop is responsive
            for _ in range(POLLING_INTERVAL_SECONDS * 2):
                if self._stop_event.is_set():
                    break
                time.sleep(0.5)

    @staticmethod
    def _extract_interval(spec_json: dict) -> str:
        """Extract interval string from spec_json for scheduling."""
        # Check runtime.interval_seconds
        runtime = spec_json.get("runtime", {})
        if isinstance(runtime, dict) and "interval_seconds" in runtime:
            return f"{runtime['interval_seconds']}s"

        # Check trigger params
        trigger = spec_json.get("trigger", {})
        if isinstance(trigger, dict):
            trigger_params = trigger.get("params", {})
            if "interval" in trigger_params:
                return str(trigger_params["interval"])

        # Top-level params
        params = spec_json.get("params", {})
        if "interval" in params:
            return str(params["interval"])

        return "60s"  # default


# =========================================================
# Module-level singleton
# =========================================================

_worker_instance: Optional[Worker] = None
_worker_lock = threading.Lock()


def get_worker() -> Worker:
    """Return the global worker singleton."""
    global _worker_instance
    if _worker_instance is None:
        with _worker_lock:
            if _worker_instance is None:
                _worker_instance = Worker()
    return _worker_instance
