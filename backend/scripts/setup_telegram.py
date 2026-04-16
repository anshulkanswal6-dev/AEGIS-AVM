import os
import sys
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load .env
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

def setup_telegram():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    webhook_url = os.getenv("TELEGRAM_WEBHOOK_URL")
    webhook_secret = os.getenv("TELEGRAM_WEBHOOK_SECRET")

    if not token:
        print("❌ Error: TELEGRAM_BOT_TOKEN not found in .env")
        return

    if not webhook_url:
        print("❌ Error: TELEGRAM_WEBHOOK_URL not found in .env")
        print("   Example: https://your-backend.com/api/telegram/webhook")
        return

    print(f"📡 Setting up Telegram webhook for bot token: {token[:6]}...{token[-4:]}")
    print(f"🔗 Webhook URL: {webhook_url}")

    url = f"https://api.telegram.org/bot{token}/setWebhook"
    payload = {
        "url": webhook_url,
        "max_connections": 40,
        "allowed_updates": ["message"]
    }

    if webhook_secret:
        payload["secret_token"] = webhook_secret
        print("🔒 Using webhook secret token.")

    try:
        resp = requests.post(url, json=payload, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        if data.get("ok"):
            print("✅ Telegram webhook set successfully!")
        else:
            print(f"❌ Failed to set webhook: {data.get('description')}")
    except Exception as e:
        print(f"❌ API Request failed: {str(e)}")

if __name__ == "__main__":
    setup_telegram()
