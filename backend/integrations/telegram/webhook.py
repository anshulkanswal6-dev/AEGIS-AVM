from fastapi import Request, HTTPException
import os
import logging
from .linking import verify_and_link
from .service import TelegramService

logger = logging.getLogger(__name__)

async def handle_telegram_webhook(request: Request):
    """
    Handles incoming webhook updates from Telegram.
    Validates secret token and processes /start commands.
    """
    # 1. Validate Secret Token
    secret_token = os.getenv("TELEGRAM_WEBHOOK_SECRET")
    header_token = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
    
    if secret_token and header_token != secret_token:
        logger.warning("[TelegramWebhook] Invalid secret token in header")
        return {"status": "unauthorized"}

    try:
        data = await request.json()
    except Exception as e:
        logger.error(f"[TelegramWebhook] Failed to parse JSON: {e}")
        return {"status": "error"}

    # We only care about messages for now
    message = data.get("message")
    if not message:
        return {"status": "ignored"}

    chat = message.get("chat", {})
    chat_id = str(chat.get("id"))
    user = message.get("from", {})
    telegram_user_id = str(user.get("id"))
    username = user.get("username")
    text = message.get("text", "")

    # 2. Handle /start <token>
    if text.startswith("/start"):
        parts = text.split()
        if len(parts) > 1:
            token = parts[1]
            print(f"[Telegram-Webhook] RECEIVED /START WITH TOKEN: {token}")
            
            result = verify_and_link(
                token=token,
                telegram_user_id=telegram_user_id,
                telegram_chat_id=chat_id,
                telegram_username=username
            )
            
            print(f"[Telegram-Webhook] VERIFICATION RESULT: {result}")
            
            tg_service = TelegramService()
            if result == "conflict":
                tg_service.send_message(chat_id, "⚠️ This Telegram account is already linked to another AEGIS user.")
            elif result:
                tg_service.send_message(chat_id, "✅ <b>AEGIS Connected!</b>\n\nYou can now remotely monitor and manage AEGIS from here. Use /hi to get started")
            else:
                tg_service.send_message(chat_id, "❌ Invalid or expired linking token. Please try again from the AEGIS dashboard.")
        else:
            print("[Telegram-Webhook] RECEIVED /START WITHOUT TOKEN")
            tg_service = TelegramService()
            tg_service.send_message(chat_id, "Welcome to <b>AEGIS</b>! 🛡️\n\nPlease link your account from the dashboard to receive notifications.")

    return {"status": "ok"}
