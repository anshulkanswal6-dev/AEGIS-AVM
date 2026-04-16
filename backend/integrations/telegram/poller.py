import time
import os
import requests
import logging
import threading
from .webhook import handle_telegram_webhook
from fastapi import Request

logger = logging.getLogger(__name__)

class TelegramPoller:
    def __init__(self):
        self.bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        self.api_url = f"https://api.telegram.org/bot{self.bot_token}"
        self.last_update_id = 0
        self.running = False
        self.thread = None

    def start(self):
        if not self.bot_token:
            print("[TelegramPoller] No bot token — polling disabled.")
            return

        if self.running or (self.thread and self.thread.is_alive()):
            print("[TelegramPoller] Already running — skipping redundant start.")
            return

        # NEW: Explicitly delete any active webhook to allow polling.
        # Telegram does not allow concurrent Webhook and getUpdates.
        try:
            print("[TelegramPoller] Deleting existing webhooks to enable polling...")
            requests.post(f"{self.api_url}/deleteWebhook", timeout=10)
        except Exception as e:
            print(f"[TelegramPoller] Warning while deleting webhook: {e}")

        print("[TelegramPoller] Starting long-polling for local Telegram Bot updates...")
        self.running = True
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()

    def stop(self):
        self.running = False

    def _run(self):
        while self.running:
            try:
                url = f"{self.api_url}/getUpdates"
                params = {"offset": self.last_update_id + 1, "timeout": 30}
                response = requests.get(url, params=params, timeout=35)
                
                if response.status_code == 200:
                    data = response.json()
                    for update in data.get("result", []):
                        self.last_update_id = update["update_id"]
                        self._process_update(update)
                elif response.status_code == 409:
                    print("[TelegramPoller] Conflict: Another poller or webhook is active. Retrying in 5s...")
                    time.sleep(5)
                else:
                    print(f"[TelegramPoller] Unexpected status {response.status_code}: {response.text}")
                    time.sleep(5)
            except Exception as e:
                # NEW: More robust error handling for network transience
                from requests.exceptions import ConnectionError
                if isinstance(e, requests.exceptions.ConnectionError) and "getaddrinfo failed" in str(e):
                    print(f"[TelegramPoller] DNS Resolution failed. Is there internet? Retrying in 15s...")
                    time.sleep(15)
                else:
                    print(f"[TelegramPoller] Connection error: {e}. Retrying in 10s...")
                    time.sleep(10)

    def _process_update(self, update):
        # We simulate a webhook call to reuse existing logic
        # We need a mock request object for handle_telegram_webhook
        try:
            from .webhook import handle_telegram_webhook
            # Mocking the FastAPI request behavior
            # In a real app, we might refactor handle_telegram_webhook to accept a dict instead of a Request
            # But let's just extract the core logic for now or refactor it.
            
            # For now, let's just call verify_and_link directly if it's a start command
            message = update.get("message")
            if not message: return
            
            text = message.get("text", "")
            chat = message.get("chat", {})
            chat_id = str(chat.get("id"))
            user = message.get("from", {})
            tg_id = str(user.get("id"))
            username = user.get("username")

            if text.startswith("/start"):
                from .linking import verify_and_link
                from .service import TelegramService
                
                parts = text.split()
                if len(parts) > 1:
                    token = parts[1]
                    print(f"[TelegramPoller] Processing /start for token: {token}")
                    result = verify_and_link(token, tg_id, chat_id, username)
                    
                    svc = TelegramService()
                    if result == "conflict":
                        svc.send_message(chat_id, "⚠️ This Telegram account is already linked to another user.")
                    elif result:
                        svc.send_message(chat_id, "✅ <b>AEGIS Connected! 🎉</b> \n\nYou can now remotely monitor and manage AEGIS from here. Use /hi to get started 💬")
                    else:
                        svc.send_message(chat_id, "❌ Invalid or expired token.")
                else:
                    svc = TelegramService()
                    
                    from .linking import is_telegram_user_linked
                    if is_telegram_user_linked(tg_id):
                        svc.send_message(chat_id, "✅ <b>You are already connected to AEGIS!</b>\n\nYou can now remotely monitor and manage AEGIS from here. Use /hi to get started 💬")
                    else:
                        # More helpful fallback message
                        help_text = (
                            "<b>Welcome to AEGIS!</b> 🥂\n\n"
                            "To link your account, please use the <b>QR Code</b> or <b>Link</b> provided in your dashboard.\n\n"
                            "If that's not working, you can link manually by sending:\n"
                            "<code>/start YOUR_TOKEN</code>\n\n"
                            "<i>(You can find your unique token in the Integrations tab)</i>"
                        )
                        svc.send_message(chat_id, help_text)
            else:
                # Route all other messages to the command handler
                from .command_router import handle_command
                handle_command(chat_id, text, tg_id)
        except Exception as e:
            print(f"[TelegramPoller] Failed to process update: {e}")


_poller = TelegramPoller()

def start_telegram_poller():
    _poller.start()

def stop_telegram_poller():
    _poller.stop()
