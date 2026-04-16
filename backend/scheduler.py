"""
AEGIS Scheduler
===============
APScheduler-based scheduler for time-based automation jobs.
Each scheduled automation gets a repeating job that calls
runtime_service.evaluate_automation().
"""

from __future__ import annotations

import threading
from typing import Dict, Optional

try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.interval import IntervalTrigger
    HAS_APSCHEDULER = True
except ImportError:
    HAS_APSCHEDULER = False
    print("[AEGIS Scheduler] WARNING: apscheduler not installed. Using fallback polling only.")

from config import DEFAULT_SCHEDULE_INTERVAL_SECONDS


class Scheduler:
    """Manages APScheduler jobs for deployed automations."""

    def __init__(self):
        self._lock = threading.Lock()
        self._jobs: Dict[str, str] = {}  # automation_id -> job_id
        self._scheduler: Optional[object] = None
        self._running = False

    @property
    def running(self) -> bool:
        """Public accessor for scheduler running state."""
        return self._running

    def start(self):
        """Start the scheduler."""
        if not HAS_APSCHEDULER:
            print("[AEGIS Scheduler] APScheduler not available, skipping scheduler start.")
            return

        with self._lock:
            if self._running:
                return
            self._scheduler = BackgroundScheduler(daemon=True)
            self._scheduler.start()
            self._running = True
            print("[AEGIS Scheduler] Started.")

    def shutdown(self):
        """Shutdown the scheduler gracefully."""
        with self._lock:
            if self._scheduler and self._running:
                self._scheduler.shutdown(wait=False)
                self._running = False
                self._jobs.clear()
                print("[AEGIS Scheduler] Shut down.")

    def schedule_automation(self, automation_id: str, interval_seconds: int = DEFAULT_SCHEDULE_INTERVAL_SECONDS):
        """Add a repeating job for an automation."""
        if not HAS_APSCHEDULER or not self._running:
            return

        with self._lock:
            # Remove existing job if any
            if automation_id in self._jobs:
                self._unschedule_internal(automation_id)

            job = self._scheduler.add_job(
                self._run_automation,
                trigger=IntervalTrigger(seconds=max(interval_seconds, 5)),  # min 5s safety
                args=[automation_id],
                id=f"aegis_{automation_id}",
                name=f"AEGIS Automation {automation_id[:8]}",
                replace_existing=True,
                max_instances=1,  # don't overlap
            )
            self._jobs[automation_id] = job.id
            print(f"[AEGIS Scheduler] Scheduled automation {automation_id[:8]} every {interval_seconds}s")

    def unschedule_automation(self, automation_id: str):
        """Remove the job for an automation."""
        with self._lock:
            self._unschedule_internal(automation_id)

    def _unschedule_internal(self, automation_id: str):
        """Internal unschedule (must hold lock)."""
        job_id = self._jobs.pop(automation_id, None)
        if job_id and self._scheduler:
            try:
                self._scheduler.remove_job(job_id)
                print(f"[AEGIS Scheduler] Unscheduled automation {automation_id[:8]}")
            except Exception:
                pass  # Job may already be removed

    def is_scheduled(self, automation_id: str) -> bool:
        """Check if an automation is currently scheduled."""
        with self._lock:
            return automation_id in self._jobs

    @staticmethod
    def _run_automation(automation_id: str):
        """Job callback — evaluates the automation."""
        # Import here to avoid circular imports
        import runtime_service
        try:
            runtime_service.evaluate_automation(automation_id)
        except Exception as e:
            print(f"[AEGIS Scheduler] Error evaluating {automation_id[:8]}: {e}")


# =========================================================
# Module-level singleton
# =========================================================

_scheduler_instance: Optional[Scheduler] = None
_scheduler_lock = threading.Lock()


def get_scheduler() -> Scheduler:
    """Return the global scheduler singleton."""
    global _scheduler_instance
    if _scheduler_instance is None:
        with _scheduler_lock:
            if _scheduler_instance is None:
                _scheduler_instance = Scheduler()
    return _scheduler_instance
