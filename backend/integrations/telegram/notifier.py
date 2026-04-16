import logging
import re
from typing import Optional
from .service import TelegramService
from .linking import get_telegram_account

logger = logging.getLogger(__name__)

def escape_markdown(text: str) -> str:
    """Helper to escape special characters for Telegram MarkdownV2."""
    # For now, we'll stick to HTML mode as it's easier to escape or just use plain text.
    # HTML mode only needs <, >, and & escaped.
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

class TelegramNotifier:
    def __init__(self):
        self.service = TelegramService()

    def notify_user(self, user_id: str, message: str) -> bool:
        """Sends a notification to a linked telegram user."""
        account = get_telegram_account(user_id)
        if not account:
            logger.warning(f"[TelegramNotifier] No linked account for user {user_id}")
            return False

        chat_id = account.get("telegram_chat_id")
        if not chat_id:
            return False

        # Use HTML for simple formatting
        formatted_message = f"<b>AEGIS Notification</b>\n\n{escape_markdown(message)}"
        
        # Silent failure - do not break execution
        return self.service.send_message(chat_id, formatted_message, parse_mode="HTML")

    def notify_automation_event(self, user_id: str, event_type: str, automation_name: str, details: str = "") -> bool:
        """Specific helper for automation events."""
        emoji = {
            "start": "🚀",
            "success": "✅",
            "failure": "❌",
            "alert": "⚠️"
        }.get(event_type, "🔔")

        msg = f"{emoji} <b>Automation {event_type.capitalize()}</b>\n"
        msg += f"Project: {automation_name}\n"
        if details:
            msg += f"\n{details}"
        
        return self.notify_user(user_id, msg)
