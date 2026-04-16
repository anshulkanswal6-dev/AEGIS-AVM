import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

load_dotenv()


class GenAIAgent:
    def __init__(self, catalog_path: str = "catalogue.json"):
        self.catalog_path = Path(catalog_path)
        with open(self.catalog_path, "r", encoding="utf-8") as f:
            self.catalog = json.load(f)

        self.triggers = self.catalog.get("triggers", [])
        self.field_definitions = self.catalog.get("field_definitions", {})
        self.global_required_fields = self.catalog.get("global_required_fields", [])

        # Model registry
        self.models = {
            "gemini_flash": {
                "provider": "gemini",
                "model_name": os.getenv("GEMINI_FLASH_MODEL", "gemini-1.5-flash"),
                "api_key_env": "GEMINI_API_KEY",
                "label": "Gemini Flash"
            },
            "gemini_pro": {
                "provider": "gemini",
                "model_name": os.getenv("GEMINI_PRO_MODEL", "gemini-1.5-pro"),
                "api_key_env": "GEMINI_API_KEY",
                "label": "Gemini Pro"
            },
            "claude_sonnet": {
                "provider": "claude",
                "model_name": os.getenv("CLAUDE_SONNET_MODEL", "claude-3-5-sonnet-latest"),
                "api_key_env": "ANTHROPIC_API_KEY",
                "label": "Claude Sonnet"
            }
            # Add more later if needed
        }

        self.default_planning_model = os.getenv("DEFAULT_PLANNING_MODEL", "gemini_flash")
        self.default_codegen_model = os.getenv("DEFAULT_CODEGEN_MODEL", "claude_sonnet")

    # =========================================================
    # PUBLIC METHODS
    # =========================================================

    def list_available_models(self) -> List[Dict[str, str]]:
        output = []
        for model_id, config in self.models.items():
            api_key = os.getenv(config["api_key_env"])
            if api_key:
                output.append({
                    "id": model_id,
                    "label": config["label"],
                    "provider": config["provider"],
                    "model_name": config["model_name"]
                })
        return output

    def plan(
        self,
        user_prompt: str,
        known_fields: Optional[Dict[str, Any]] = None,
        model_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        known_fields = known_fields or {}
        model_id = model_id or self.default_planning_model

        shortlist = self._catalog_shortlist(user_prompt)

        system_prompt = """
You are the planning brain of an onchain automation platform.

Rules:
1. Only use triggers from the provided catalogue shortlist.
2. Never invent new trigger names.
3. Extract obvious fields from the user's prompt.
4. Ask only for missing required fields.
5. Return strict JSON only.

Return JSON in this format:
{
  "intent_summary": "short summary",
  "candidate_triggers": ["trigger_a"],
  "reasoning": "why this trigger fits",
  "extracted_fields": {},
  "missing_fields": [],
  "follow_up_questions": []
}
"""

        payload = {
            "user_prompt": user_prompt,
            "known_fields": known_fields,
            "global_required_fields": self.global_required_fields,
            "catalog_shortlist": shortlist,
        }

        raw = self._complete_json(system_prompt, payload, model_id)

        candidate_triggers = [
            t for t in raw.get("candidate_triggers", [])
            if t in [x["type"] for x in self.triggers]
        ]

        extracted_fields = {**raw.get("extracted_fields", {}), **known_fields}

        selected_trigger = candidate_triggers[0] if candidate_triggers else None
        missing_fields = []
        follow_up_questions = []

        if selected_trigger:
            required_fields = self.global_required_fields + self._get_trigger_required_fields(selected_trigger)
            missing_fields = [
                field for field in required_fields
                if field not in extracted_fields or extracted_fields[field] in (None, "", [])
            ]
            follow_up_questions = [self._get_field_question(field) for field in missing_fields]

        return {
            "intent_summary": raw.get("intent_summary", ""),
            "candidate_triggers": candidate_triggers,
            "reasoning": raw.get("reasoning", ""),
            "extracted_fields": extracted_fields,
            "missing_fields": missing_fields,
            "follow_up_questions": follow_up_questions,
            "planning_model_id": model_id
        }

    def validate(self, selected_trigger: str, field_values: Dict[str, Any]) -> Dict[str, Any]:
        required_fields = self.global_required_fields + self._get_trigger_required_fields(selected_trigger)

        missing_fields = [
            field for field in required_fields
            if field not in field_values or field_values[field] in (None, "", [])
        ]

        errors = []
        for field_name, value in field_values.items():
            err = self._validate_field(field_name, value)
            if err:
                errors.append(err)

        return {
            "is_valid": len(missing_fields) == 0 and len(errors) == 0,
            "missing_fields": missing_fields,
            "errors": errors,
        }

    def build_spec(self, user_prompt: str, selected_trigger: str, field_values: Dict[str, Any]) -> Dict[str, Any]:
        trigger_params = {}
        trigger_meta = self._get_trigger(selected_trigger)

        for field in trigger_meta.get("required_fields", []):
            if field in field_values:
                trigger_params[field] = field_values[field]

        return {
            "version": "1.0",
            "name": user_prompt[:80],
            "chain": {
                "name": field_values["chain"],
                "rpc_url": field_values["rpc_url"],
            },
            "wallet": {
                "type": "agent_wallet",
                "address": field_values["wallet_address"],
            },
            "trigger": {
                "type": selected_trigger,
                "params": trigger_params,
            },
            "conditions": [],
            "actions": [],
            "safety": {
                "mode": "sandbox",
                "max_retries": 3,
            },
        }

    def generate_python_code(self, automation_spec: Dict[str, Any], model_id: Optional[str] = None) -> str:
    trigger_type = automation_spec["trigger"]["type"]
    trigger_params = automation_spec["trigger"]["params"]

    return f'''"""
Auto-generated automation (connected to trigger engine)
"""

from trigger_engine import TriggerEngine, TriggerContext

AUTOMATION_SPEC = {json.dumps(automation_spec, indent=2)}

engine = TriggerEngine()


def should_run():
    ctx = TriggerContext(
        chain=AUTOMATION_SPEC["chain"]["name"],
        rpc_url=AUTOMATION_SPEC["chain"]["rpc_url"],
        wallet_address=AUTOMATION_SPEC["wallet"]["address"]
    )

    return engine.evaluate(
        AUTOMATION_SPEC["trigger"]["type"],
        AUTOMATION_SPEC["trigger"]["params"],
        ctx
    )


def run_actions():
    # TODO: connect action engine later
    print("Running actions...")


def main():
    if should_run():
        print("Trigger condition met ✅")
        run_actions()
    else:
        print("Trigger condition not met ❌")


if __name__ == "__main__":
    main()
'''

    def run_full_flow(
        self,
        user_prompt: str,
        known_fields: Optional[Dict[str, Any]] = None,
        planning_model_id: Optional[str] = None,
        codegen_model_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        planning_model_id = planning_model_id or self.default_planning_model
        codegen_model_id = codegen_model_id or self.default_codegen_model

        planning = self.plan(user_prompt, known_fields, planning_model_id)

        if not planning["candidate_triggers"]:
            return {
                "status": "error",
                "message": "No suitable trigger found",
                "planning": planning,
            }

        selected_trigger = planning["candidate_triggers"][0]
        merged_fields = planning["extracted_fields"]

        validation = self.validate(selected_trigger, merged_fields)

        if not validation["is_valid"]:
            return {
                "status": "needs_input",
                "selected_trigger": selected_trigger,
                "planning": planning,
                "validation": validation,
            }

        spec = self.build_spec(user_prompt, selected_trigger, merged_fields)
        code = self.generate_python_code(spec, codegen_model_id)

        return {
            "status": "success",
            "selected_trigger": selected_trigger,
            "planning": planning,
            "validation": validation,
            "automation_spec": spec,
            "python_code": code,
            "planning_model_id": planning_model_id,
            "codegen_model_id": codegen_model_id,
        }

    # =========================================================
    # HELPERS
    # =========================================================

    def _get_trigger(self, trigger_type: str) -> Dict[str, Any]:
        for trigger in self.triggers:
            if trigger["type"] == trigger_type:
                return trigger
        raise ValueError(f"Unsupported trigger: {trigger_type}")

    def _get_trigger_required_fields(self, trigger_type: str) -> List[str]:
        return self._get_trigger(trigger_type).get("required_fields", [])

    def _get_field_question(self, field_name: str) -> str:
        meta = self.field_definitions.get(field_name, {})
        return meta.get("question", f"Please provide {field_name}.")

    def _catalog_shortlist(self, user_prompt: str) -> Dict[str, Any]:
        text = user_prompt.lower()
        matches = []

        for trigger in self.triggers:
            haystack = f"{trigger['type']} {trigger.get('description', '')}".lower()
            score = 0

            for token in text.split():
                if token in haystack:
                    score += 1

            if ("every" in text or "daily" in text or "weekly" in text or "monthly" in text) and trigger["category"] == "time":
                score += 2
            if ("price" in text or "below" in text or "above" in text) and trigger["category"] == "price":
                score += 2
            if "balance" in text and trigger["category"] == "wallet":
                score += 2
            if "faucet" in text and trigger["category"] == "testnet":
                score += 3

            if score > 0:
                matches.append((score, trigger))

        matches.sort(key=lambda x: x[0], reverse=True)

        return {
            "triggers": [m[1] for m in matches[:10]]
        }

    def _validate_field(self, field_name: str, value: Any) -> Optional[str]:
        field_type = self.field_definitions.get(field_name, {}).get("type")

        if field_type == "evm_address":
            if not isinstance(value, str) or not re.fullmatch(r"0x[a-fA-F0-9]{40}", value):
                return f"{field_name} must be a valid EVM address"

        elif field_type == "email":
            if not isinstance(value, str) or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
                return f"{field_name} must be a valid email"

        elif field_type == "url":
            if not isinstance(value, str) or not re.fullmatch(r"https?://[^\s]+", value):
                return f"{field_name} must be a valid URL"

        elif field_type == "interval":
            if not isinstance(value, str) or not re.fullmatch(
                r"\d+\s*(s|m|min|h|hr|d|day|w|week|seconds|minutes|hours|days|weeks)",
                value,
                re.IGNORECASE
            ):
                return f"{field_name} must be a valid interval like 5m, 1h, 24h"

        elif field_type == "number":
            try:
                float(value)
            except Exception:
                return f"{field_name} must be numeric"

        return None

    def _get_model_config(self, model_id: str) -> Dict[str, str]:
        if model_id not in self.models:
            raise ValueError(f"Unsupported model_id: {model_id}")

        model_config = self.models[model_id]
        api_key = os.getenv(model_config["api_key_env"])

        if not api_key:
            raise ValueError(f"Missing API key for model '{model_id}'. Expected env: {model_config['api_key_env']}")

        return {
            **model_config,
            "api_key": api_key
        }

    def _complete_json(self, system_prompt: str, payload: Dict[str, Any], model_id: str) -> Dict[str, Any]:
        model_config = self._get_model_config(model_id)
        provider = model_config["provider"]

        if provider == "gemini":
            text = self._gemini_complete_text(system_prompt, payload, model_config)
        elif provider == "claude":
            text = self._claude_complete_text(system_prompt, payload, model_config)
        else:
            raise ValueError(f"Unsupported provider: {provider}")

        return self._extract_json(text)

    def _complete_text(self, system_prompt: str, payload: Dict[str, Any], model_id: str) -> str:
        model_config = self._get_model_config(model_id)
        provider = model_config["provider"]

        if provider == "gemini":
            return self._gemini_complete_text(system_prompt, payload, model_config)
        elif provider == "claude":
            return self._claude_complete_text(system_prompt, payload, model_config)
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    def _extract_json(self, text: str) -> Dict[str, Any]:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1:
            raise ValueError(f"No JSON found in model output: {text}")
        return json.loads(text[start:end + 1])

    def _gemini_complete_text(self, system_prompt: str, payload: Dict[str, Any], model_config: Dict[str, str]) -> str:
        import google.generativeai as genai

        genai.configure(api_key=model_config["api_key"])
        model = genai.GenerativeModel(model_config["model_name"])

        prompt = f"{system_prompt}\n\nINPUT:\n{json.dumps(payload, indent=2)}"
        response = model.generate_content(prompt)
        return response.text.strip()

    def _claude_complete_text(self, system_prompt: str, payload: Dict[str, Any], model_config: Dict[str, str]) -> str:
        from anthropic import Anthropic

        client = Anthropic(api_key=model_config["api_key"])
        response = client.messages.create(
            model=model_config["model_name"],
            max_tokens=3000,
            system=system_prompt,
            messages=[
                {"role": "user", "content": json.dumps(payload, indent=2)}
            ],
        )
        return response.content[0].text.strip()


if __name__ == "__main__":
    agent = GenAIAgent("catalogue.json")

    print("AVAILABLE MODELS:")
    print(json.dumps(agent.list_available_models(), indent=2))

    result = agent.run_full_flow(
        "Claim faucet every 24 hours if my balance is below 0.05 ETH",
        known_fields={
            "chain": "sepolia",
            "rpc_url": "https://ethereum-sepolia-rpc.publicnode.com",
            "wallet_address": "0x1234567890abcdef1234567890abcdef12345678",
            "threshold": "0.05",
            "interval": "24h",
            "faucet_url": "https://example-faucet.com",
            "claim_method": "http_post"
        },
        planning_model_id="gemini_flash",
        codegen_model_id="claude_sonnet"
    )

    print(json.dumps(result, indent=2))