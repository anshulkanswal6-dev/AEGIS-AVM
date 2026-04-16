import json
import os
import re
import uuid
import time
import traceback
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from dotenv import load_dotenv
import config
import log_service

# Load env from current directory
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

# Verify API key
api_val = os.getenv("GEMINI_API_KEY")
if not api_val:
    print("WARNING: GEMINI_API_KEY not found in environment!")
else:
    print(f"DEBUG: GEMINI_API_KEY found: {api_val[:10]}...")

# =========================================================
# Persistent session tracking
# =========================================================
class SessionManager(dict):
    """A dictionary that persists itself to a JSON file."""
    def __init__(self, filename="sessions.json"):
        super().__init__()
        self.filename = Path(__file__).parent / filename
        self._load()

    def _load(self):
        if self.filename.exists():
            try:
                with open(self.filename, "r") as f:
                    data = json.load(f)
                    self.update(data)
                print(f"[AEGIS SessionManager] Loaded {len(data)} sessions from {self.filename}")
            except Exception as e:
                print(f"[AEGIS SessionManager] Failed to load sessions: {e}")

    def _save(self):
        try:
            with open(self.filename, "w") as f:
                json.dump(self.copy(), f, indent=2)
        except Exception as e:
            print(f"[AEGIS SessionManager] Failed to save sessions: {e}")

    def __setitem__(self, key, value):
        super().__setitem__(key, value)
        self._save()

    def update(self, *args, **kwargs):
        super().update(*args, **kwargs)
        self._save()

_sessions = SessionManager()


