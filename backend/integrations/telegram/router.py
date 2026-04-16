from fastapi import APIRouter, Request, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from .linking import generate_link_token, get_telegram_account, unlink_telegram_account
from .webhook import handle_telegram_webhook
from .notifier import TelegramNotifier
from runtime_store import get_store
from supabase_store import SupabaseStore

router = APIRouter(prefix="/telegram", tags=["telegram"])

class LinkInitRequest(BaseModel):
    wallet_address: str

class TestMessageRequest(BaseModel):
    wallet_address: str
    message: str = "Test notification from AEGIS!"

class UnlinkRequest(BaseModel):
    wallet_address: str

@router.post("/link/init")
async def link_init(req: LinkInitRequest):
    """Generates a linking token for the user."""
    try:
        store = get_store()
        if not isinstance(store, SupabaseStore):
            raise HTTPException(status_code=500, detail="Supabase store not configured")
        
        user_id = store.ensure_profile(req.wallet_address)
        token = generate_link_token(user_id)
        
        bot_username = os.getenv("TELEGRAM_BOT_USERNAME", "AegisSentinelBot")
        deep_link = f"https://t.me/{bot_username}?start={token}"
        tg_link = f"tg://resolve?domain={bot_username}&start={token}"
        
        return {
            "success": True,
            "token": token,
            "deep_link": deep_link,
            "tg_link": tg_link,
            "bot_username": bot_username
        }
    except Exception as e:
        print(f"[Telegram-Router] Error in link_init: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_status(wallet_address: str):
    """Checks if a telegram account is linked for the user."""
    try:
        store = get_store()
        if not isinstance(store, SupabaseStore):
            raise HTTPException(status_code=500, detail="Supabase store not configured")
        
        user_id = store.ensure_profile(wallet_address)
        account = get_telegram_account(user_id)
        
        return {
            "connected": account is not None,
            "username": account.get("telegram_username") if account else None,
            "bot_name": "AEGIS"
        }
    except Exception as e:
        print(f"[Telegram-Router] Error in get_status: {str(e)}")
        return {"connected": False, "error": str(e)}

@router.delete("/unlink")
async def unlink(req: UnlinkRequest):
    """Removes the linked telegram account."""
    store = get_store()
    if not isinstance(store, SupabaseStore):
        raise HTTPException(status_code=500, detail="Supabase store not configured")
    
    user_id = store.ensure_profile(req.wallet_address)
    success = unlink_telegram_account(user_id)
    
    return {"success": success}

@router.post("/test")
async def send_test_message(req: TestMessageRequest):
    """Sends a test message to the linked telegram account."""
    store = get_store()
    if not isinstance(store, SupabaseStore):
        raise HTTPException(status_code=500, detail="Supabase store not configured")
    
    user_id = store.ensure_profile(req.wallet_address)
    notifier = TelegramNotifier()
    success = notifier.notify_user(user_id, req.message)
    
    return {"success": success}

@router.post("/webhook")
async def telegram_webhook(request: Request):
    """Public endpoint for Telegram Bot API webhooks."""
    return await handle_telegram_webhook(request)
