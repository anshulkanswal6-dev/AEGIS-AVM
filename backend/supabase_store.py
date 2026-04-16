"""
AEGIS Supabase Store — Production Persistence
==============================================
Implements RuntimeStoreBase using Supabase (PostgreSQL + Storage).
Handles Profiles, Projects, Automations, Versions, Runs, and Logs.
"""

from __future__ import annotations

import io
import json
import uuid
import zipfile
import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from supabase import create_client, Client

from runtime_store import RuntimeStoreBase, AutomationRecord, RunLogEntry, TerminalLogEntry
from config import SUPABASE_URL, SUPABASE_KEY

class SupabaseStore(RuntimeStoreBase):
    """Production-grade store using Supabase."""

    def __init__(self):
        self.enabled = True
        if not SUPABASE_URL or not SUPABASE_KEY:
            print("[SupabaseStore] WARNING: SUPABASE_URL/KEY missing. Persistence disabled.")
            self.enabled = False
            return
        
        # Use thread-local storage for the client to prevent SSL corruption across threads
        self._local = threading.local()
        try:
            self._ensure_system_profile()
        except Exception as e:
            print(f"[SupabaseStore] Initialization error during profile check: {e}")

    @property
    def client(self) -> Client:
        """Return a thread-safe Supabase client."""
        if not hasattr(self._local, "client"):
            self._local.client = create_client(SUPABASE_URL, SUPABASE_KEY)
        return self._local.client

    def _ensure_system_profile(self):
        """Ensure the 'anonymous' system user (all zeros) exists to satisfy FK constraints."""
        system_id = "00000000-0000-0000-0000-000000000000"
        # Zero address for Algorand (32 bytes of zeros in base32 is AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA)
        ZERO_ADDR = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
        
        try:
            res = self.client.table("profiles").select("id").eq("id", system_id).execute()
            if not res.data:
                self.client.table("profiles").insert({
                    "id": system_id,
                    "wallet_address": ZERO_ADDR,
                    "username": "System"
                }).execute()
                print("[SupabaseStore] Initialized system profile.")
        except Exception as e:
            print(f"[SupabaseStore] System profile check failed: {e}")

    def _sanitize_uuid(self, val: Any) -> Optional[str]:
        """Convert any non-UUID value (empty string, 'null', etc) to None."""
        if not val or val == "" or val == "undefined" or val == "null":
            return None
        try:
            # Check if it's already a valid UUID
            uuid.UUID(str(val))
            return str(val)
        except (ValueError, TypeError):
            return None

    # --- Projects & Profiles ---

    def ensure_profile(self, wallet_address: str) -> str:
        """Ensure a user profile exists for this wallet address and link it to the correct chain family."""
        addr = wallet_address.strip()
        
        # Detect Chain Family
        # Algorand addresses are 58 chars. EVM are 42 (0x...).
        family = "algorand" if len(addr) == 58 else "evm"
        
        # 1. Check if profile exists
        result = self.client.table("profiles").select("id").eq("wallet_address", addr).execute()
        if result.data:
            user_id = result.data[0]["id"]
            # Ensure the chain family is correct if it was previously wrong/defaulted
            self.client.table("profiles").update({"primary_wallet_chain_family": family}).eq("id", user_id).execute()
            return user_id
        
        # 2. Create new profile
        new_id = str(uuid.uuid4())
        self.client.table("profiles").insert({
            "id": new_id,
            "wallet_address": addr,
            "username": f"User_{addr[:6]}",
            "primary_wallet_chain_family": family,
            "metadata": {}
        }).execute()

        # 3. Create entry in user_wallets for cross-referencing
        try:
            self.client.table("user_wallets").insert({
                "user_id": new_id,
                "wallet_address": addr,
                "chain_family": family,
                "network": "Algorand Testnet" if family == "algorand" else "Monad Testnet",
                "is_primary": True,
                "is_active": True
            }).execute()
        except Exception as e:
            print(f"[SupabaseStore] Could not link user_wallet: {e}")

        return new_id

    def update_profile_metadata(self, wallet_address: str, updates: Dict[str, Any]) -> bool:
        """Update the JSONB metadata field for a user profile."""
        profile = self.get_profile_by_wallet(wallet_address)
        if not profile:
            return False
        
        existing_meta = profile.get("metadata") or {}
        existing_meta.update(updates)
        
        self.client.table("profiles").update({
            "metadata": existing_meta
        }).eq("id", profile["id"]).execute()
        return True

    def add_global_log(self, wallet_address: str, entry: RunLogEntry) -> RunLogEntry:
        """Log a global event (deposit, error, etc) tied to a user profile rather than an automation."""
        try:
             profile_id = self.ensure_profile(wallet_address)
             
             # TAG the message for retrieval
             monitor_tag = f"[GLOBAL:{wallet_address}]"
             full_msg = f"{monitor_tag} [{entry.event.upper()}] {entry.message}"

             # We use the user's profile_id as the project_id for global activity
             self.client.table("terminal_logs").insert({
                 "project_id": profile_id,
                 "timestamp": entry.timestamp,
                 "level": entry.level,
                 "message": full_msg
             }).execute()

        except Exception as e:
             print(f"[SupabaseStore] Global log persist failed: {e}")
        return entry

    def get_global_logs(self, wallet_address: str, limit: int = 50) -> List[RunLogEntry]:
        """Retrieve recent global activity logs for a wallet."""
        try:
            profile_res = self.client.table("profiles").select("id").eq("wallet_address", wallet_address).execute()
             
            if not profile_res.data:
                return []
            
            profile_id = profile_res.data[0]["id"]
            tag = f"[GLOBAL:{wallet_address}]"

            # Query terminal_logs for this user
            result = self.client.table("terminal_logs") \
                .select("*") \
                .eq("project_id", profile_id) \
                .ilike("message", f"%{tag}%") \
                .order("timestamp", desc=True) \
                .limit(limit) \
                .execute()
            
            db_data = list(reversed(result.data))
            
            entries = []
            for d in db_data:
                raw_msg = d.get("message", "")
                msg = raw_msg.replace(tag, "").strip()
                
                event = "log"
                content = msg
                if msg.startswith("[") and "]" in msg:
                    parts = msg.split("]", 1)
                    event = parts[0][1:].lower()
                    content = parts[1].strip()
                
                entries.append(RunLogEntry(
                    id=str(d.get("id", "")),
                    automation_id="GLOBAL",
                    timestamp=d.get("timestamp", ""),
                    level=d.get("level", "info"),
                    event=event,
                    message=content,
                    details={}
                ))
            return entries
        except Exception as e:
            print(f"[SupabaseStore] get_global_logs failed: {e}")
            return []

    def get_or_create_project(self, name: str, user_id: str, wallet_address: str = "", project_id: Optional[str] = None) -> str:
        """Find existing project by ID or create a new one."""
        # Sanitization
        san_project_id = self._sanitize_uuid(project_id)
        san_user_id = self._sanitize_uuid(user_id) or "00000000-0000-0000-0000-000000000000"
        
        if san_project_id:
             # Check if exists
             res = self.client.table("projects").select("id").eq("id", san_project_id).execute()
             if res.data:
                 return res.data[0]["id"]

        # 2. Otherwise, check by name for this user
        result = self.client.table("projects") \
            .select("id") \
            .eq("user_id", san_user_id) \
            .eq("name", name) \
            .execute()
        
        if result.data:
            return result.data[0]["id"]
        
        # 3. Create fresh
        new_id = san_project_id or str(uuid.uuid4())
        self.client.table("projects").insert({
            "id": new_id,
            "user_id": san_user_id,
            "name": name,
            "status": "active"
        }).execute()
        return new_id
        return new_id

    def list_projects(self, wallet_address: str) -> List[Dict[str, Any]]:
        # This requires linking wallet to sub-query or fetching profile first
        profile_id = self.ensure_profile(wallet_address)
        result = self.client.table("projects").select("*").eq("user_id", profile_id).execute()
        return result.data

    def get_profile_by_wallet(self, wallet_address: str) -> Optional[Dict[str, Any]]:
        """Fetch profile info by wallet address."""
        result = self.client.table("profiles").select("*").eq("wallet_address", wallet_address).execute()
        if not result.data:
            return None
        return result.data[0]

    # --- Automations ---

    def save_automation(self, record: AutomationRecord) -> AutomationRecord:
        data = record.to_dict()
        spec = record.spec_json or {}
        trigger = spec.get("trigger", {})
        
        # Real production schema mapping
        db_data = {
            "id": self._sanitize_uuid(record.id) or str(uuid.uuid4()),
            "project_id": self._sanitize_uuid(record.project_id) or "00000000-0000-0000-0000-000000000000",
            "user_id": self._sanitize_uuid(record.user_id) or "00000000-0000-0000-0000-000000000000",
            "name": record.name,
            "description": record.description,
            "trigger_type": trigger.get("type", "run_every_interval") if isinstance(trigger, dict) else str(trigger),
            "trigger_config": trigger.get("params", {}) if isinstance(trigger, dict) else {},
            "action_config": {
                "actions": spec.get("actions", []),
                "notification": spec.get("notification", {})
            },
            "status": record.status,
            "is_enabled": (record.status == "active"),
            "current_version_id": record.current_version_id,
            "created_at": record.created_at,
            "updated_at": record.updated_at
        }
        
        # Filter for only those that definitely exist according to our probe
        allowed = {
            "id", "project_id", "user_id", "name", "description", 
            "trigger_type", "trigger_config", "action_config", 
            "status", "is_enabled", "current_version_id", 
            "trigger_type", "trigger_config", "action_config", 
            "status", "is_enabled", "current_version_id", 
            "last_run_at", "next_run_at", 
            "created_at", "updated_at"
        }
        final_db_data = {k: v for k, v in db_data.items() if k in allowed}

        self.client.table("automations").upsert(final_db_data).execute()
        return record

    def get_automation(self, automation_id: str) -> Optional[AutomationRecord]:
        result = self.client.table("automations").select("*").eq("id", automation_id).execute()
        if not result.data:
            return None
        record = AutomationRecord.from_dict(result.data[0])
        # Fetch latest files from storage to populate the playground/IDE
        record.files = self._fetch_files(automation_id)
        return record

    def _fetch_files(self, automation_id: str) -> Dict[str, str]:
        """Fetch and unzip the latest files for an automation."""
        try:
            res = self.client.table("automation_versions") \
                .select("code_storage_path") \
                .eq("automation_id", automation_id) \
                .order("version_number", desc=True) \
                .limit(1) \
                .execute()
            
            if not res.data:
                return {}
            
            path = res.data[0]["code_storage_path"]
            zip_data = self.client.storage.from_("automation-code").download(path)
            
            with zipfile.ZipFile(io.BytesIO(zip_data)) as z:
                return {name: z.read(name).decode("utf-8") for name in z.namelist()}
        except Exception as e:
            print(f"[SupabaseStore] Could not fetch files for {automation_id}: {e}")
            return {}

    def list_automations(self, status: Optional[str] = None, project_id: Optional[str] = None, wallet_address: Optional[str] = None) -> List[AutomationRecord]:
        query = self.client.table("automations").select("*")
        if status:
            query = query.eq("status", status)
        if project_id:
            query = query.eq("project_id", project_id)
        
        # Privacy: scope to the requesting user's profile
        if wallet_address:
            # Algorand addresses are base32 (uppercase), do NOT lowercase
            addr = wallet_address.strip()
            # Resolve wallet to profile ID
            profile_res = self.client.table("profiles").select("id").eq("wallet_address", addr).execute()
            
            if profile_res.data:
                user_id = profile_res.data[0]["id"]
                query = query.eq("user_id", user_id)
            else:
                # No profile found for this wallet — return empty (they own nothing)
                return []
        
        result = query.execute()
        records = [AutomationRecord.from_dict(d) for d in result.data]
        
        # For the dashboard/list view, we might want to lazy-load files, 
        # but for the "View in Playground" transition, the UI expects files in the search results.
        # We fetch files for the matched records.
        for r in records:
            r.files = self._fetch_files(r.id)
            
        return records

    def update_automation(self, automation_id: str, updates: Dict[str, Any]) -> Optional[AutomationRecord]:
        """Update an automation record in Supabase."""
        # Real production schema mapping for updates
        db_updates = {}
        allowed = {
            "id", "project_id", "user_id", "name", "description", 
            "trigger_type", "trigger_config", "action_config", 
            "status", "is_enabled", "current_version_id", 
            "last_run_at", "next_run_at",
            "created_at", "updated_at"
        }
        
        # Direct field mapping
        for k, v in updates.items():
            if k in allowed and k not in ["id", "created_at"]:
                if k in ["project_id", "user_id", "current_version_id"]:
                    db_updates[k] = self._sanitize_uuid(v)
                else:
                    db_updates[k] = v
        
        # Map spec_json if provided
        if "spec_json" in updates:
            spec = updates["spec_json"] or {}
            trigger = spec.get("trigger", {})
            db_updates["trigger_type"] = trigger.get("type", "run_every_interval") if isinstance(trigger, dict) else str(trigger)
            db_updates["trigger_config"] = trigger.get("params", {}) if isinstance(trigger, dict) else {}
            db_updates["action_config"] = {
                "actions": spec.get("actions", []),
                "notification": spec.get("notification", {})
            }

        if "status" in updates:
            db_updates["is_enabled"] = (updates["status"] == "active")

        if not db_updates:
            return self.get_automation(automation_id)
            
        result = self.client.table("automations").update(db_updates).eq("id", automation_id).execute()
        if not result.data:
            return None
        return AutomationRecord.from_dict(result.data[0])

    def delete_automation(self, automation_id: str) -> bool:
        """Delete an automation and all its associated data (runs, versions, deployments)."""
        try:
            # 1. Clear deployments
            self.client.table("deployments").delete().eq("automation_id", automation_id).execute()
            
            # 2. Clear runs
            self.client.table("automation_runs").delete().eq("automation_id", automation_id).execute()
            
            # 3. Clear versions
            self.client.table("automation_versions").delete().eq("automation_id", automation_id).execute()
            
            # 4. Finally delete the automation itself
            result = self.client.table("automations").delete().eq("id", automation_id).execute()
            return len(result.data) > 0
        except Exception as e:
            print(f"[SupabaseStore] Deletion error for {automation_id}: {e}")
            return False

    def delete_project(self, project_id: str) -> bool:
        """Delete a project and its associated terminal logs."""
        try:
            # Clear terminal logs first
            self.client.table("terminal_logs").delete().eq("project_id", project_id).execute()
            
            # Delete any remaining orphan automations
            autos = self.client.table("automations").select("id").eq("project_id", project_id).execute()
            for a in autos.data:
                self.delete_automation(a["id"])

            # Delete the project
            result = self.client.table("projects").delete().eq("id", project_id).execute()
            return len(result.data) > 0
        except Exception as e:
            print(f"[SupabaseStore] Project deletion error for {project_id}: {e}")
            return False

    # --- Versions & Storage ---

    def create_version(self, automation_id: str, files: Dict[str, str], version_num: Optional[int] = None) -> str:
        """Create a new version, zip files, and upload to storage."""
        if not version_num:
            # Atomic increment is hard with PostgREST, so we fetch max
            res = self.client.table("automation_versions").select("version_number").eq("automation_id", automation_id).order("version_number", desc=True).limit(1).execute()
            version_num = (res.data[0]["version_number"] + 1) if res.data else 1

        version_id = str(uuid.uuid4())
        storage_path = f"{automation_id}/v{version_num}_{version_id}.zip"
        
        # Create Zip
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
            for filename, content in files.items():
                zip_file.writestr(filename, content)
        
        zip_buffer.seek(0)
        
        # Upload to Storage
        self.client.storage.from_("automation-code").upload(
            path=storage_path,
            file=zip_buffer.getvalue(),
            file_options={"content-type": "application/zip"}
        )

        # Create version row
        self.client.table("automation_versions").insert({
            "id": version_id,
            "automation_id": automation_id,
            "version_number": version_num,
            "code_storage_path": storage_path,
            "entrypoint": "main.py" # default
        }).execute()
        
        return version_id

    # --- Runs ---

    def create_run(self, automation_id: str, version_id: Optional[str], trigger_payload: Dict[str, Any]) -> str:
        run_id = str(uuid.uuid4())
        self.client.table("automation_runs").insert({
            "id": run_id,
            "automation_id": automation_id,
            "version_id": version_id,
            "status": "running",
            "trigger_payload": trigger_payload,
            "started_at": datetime.now(timezone.utc).isoformat()
        }).execute()
        return run_id

    def update_run(self, run_id: str, updates: Dict[str, Any]) -> bool:
        if "status" in updates and updates["status"] in ["success", "failed"]:
            updates["ended_at"] = datetime.now(timezone.utc).isoformat()
        
        result = self.client.table("automation_runs").update(updates).eq("id", run_id).execute()
        return len(result.data) > 0

    # --- Logs ---

    def add_log(self, entry: RunLogEntry) -> RunLogEntry:
        try:
             # Resolve for project context
             auto = self.get_automation(entry.automation_id)
             project_id = auto.project_id if auto else None
             
             # TAG the message for retrieval
             monitor_tag = f"[AUTO:{entry.automation_id}]"
             # CLEAN LOGS: Removed the ' | details' suffix to keep the UI clean
             full_msg = f"{monitor_tag} [{entry.event.upper()}] {entry.message}"

             # We MUST use a REAL project_id because of the DB foreign key constraint.
             # If we don't have one, we use a fallback if possible, but usually we have it.
             target_project_id = project_id or entry.automation_id
             
             # Save ONE copy to terminal_logs. Both panels will poll this table.
             # The Monitor will filter by the monitor_tag.
             self.client.table("terminal_logs").insert({
                 "project_id": target_project_id,
                 "timestamp": entry.timestamp,
                 "level": entry.level,
                 "message": full_msg
             }).execute()

        except Exception as e:
             # If FK still fails, we have a bigger identity issue.
             print(f"[SupabaseStore] Log persist failed: {e}")
        return entry

    def get_logs(self, automation_id: str, limit: int = 50) -> List[RunLogEntry]:
        try:
            tag = f"[AUTO:{automation_id}]"
            # Query terminal_logs where the message contains our automation tag
            result = self.client.table("terminal_logs") \
                .select("*") \
                .ilike("message", f"%{tag}%") \
                .order("timestamp", desc=True) \
                .limit(limit) \
                .execute()
            
            db_data = list(reversed(result.data))
            
            entries = []
            for d in db_data:
                raw_msg = d.get("message", "")
                # Strip the internal tag before returning to UI
                msg = raw_msg.replace(tag, "").strip()
                
                event = "log"
                content = msg
                if msg.startswith("[") and "]" in msg:
                    parts = msg.split("]", 1)
                    event = parts[0][1:].lower()
                    content = parts[1].strip()
                
                entries.append(RunLogEntry(
                    id=str(d.get("id", "")),
                    automation_id=automation_id,
                    timestamp=d.get("timestamp", ""),
                    level=d.get("level", "info"),
                    event=event,
                    message=content,
                    details={} # Details not serialized in terminal_logs
                ))
            return entries
        except Exception as e:
            print(f"[SupabaseStore] get_logs failed: {e}")
            return []

    def clear_logs(self, automation_id: str) -> int:
        # Since we use tags in terminal_logs, we'd need to update those rows
        # For now, we clear via terminal if needed.
        return 0

    # --- Terminal Logs ---

    def add_terminal_log(self, entry: TerminalLogEntry) -> TerminalLogEntry:
        # Note: entry.project_id might be a session_id string. 
        # In Supabase mode, we should ideally resolve this to a UUID project_id.
        self.client.table("terminal_logs").insert(entry.to_dict()).execute()
        return entry

    def get_terminal_logs(self, project_id: str, limit: int = 100) -> List[TerminalLogEntry]:
        result = self.client.table("terminal_logs") \
            .select("*") \
            .eq("project_id", project_id) \
            .is_("cleared_at", "null") \
            .order("timestamp", desc=True) \
            .limit(limit) \
            .execute()
        return [TerminalLogEntry.from_dict(d) for d in result.data]

    def clear_terminal_logs(self, project_id: str) -> int:
        now = datetime.now(timezone.utc).isoformat()
        result = self.client.table("terminal_logs") \
            .update({"cleared_at": now}) \
            .eq("project_id", project_id) \
            .is_("cleared_at", "null") \
            .execute()
        return len(result.data)

    # --- Heartbeat ---

    def update_heartbeat(self, automation_id: str):
        now = datetime.now(timezone.utc).isoformat()
        try:
            # Check if exists first since table might lack unique constraint for upsert
            existing = self.client.table("deployments").select("id").eq("automation_id", automation_id).execute()
            
            if existing.data:
                self.client.table("deployments").update({
                    "last_heartbeat_at": now,
                    "deployment_status": "active"
                }).eq("automation_id", automation_id).execute()
            else:
                self.client.table("deployments").insert({
                    "automation_id": automation_id,
                    "last_heartbeat_at": now,
                    "deployment_status": "active"
                }).execute()
        except Exception as e:
            print(f"[SupabaseStore] Heartbeat update skipped or failed: {e}")