def get_session_state(session_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve a session's state from the global session manager."""
    return _sessions.get(session_id)


class GenAIAgent:
    def __init__(self, catalogue_path: str, action_catalogue_path: str):
        self.catalogue_path = Path(catalogue_path)
        self.action_catalogue_path = Path(action_catalogue_path)

        with open(self.catalogue_path, "r") as f:
            self.catalogue = json.load(f)

        with open(self.action_catalogue_path, "r") as f:
            self.action_catalogue = json.load(f)

        self.triggers: List[Dict[str, Any]] = self.catalogue.get("triggers", [])
        self.actions: List[Dict[str, Any]] = self.action_catalogue.get("actions", [])
        self.field_definitions: Dict[str, Any] = {
            **self.catalogue.get("field_definitions", {}),
            **self.action_catalogue.get("field_definitions", {}),
        }

        self.models: Dict[str, Dict[str, str]] = {
            "gemini_flash": {"provider": "gemini", "model_name": "models/gemini-flash-latest", "api_key_env": "GEMINI_API_KEY", "label": "Gemini Flash (Latest)"},
            "gemini_pro": {"provider": "gemini", "model_name": "models/gemini-pro-latest", "api_key_env": "GEMINI_API_KEY", "label": "Gemini Pro (Latest)"},
            "gemini_2_flash": {"provider": "gemini", "model_name": "models/gemini-2.0-flash", "api_key_env": "GEMINI_API_KEY", "label": "Gemini 2.0 Flash"},
            "gemini_3_flash": {"provider": "gemini", "model_name": "models/gemini-3-flash-preview", "api_key_env": "GEMINI_API_KEY", "label": "Gemini 3 Flash (Preview)"},
            "claude_sonnet": {"provider": "claude", "model_name": "claude-3-5-sonnet-latest", "api_key_env": "ANTHROPIC_API_KEY", "label": "Claude 3.5 Sonnet"},
        }

        self.mock_mode = os.getenv("MOCK_AGENT", "false").lower() == "true"



        # Build the system prompt with catalogue knowledge baked in
        self._system_prompt = self._build_system_prompt()

    # ==========================================================
    # SYSTEM PROMPT BUILDER
    # ==========================================================
    def _build_system_prompt(self) -> str:
        """Build a rich system prompt that includes all triggers and actions from catalogues."""
        import config
        project_context = f"PLATFORM_CONTEXT: The current platform default chain is '{config.CHAIN_NAME}' (Currency: {config.CURRENCY_SYMBOL})."

        # Build trigger descriptions
        trigger_list = []
        for t in self.triggers:
            fields_str = ", ".join(t.get("required_fields", []))
            trigger_list.append(f'  - type: "{t["type"]}" | category: {t.get("category", "n/a")} | description: {t["description"]} | required_fields: [{fields_str}]')
        triggers_text = "\n".join(trigger_list)

        # Build action descriptions
        action_list = []
        for a in self.actions:
            fields_str = ", ".join(a.get("required_fields", []))
            action_list.append(f'  - type: "{a["type"]}" | category: {a.get("category", "n/a")} | description: {a["description"]} | required_fields: [{fields_str}]')
        actions_text = "\n".join(action_list)

        # Build field definitions
        field_list = []
        for fname, fdef in self.field_definitions.items():
            field_list.append(f'  - "{fname}": type={fdef.get("type", "string")}')
        fields_text = "\n".join(field_list)

        return f"""You are AEGIS, a friendly and highly intelligent Algorand (AVM) automation assistant. You have a warm, conversational personality — like chatting with a knowledgeable friend who's genuinely excited about the Algorand ecosystem.

## YOUR PERSONALITY
- Be warm, natural, and friendly — NOT robotic or corporate
- Use casual language, occasional emojis, and show personality
- Keep responses concise (2-4 sentences for casual chat, more for automation details)
- Support Algorand-native concepts: MicroAlgos, ASAs (Assets), and Application IDs

## YOUR CORE PURPOSE
You help users build Algorand AVM automations. You understand the following TRIGGERS and ACTIONS:

### AVAILABLE TRIGGERS (what starts an automation):
{triggers_text}

### AVAILABLE ACTIONS (what happens when triggered):
{actions_text}

### FIELD DEFINITIONS:
{fields_text}

## ALGORAND WALLET MODEL (CRITICAL)
- Whenever a user refers to "my wallet" or "send from my wallet", it refers to their **Algorand Agent Account** (managed by the platform).
- **NEVER ASK FOR PRIVATE KEYS, MNEMONICS, OR SEED PHRASES.**
- All addresses MUST be 58-character Algorand addresses (e.g. AB12...ZY90).
- All transfers use **ALGO** (converted to microAlgos, 1 microAlgo = 0.000001 ALGO).
- For ASA (Asset) transfers, you must use the numerical **Asset ID**.

## IMPORTANT: NOTIFICATIONS
**DO NOT use legacy actions like `send_email_notification` or `send_telegram_message`. They are deprecated.**
For EVERY automation, you MUST process notifications through the dedicated `notification` field in the final spec.

### Notification Delivery:
1. **Choose Channel**: [Email, Telegram, Both].
2. **Collect Details**:
    - Telegram: `telegram_message` (alert content).
    - Email: `to` (recipient email) and `email_body`.
    - **Cooldown**: Default to 300 seconds using `notification_cooldown`.
3. **Structured Format**: Always place notification settings in the `notification` object, NOT the actions array.

## DYNAMIC MESSAGES & PLACEHOLDERS
Use placeholders like `{{amount}}` (e.g., received 5 ALGO!) or `{{new_balance}}` in notifications.

## HOW TO RESPOND
You must ALWAYS respond with a valid JSON object. No extra text.

### CASE 1: Casual chat
Return: {{ "intent": "chat", "message": "..." }}

### CASE 2: Automation intent
Identify trigger/actions, extract fields, and determine missing Algorand-specific fields (like Asset IDs or recipient addresses).
Return: {{ "intent": "automation", "message": "...", "trigger": {{ "type": "..." }}, "actions": [...], "extracted_fields": {{ ... }}, "missing_fields": [...], "structured_questions": [...] }}

### PROJECT CONTEXT
{project_context}

## STRICT AVM RULES:
1. **ONLY ALGORAND**: Never generate EVM code, Ethereum addresses (0x), or mention Solidity.
2. **UNIT PRECISION**: Always clarify if amounts are in ALGO or MicroAlgos.
3. **ASA OPT-IN**: Remind users that recipient accounts must be opted-in to ASAs if sending non-native assets.
4. **ZERO-SECRET POLICY**: Never ask for mnemonics or secret keys."""

    def list_available_models(self) -> List[Dict[str, Union[str, bool]]]:
        return [{"id": mid, "label": str(cfg["label"]), "active": bool(os.getenv(str(cfg["api_key_env"])))} for mid, cfg in self.models.items()]

    # ==========================================================
    # MAIN CHAT ENTRY POINT
    # ==========================================================
    def chat(self, user_message: str, session_id: Optional[str] = None, wallet_address: Optional[str] = None, 
             known_fields: Optional[Dict[str, Any]] = None, planning_model_id: str = "gemini_flash", 
             codegen_model_id: str = "gemini_flash", project_name: Optional[str] = None) -> Dict[str, Any]:
        if not session_id:
            session_id = str(uuid.uuid4())
        if session_id not in _sessions:
            _sessions[session_id] = {
                "id": session_id, "stage": "idle",
                "wallet_address": wallet_address,
                "project_name": project_name, # Preserved project name
                "known_fields": known_fields or {},
                "history": [], "selected_trigger": None,
                "selected_actions": [], "plan_md": "", "files": {},
                "codegen_model_id": codegen_model_id,
            }

        session = _sessions[session_id]
        if wallet_address:
            session["wallet_address"] = wallet_address
            # Sync with Supabase so terminal logs can be persisted
            try:
                from runtime_store import get_store
                store = get_store()
                u_id = store.ensure_profile(wallet_address)
                p_name = session.get("project_name") or f"Chat {session_id[:8]}"
                store.get_or_create_project(name=p_name, user_id=u_id, wallet_address=wallet_address, project_id=session_id)
            except Exception as e:
                print(f"[AEGIS DB Sync Error] {e}")

        session["history"].append({"role": "user", "content": user_message})
        _sessions._save() # Explicit Save
        session["codegen_model_id"] = codegen_model_id
        if known_fields:
            session["known_fields"].update(known_fields)
        if project_name:
            session["project_name"] = project_name

        # Send everything to Gemini
        try:
            project_ctx = f"CURRENT PROJECT NAME: {session.get('project_name')}\n" if session.get('project_name') else ""
            ai_response = self._ask_gemini(session["history"], planning_model_id, project_ctx)
        except Exception as e:
            print(f"[AEGIS AI Error] {str(e)}")
            traceback.print_exc()
            # Fallback response if AI fails
            return self._response(session_id, "idle", "chat", "greeting",
                "Hey! I'm having a moment connecting to my brain. Could you try again in a sec? 🧠")

        intent = ai_response.get("intent", "chat")
        agent_message = ai_response.get("message", "I'm here to help! What would you like to automate?")

        # --- CASE 1: Casual chat ---
        if intent == "chat":
            session["history"].append({"role": "assistant", "content": agent_message})
            _sessions._save() # Explicit Save
            return self._response(session_id, "idle", "chat", "greeting", agent_message)

        # --- CASE 2: Automation intent ---
        if intent == "automation":
            trigger_data = ai_response.get("trigger", {})
            actions_data = ai_response.get("actions", [])
            extracted_fields = ai_response.get("extracted_fields", {})
            missing_fields = ai_response.get("missing_fields", [])
            structured_questions = ai_response.get("structured_questions", [])

            # Merge extracted fields
            session["known_fields"].update(extracted_fields)
            session["selected_trigger"] = trigger_data
            session["selected_actions"] = actions_data

            # DECISION: To Plan or to Ask?
            # We only skip questions if the missing fields are "minor" technical ones.
            # Notification channels and wallet address are CRITICAL and user expects to be asked.
            critical_missing = [f for f in missing_fields if f in ["notification_channels", "wallet_address", "telegram_message", "to"]]
            
            user_input = user_message.lower()
            wants_fast_track = any(w in user_input for w in ["fast track", "skip questions", "just build it"])
            
            # If there are critical missing fields AND user didn't explicitly say "fast track", ask questions
            if critical_missing and structured_questions and not wants_fast_track:
                session["stage"] = "needs_input"
                session["history"].append({"role": "assistant", "content": agent_message})
                
                # Ensure project exists before logging (fixes FK error)
                if wallet_address:
                    try:
                        from runtime_store import get_store
                        store = get_store()
                        u_id = store.ensure_profile(wallet_address)
                        store.get_or_create_project(name=f"Chat {session_id[:8]}", user_id=u_id, wallet_address=wallet_address, project_id=session_id)
                    except Exception: pass

                log_service.log_terminal(session_id, f"❓ Critical fields missing: {', '.join(critical_missing)}. Asking user.")
                _sessions._save()
                return {
                    "session_id": session_id,
                    "stage": "needs_input",
                    "status": "waiting_for_input",
                    "agent_status": "asking",
                    "agent_message": agent_message,
                    "structured_questions": structured_questions,
                    "files": {}
                }
            
            # If we are here, we are either missing nothing, or it's non-critical/fast-track.
            log_service.log_terminal(session_id, "📝 Proceeding to planning...")

            # All fields present → generate plan
            session["stage"] = "awaiting_approval"
            log_service.log_terminal(session_id, "📝 All fields collected. Generating plan.md...")
            plan_md = self._generate_plan_md(trigger_data, actions_data, session["known_fields"])
            session["plan_md"] = plan_md
            session["history"].append({"role": "assistant", "content": agent_message})
            _sessions._save() # Explicit Save
            return {
                "session_id": session_id,
                "stage": "awaiting_approval",
                "status": "chat",
                "agent_status": "planning",
                "agent_message": agent_message,
                "plan_md": plan_md,
                "files": {"plan.md": plan_md}
            }

        # --- CASE 3: Field update ---
        if intent == "field_update":
            new_fields = ai_response.get("extracted_fields", {})
            still_missing = ai_response.get("still_missing", [])
            structured_questions = ai_response.get("structured_questions", [])

            session["known_fields"].update(new_fields)
            session["history"].append({"role": "assistant", "content": agent_message})

            if still_missing and structured_questions:
                session["stage"] = "needs_input"
                log_service.log_terminal(session_id, f"❓ Still missing fields: {', '.join(still_missing)}. Asking user for input.")
                return {
                    "session_id": session_id,
                    "stage": "needs_input",
                    "status": "waiting_for_input",
                    "agent_status": "asking",
                    "agent_message": agent_message,
                    "structured_questions": structured_questions,
                    "files": {}
                }

            # All fields present → generate plan
            session["stage"] = "awaiting_approval"
            log_service.log_terminal(session_id, "📝 All fields collected. Generating plan.md...")
            plan_md = self._generate_plan_md(
                session.get("selected_trigger", {}),
                session.get("selected_actions", []),
                session["known_fields"]
            )
            session["plan_md"] = plan_md
            return {
                "session_id": session_id,
                "stage": "awaiting_approval",
                "status": "chat",
                "agent_status": "planning",
                "agent_message": agent_message,
                "plan_md": plan_md,
                "files": {"plan.md": plan_md}
            }

        # Default fallback — treat as chat
        session["history"].append({"role": "assistant", "content": agent_message})
        _sessions._save()
        return self._response(session_id, "idle", "chat", "greeting", agent_message)

    # ==========================================================
    # CONTINUE CHAT (follow-up field submissions)
    # ==========================================================
    def continue_chat(self, session_id: str, fields: Dict[str, Any], wallet_address: Optional[str] = None, 
                      planning_model_id: str = "gemini_flash", project_name: Optional[str] = None) -> Dict[str, Any]:
        if session_id not in _sessions:
            # Session lost after restart - gracefully transition back to a new chat
            log_service.log_terminal(session_id, "⚠️ Session not found. Restarting chat with provided context.")
            return self.chat("I'm back! Let's resume where we left off.", session_id, wallet_address=wallet_address, known_fields=fields, planning_model_id=planning_model_id, project_name=project_name)

        session = _sessions[session_id]
        if project_name:
            session["project_name"] = project_name
        if wallet_address:
            session["wallet_address"] = wallet_address
            # Sync with Supabase
            try:
                from runtime_store import get_store
                store = get_store()
                u_id = store.ensure_profile(wallet_address)
                p_name = session.get("project_name") or f"Chat {session_id[:8]}"
                store.get_or_create_project(name=p_name, user_id=u_id, wallet_address=wallet_address, project_id=session_id)
            except Exception as e:
                print(f"[AEGIS DB Sync Error] {e}")

        session["known_fields"].update(fields)

        # Build a natural message from the submitted fields
        fields_text = ", ".join([f"{k}: {v}" for k, v in fields.items()])
        user_msg = f"Here are the values: {fields_text}"
        session["history"].append({"role": "user", "content": user_msg})
        _sessions._save() # Explicit Save

        log_service.log_terminal(session_id, f"Received follow-up fields: {fields_text}")

        # Let Gemini decide if more fields are needed
        try:
            project_ctx = f"CURRENT PROJECT NAME: {session.get('project_name')}\n" if session.get('project_name') else ""
            ai_response = self._ask_gemini(session["history"], planning_model_id, project_ctx)
        except Exception as e:
            print(f"[AEGIS Continue Error] {str(e)}")
            # Try to proceed with what we have
            log_service.log_terminal(session_id, "⚠️ AI error during field update. Attempting to finalize plan with available data.")
            return self._try_finalize_plan(session_id, session)

        intent = ai_response.get("intent", "field_update")
        agent_message = ai_response.get("message", "Got it! Let me process that.")

        new_fields = ai_response.get("extracted_fields", {})
        still_missing = ai_response.get("still_missing", ai_response.get("missing_fields", []))
        structured_questions = ai_response.get("structured_questions", [])

        session["known_fields"].update(new_fields)
        session["history"].append({"role": "assistant", "content": agent_message})
        _sessions._save() # Explicit Save

        if still_missing and structured_questions:
            session["stage"] = "needs_input"
            log_service.log_terminal(session_id, f"❓ Still missing fields: {', '.join(still_missing)}. Asking user for input.")
            _sessions._save()
            return {
                "session_id": session_id,
                "stage": "needs_input",
                "status": "waiting_for_input",
                "agent_status": "asking",
                "agent_message": agent_message,
                "structured_questions": structured_questions,
                "files": {}
            }

        # All fields → generate plan
        log_service.log_terminal(session_id, "📝 All fields collected. Generating plan.md...")
        return self._try_finalize_plan(session_id, session, agent_message)

    # ==========================================================
    # APPROVE / REJECT PLAN → Gemini generates code
    # ==========================================================
    def approve_plan(self, session_id: str, approved: bool, feedback: Optional[str] = None) -> Dict[str, Any]:
        session = _sessions[session_id]
        if not approved:
            session["stage"] = "idle"
            log_service.log_terminal(session_id, "❌ Plan rejected by user. Resetting session.")
            return self._response(session_id, "idle", "chat", "reset",
                "No worries! I've scrapped that plan. What should we build instead? 🔄")

        log_service.log_terminal(session_id, "👍 Plan approved! Starting code generation...")

        # Approved → have Gemini generate the actual Python automation code
        spec = self._build_spec(session["selected_trigger"], session["selected_actions"], session["known_fields"])
        codegen_model = session.get("codegen_model_id", "gemini_flash")

        try:
            files = self._generate_code_with_gemini(spec, session["known_fields"], codegen_model)
            # Normalization: Ensure files is a Dict[str, str]
            if isinstance(files, dict):
                normalized = {}
                for name, data in files.items():
                    if isinstance(data, dict) and "content" in data:
                        normalized[name] = data["content"]
                    elif isinstance(data, str):
                        normalized[name] = data
                    else:
                        normalized[name] = str(data)
                files = normalized
        except Exception as e:
            print(f"[AEGIS Code Gen Error] {str(e)}")
            log_service.log_terminal(session_id, "❌ Code generation failed. Falling back to template-based generation.")
            # Fallback to template-based generation
            files = self._generate_workspace_files_fallback(spec, session)

        session.update({"stage": "complete", "files": files})
        log_service.log_terminal(session_id, "✅ Code generation complete!")
        _sessions._save()
        return {
            "session_id": session_id,
            "stage": "complete",
            "status": "success",
            "agent_status": "complete",
            "agent_message": "Your automation code is ready! 🚀 Check out the generated files in your workspace. The main.py has your full automation logic.",
            "files": files,
            "spec": spec
        }

    # ==========================================================
    # GEMINI COMMUNICATION
    # ==========================================================
    def _ask_gemini(self, history: List[Dict[str, str]], model_id: str, project_context: str = "") -> Dict[str, Any]:
        """Send the conversation to Gemini and get a structured JSON response."""
        if self.mock_mode:
            print("[AEGIS MOCK] MOCK_AGENT is true. Returning simulated response.")
            # Basic fallback if they turned on MOCK_AGENT due to rate limits
            return {
                "intent": "chat",
                "message": "Hey! I'm running in mock mode right now (usually because we hit API rate limits). I can't generate specific automations but I can still chat with you. Try checking your Gemini key or waiting for the quota to reset! 🤖"
            }

        cfg = self.models.get(model_id, self.models["gemini_flash"])


        # Build the conversation for Gemini
        conversation_messages = []
        for msg in history:
            role = msg["role"]
            if role == "user":
                conversation_messages.append(f"USER: {msg['content']}")
            elif role == "assistant":
                conversation_messages.append(f"AEGIS: {msg['content']}")

        conversation_text = "\n".join(conversation_messages)

        # project_context is now passed in as an argument
        payload = {
            "conversation": conversation_text,
            "project_context": project_context
        }

        if cfg["provider"] == "gemini":
            raw_text = self._gemini_complete_text(self._system_prompt, payload, cfg)
        else:
            raw_text = self._claude_complete_text(self._system_prompt, payload, cfg)

        return self._extract_json(raw_text)

    def _generate_code_with_gemini(self, spec: Dict[str, Any], fields: Dict[str, Any], model_id: str) -> Dict[str, str]:
        """Have Gemini generate actual Python automation code."""
        cfg = self.models.get(model_id, self.models["gemini_flash"])

        trigger_type = spec["trigger"].get("type", "unknown") if isinstance(spec["trigger"], dict) else str(spec["trigger"])
        action_types = []
        for a in spec.get("actions", []):
            if isinstance(a, dict):
                action_types.append(a.get("type", "unknown"))
            else:
                action_types.append(str(a))

        code_prompt = f"""You are a Python code generator for Algorand AVM on-chain automations.

Your goal is to generate a complete, structured, and AVM-compatible automation project.

### AUTOMATION SPECIFICATION:
TRIGGER TYPE: {trigger_type}
ACTION TYPES: {json.dumps(action_types)}
NOTIFICATION: {json.dumps(spec.get('notification', {}), indent=2)}
PARAMETERS: {json.dumps(fields, indent=2)}
SPEC ID: {spec['id']}

### GENERATION REQUIREMENTS:
Generate these files and return them as a JSON object (filename: content):

1. "main.py":
   - The primary orchestrator script using `py-algorand-sdk`.
   - MUST import `algosdk.v2client.algod` for network interactions.
   - MUST handle the Algorand logic flow: Monitor blocks or accounts -> Execute transaction.
   - For transfers, use `transaction.PaymentTxn`.
   - Amounts MUST be converted to microAlgos (1 ALGO = 1,000,000 microAlgos).

2. "adapters.py":
   - Modular functions for Algorand interactions (Signing, sending, and waiting for transactions).
   - Use `algosdk.mnemonic` if the user provided one (though platform uses secret management).

3. "config.json":
   - Chain Name: "{config.CHAIN_NAME}", RPC: "{config.RPC_URL}".
   - Actions: Include ONLY relevant Algorand actions.
   - Clean all EVM terms (no ERC20, no 0x addresses).

4. "README.md":
   - Explain that this automation runs on Algorand Testnet.
   - Remind the user to fund their Agent Account with ALGO.

STRICT: USE py-algorand-sdk ONLY. NEVER USE WEB3.PY or ETHERS. RETURN VALID JSON."""

        if cfg["provider"] == "gemini":
            raw_text = self._gemini_complete_text(code_prompt, {}, cfg)
        else:
            raw_text = self._claude_complete_text(code_prompt, {}, cfg)

        try:
            files = self._extract_json(raw_text)
            if files and isinstance(files, dict) and "config.json" in files:
                config_json = files["config.json"]
                try:
                    config_data = json.loads(config_json) if isinstance(config_json, str) else config_json
                    
                    # 1. Normalize Trigger Structure (AVM Spec)
                    # LLMs often return flat fields in "trigger". Migrate them to "params".
                    tr = config_data.get("trigger", {}) or {}
                    if isinstance(tr, dict):
                        if "params" not in tr:
                            tr["params"] = {}
                        
                        # Migrate top-level trigger fields (except type/params) to params
                        for k, v in list(tr.items()):
                            if k not in ["type", "params"]:
                                if k not in tr["params"]:
                                    tr["params"][k] = v
                                del tr[k]
                        
                        # 2. Inject Contextual Fields
                        if "wallet_address" not in tr["params"] and fields.get("wallet_address"):
                            tr["params"]["wallet_address"] = fields["wallet_address"]
                        
                        if "token" not in tr["params"]:
                            tr["params"]["token"] = tr["params"].get("asset") or fields.get("token") or "ALGO"

                        # 3. Robust Unit Normalization (Thresholds)
                        for p_key in ["threshold", "minimum_amount", "amount"]:
                            if p_key in tr["params"]:
                                try:
                                    val_str = str(tr["params"][p_key]).lower()
                                    is_micro = any(u in val_str for u in ["micro", "μ", "microalgos"])
                                    # Extract number only
                                    clean_num = "".join(c for c in val_str if c.isdigit() or c == ".")
                                    val_num = float(clean_num)
                                    # Normalize to ALGO (Backend comparison unit)
                                    tr["params"][p_key] = val_num / 1e6 if is_micro else val_num
                                except: pass
                        
                        config_data["trigger"] = tr

                    # 4. Enforce Network & Project Metadata
                    config_data["chain"] = {"name": config.CHAIN_NAME, "rpc": config.RPC_URL}
                    config_data["spec_id"] = f"AEGIS-{str(uuid.uuid4())[:6]}"
                    config_data.pop("wallet", None)
                    
                    files["config.json"] = json.dumps(config_data, indent=2)
                except Exception as e:
                    print(f"[Agent] Config normalization failed: {e}")
                
                if any(k.endswith(('.py', '.json', '.md')) for k in files.keys()):
                    return files
        except: pass

        return self._generate_workspace_files_fallback(spec, {"known_fields": fields})

    # ==========================================================
    # HELPERS
    # ==========================================================
    def _try_finalize_plan(self, session_id: str, session: Dict[str, Any], agent_message: Optional[str] = None) -> Dict[str, Any]:
        """Generate plan when all fields are collected."""
        session["stage"] = "awaiting_approval"
        plan_md = self._generate_plan_md(
            session.get("selected_trigger", {}),
            session.get("selected_actions", []),
            session["known_fields"]
        )
        session["plan_md"] = plan_md
        _sessions._save() # Explicit Save
        msg = agent_message or "All inputs received! I've drafted the execution plan. Review it and approve when ready. ✅"
        return {
            "session_id": session_id,
            "stage": "awaiting_approval",
            "status": "chat",
            "agent_status": "planning",
            "agent_message": msg,
            "plan_md": plan_md,
            "files": {"plan.md": plan_md}
        }

    def _response(self, sid: str, stage: str, status: str, agent_status: str, msg: str) -> Dict[str, Any]:
        return {
            "session_id": sid, "stage": stage, "status": status,
            "agent_status": agent_status, "agent_message": msg, "files": {}
        }

    def _build_spec(self, trigger: Any, actions: Any, fields: Dict[str, Any]) -> Dict[str, Any]:
        """Helper to build a structured JSON spec for the UI and deployment."""
        
        # Normalize actions for the spec
        spec_actions = []
        if isinstance(actions, list):
            for a in actions:
                if isinstance(a, str):
                    spec_actions.append({"type": a, "params": {}})
                else:
                    spec_actions.append(a)
        else:
            spec_actions.append({"type": str(actions), "params": {}})

        # Extract notification settings for top-level spec access
        notification = {
            "channels": fields.get("notification_channels", ["telegram"]),
            "cooldown": fields.get("notification_cooldown") or fields.get("cooldown") or 60,
            "telegram": {"message": fields.get("telegram_message") or f"AEGIS Alert: Automation Condition Met"},
            "email": {
                "to": fields.get("to") or fields.get("email_address"),
                "subject": fields.get("email_subject") or fields.get("subject") or "AEGIS Alert",
                "body": fields.get("email_body") or fields.get("message") or "Automation condition met."
            }
        }
        
        return {
            "id": "AEGIS-" + str(uuid.uuid4())[:6],
            "project_name": fields.get("project_name", "Algorand Automation"),
            "chain": {"name": config.CHAIN_NAME, "rpc": config.RPC_URL},
            "trigger": trigger,
            "actions": spec_actions,
            "notification": notification,
            "params": fields,
            "timestamp": time.time()
        }

    # ==========================================================
    # PLAN.MD GENERATION
    # ==========================================================
    def _generate_plan_md(self, tr: Any, acs: Any, fields: Dict[str, Any]) -> str:
        # Handle both dict and string trigger formats
        if isinstance(tr, dict):
            trigger_type = tr.get("type", "unknown")
            trigger_name = trigger_type.replace("_", " ").title()
        else:
            trigger_type = str(tr)
            trigger_name = str(tr).replace("_", " ").title()

        # Handle actions
        if not isinstance(acs, list):
            acs = [acs] if acs else []

        action_names = []
        action_lines = []
        for a in acs:
            if isinstance(a, dict):
                atype = a.get("type", "unknown")
                aname = atype.replace("_", " ").title()
            else:
                atype = str(a)
                aname = str(a).replace("_", " ").title()
            action_names.append(aname)
            action_lines.append(f"- **{aname}**: `{atype}`")

        field_lines = "\n".join([f"- **{k}**: `{v}`" for k, v in fields.items()])
        actions_section = "\n".join(action_lines) if action_lines else "- **Log Message**: `log_message`"

        return f"""# 🚀 AEGIS Automation Plan

## 1. Goal
Automate **{action_names[0] if action_names else 'process'}** when **{trigger_name}** is detected.

## 2. Trigger
- **Type**: `{trigger_type}`
- **Asset**: `{fields.get('asset') or fields.get('token') or 'N/A'}`
- **Threshold**: `{fields.get('threshold', 'N/A')}`

## 3. Actions
{actions_section}

## 4. Parameters
{field_lines}

## 5. Infrastructure
- **Executor**: Platform Runtime
- **Account**: Agent Account (Managed)
- **Chain**: `{config.CHAIN_NAME}` (AVM)
- **Security**: Pre-flight validation enabled

---
*Approve this plan to generate the Algorand automation code.*
"""

    # ==========================================================
    # FALLBACK FILE GENERATION (if Gemini code gen fails)
    # ==========================================================
    def _generate_workspace_files_fallback(self, spec: Dict[str, Any], session: Dict[str, Any]) -> Dict[str, str]:
        trigger = spec.get("trigger", {})
        trigger_type = trigger.get("type", "unknown") if isinstance(trigger, dict) else str(trigger)
        spec_id = spec["id"]
        fields = session.get("known_fields", {})

        main_py = f'''"""
Algorand Automation Orchestrator
Spec ID: {spec_id}
"""
import os
import time
import logging
from algosdk.v2client import algod
from algosdk import transaction

# AEGIS Internal Config
ALGOD_URL = "{config.ALGOD_URL}"
ALGOD_TOKEN = ""

def main():
    client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_URL)
    logging.info("AEGIS Monitoring Started for Algorand Testnet...")
    
    while True:
        try:
            # Logic for trigger {trigger_type}...
            pass
        except Exception as e:
            logging.error(f"Execution Error: {{e}}")
        time.sleep(30)

if __name__ == "__main__":
    main()
'''
        config_data = {
            "project_name": "Algorand Automation",
            "spec_id": spec_id,
            "chain": {"name": config.CHAIN_NAME, "rpc": config.RPC_URL},
            "trigger": {"type": trigger_type, "params": fields},
            "notification": spec.get("notification", {})
        }

        return {
            "main.py": main_py,
            "config.json": json.dumps(config_data, indent=2),
            "requirements.txt": "py-algorand-sdk\npython-dotenv",
            "README.md": "# AEGIS Algorand Node\n\nRuns on Algorand Testnet.",
            ".env.example": "ALGORAND_MNEMONIC=\n"
        }

    # ==========================================================
    # AI COMPLETION LAYER
    # ==========================================================
    def _fix_truncated_json(self, json_str: str) -> str:
        """Attempt to close open braces/brackets and remove trailing commas in truncated JSON."""
        json_str = json_str.strip()
        # Remove trailing commas that break parsing
        json_str = re.sub(r',\s*([\]}])', r'\1', json_str)
        json_str = re.sub(r',\s*$', '', json_str)
        
        # Balance braces
        open_braces = json_str.count('{')
        close_braces = json_str.count('}')
        open_brackets = json_str.count('[')
        close_brackets = json_str.count(']')
        
        if open_brackets > close_brackets:
            json_str += ']' * (open_brackets - close_brackets)
        if open_braces > close_braces:
            json_str += '}' * (open_braces - close_braces)
            
        return json_str

    def _extract_json(self, text: str) -> Dict[str, Any]:
        """Extract JSON from AI response, handling various formats."""
        text = text.strip()
        # Remove markdown code fences if present
        text = re.sub(r'^```(?:json)?\s*\n?', '', text)
        text = re.sub(r'\n?```\s*$', '', text)
        text = text.strip()

        try:
            s = text.find("{")
            e = text.rfind("}")
            if s == -1:
                return {"intent": "chat", "message": text}
            
            # If no closing brace, or closing brace is before opening, try to fix it
            if e == -1 or e < s:
                fixed_text = self._fix_truncated_json(text[s:])
                return json.loads(fixed_text)
                
            json_payload = text[s:e + 1]
            try:
                return json.loads(json_payload)
            except json.JSONDecodeError:
                fixed_payload = self._fix_truncated_json(json_payload)
                return json.loads(fixed_payload)
        except Exception:
            # If all fails, treat as chat response
            return {"intent": "chat", "message": text}

    def _gemini_complete_text(self, sys: str, pl: Dict[str, Any], cfg: Dict[str, str]) -> str:
        import google.generativeai as genai
        api_key = os.getenv(str(cfg["api_key_env"]))
        if not api_key:
            raise ValueError(f"Missing API key: {cfg['api_key_env']}")
        genai.configure(api_key=api_key)
        m = genai.GenerativeModel(str(cfg["model_name"]), generation_config={"max_output_tokens": 4096, "temperature": 0.4})
        prompt = f"{sys}\n\nINPUT: {json.dumps(pl)}" if pl else sys

        # Retry with backoff for rate limits
        import time
        import random
        max_retries = 5  # Reduced from 10 to fail faster and notify user
        for attempt in range(max_retries):
            try:
                return m.generate_content(prompt).text.strip()
            except Exception as e:
                err_msg = str(e)
                # 429 is Rate Limit or Quota Exceeded (Resource exhausted)
                if "429" in err_msg or "Resource has been exhausted" in err_msg or "quota" in err_msg.lower():
                    # Exponential backoff with jitter
                    wait = (2 ** (attempt + 1)) + (random.randint(0, 1000) / 1000.0)
                    if attempt < max_retries - 1:
                        print(f"[Gemini 429] Rate limited (attempt {attempt + 1}/{max_retries}). Retrying in {wait:.1f}s...")
                        time.sleep(wait)
                        continue
                    else:
                        print("[Gemini 429] Quota exceeded after multiple retries. Informing user.")
                        return json.dumps({
                            "intent": "chat", 
                            "message": "I'm currently hitting a Google Gemini rate limit or quota exceeded with your key. You might need to wait a few minutes or switch to a paid tier key! 🚦"
                        })
                
                # For all other exceptions
                print(f"[Gemini Error] {err_msg}")
                raise e

        return "" # Should not reach here due to raise

    def _claude_complete_text(self, sys: str, pl: Dict[str, Any], cfg: Dict[str, str]) -> str:
        from anthropic import Anthropic
        api_key = os.getenv(str(cfg["api_key_env"]))
        if not api_key:
            raise ValueError(f"Missing API key: {cfg['api_key_env']}")
        c = Anthropic(api_key=api_key)
        prompt = json.dumps(pl) if pl else "Respond."
        return c.messages.create(
            model=str(cfg["model_name"]), max_tokens=4096, system=sys,
            messages=[{"role": "user", "content": prompt}]
        ).content[0].text.strip()