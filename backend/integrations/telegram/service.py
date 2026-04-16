import requests
import os
import logging

logger = logging.getLogger(__name__)

import config

class TelegramService:
    def __init__(self):
        self.bot_token = config.TELEGRAM_BOT_TOKEN
        self.api_url = f"https://api.telegram.org/bot{self.bot_token}"

    def send_message(self, chat_id: str, text: str, parse_mode: str = "HTML") -> bool:
        """Sends a message to a telegram chat. Fails silently and logs error."""
        res = self.send_message_detailed(chat_id, text, parse_mode)
        return res.get("success", False)

    def send_message_detailed(self, chat_id: str, text: str, parse_mode: str = "HTML") -> dict:
        """Sends a message to a telegram chat and returns a detailed status dict."""
        if not self.bot_token:
            logger.error("[TelegramService] TELEGRAM_BOT_TOKEN not configured")
            return {"success": False, "error": "bot_token_missing"}

        url = f"{self.api_url}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode
        }

        try:
            response = requests.post(url, json=payload, timeout=10)
            if response.status_code == 200:
                return {"success": True, "data": response.json()}
            
            # API returned error (e.g. 400 Bad Request, 403 Forbidden)
            error_data = response.text
            try:
                error_json = response.json()
                error_data = error_json.get("description") or error_data
            except:
                pass
            
            logger.error(f"[TelegramService] API error for {chat_id}: {error_data}")
            return {"success": False, "error": f"Telegram API error: {error_data}", "status_code": response.status_code}
            
        except Exception as e:
            logger.error(f"[TelegramService] Network failure for {chat_id}: {str(e)}")
            return {"success": False, "error": f"Network failure: {str(e)}"}

    def set_webhook(self, webhook_url: str, secret_token: str = None) -> bool:
        """Registers the webhook with Telegram."""
        if not self.bot_token:
            return False

        url = f"{self.api_url}/setWebhook"
        payload = {"url": webhook_url}
        if secret_token:
            payload["secret_token"] = secret_token

        try:
            response = requests.post(url, json=payload, timeout=10)
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"[TelegramService] Failed to set webhook: {str(e)}")
            return False

    def get_me(self):
        """Returns bot info."""
        if not self.bot_token:
            return None
        url = f"{self.api_url}/getMe"
        try:
            resp = requests.get(url, timeout=10)
            return resp.json()
        except:
            return None
