from __future__ import annotations

import re
import json
import os
import requests
from typing import Any, Callable, Dict, List, Optional
from dataclasses import dataclass
from algosdk import account, mnemonic, util, transaction, logic, abi
from algosdk.v2client import algod, indexer
from algosdk.atomic_transaction_composer import AtomicTransactionComposer, AccountTransactionSigner, TransactionWithSigner

import config


class ActionValidationError(Exception):
    pass


class UnsupportedActionError(Exception):
    pass


ALGORAND_ADDRESS_RE = re.compile(r"^[A-Z2-7]{58}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
URL_RE = re.compile(r"^https?://[^\s]+$")


def validate_algorand_address(value: str, field_name: str) -> None:
    if not isinstance(value, str) or not ALGORAND_ADDRESS_RE.match(value):
        raise ActionValidationError(f"{field_name} is not a valid Algorand address")


def validate_email(value: str, field_name: str) -> None:
    if not isinstance(value, str) or not EMAIL_RE.match(value):
        raise ActionValidationError(f"{field_name} is not a valid email")


def validate_url(value: str, field_name: str) -> None:
    if not isinstance(value, str) or not URL_RE.match(value):
        raise ActionValidationError(f"{field_name} is not a valid URL")


def validate_required_fields(params: Dict[str, Any], required_fields: List[str]) -> None:
    for field in required_fields:
        if field not in params or params[field] in (None, "", []):
            raise ActionValidationError(f"Missing required field: {field}")


def parse_numeric(value: Any, field_name: str = "value") -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        raise ActionValidationError(f"{field_name} must be numeric")


@dataclass
class ActionContext:
    chain: Optional[str] = "algorand"
    rpc_url: Optional[str] = None
    wallet_address: Optional[str] = None
    wallet_app_id: Optional[int] = None
    automation_id: Optional[str] = None
    owner_id: Optional[str] = None 
    project_name: Optional[str] = None
    secrets: Optional[Dict[str, Any]] = None
    memory: Optional[Dict[str, Any]] = None


def _get_executor_signer(ctx: ActionContext) -> tuple[str, AccountTransactionSigner]:
    """Helper to get executor address and signer from context or config."""
    exec_mnemonic = (ctx.secrets or {}).get("executor_mnemonic") or config.ALGORAND_EXECUTOR_MNEMONIC
    if not exec_mnemonic:
        raise ActionValidationError("Executor mnemonic not configured")
    
    pk = mnemonic.to_private_key(exec_mnemonic)
    addr = account.address_from_private_key(pk)
    signer = AccountTransactionSigner(pk)
    return addr, signer


def action_send_native_token(params: Dict[str, Any], ctx: ActionContext) -> Dict[str, Any]:
    validate_required_fields(params, ["recipient_address", "amount"])
    validate_algorand_address(params["recipient_address"], "recipient_address")
    amount_algo = parse_numeric(params["amount"], "amount")
    micro_algos = int(amount_algo * 10**6)

    if not ctx.wallet_app_id:
        return {"success": False, "error": "Missing Wallet App ID in context"}

    print(f"[ActionEngine] Executing ALGO transfer: {amount_algo} to {params['recipient_address']}")
    
    try:
        executor_address, signer = _get_executor_signer(ctx)
        client = config.algod_client
        sp = client.suggested_params()
        app_id = ctx.wallet_app_id

        # Construct ATC
        atc = AtomicTransactionComposer()
        
        # Method for AgentWallet contract
        method = abi.Method(
            name="withdraw_algo",
            args=[abi.Argument(type=abi.UintType(64), name="amount")],
            returns=abi.Returns(type=abi.Returns.VOID)
        )

        # Fee: Outer txn fee should cover inner transfer (total 2000 microAlgos)
        sp.fee = 2000 
        sp.flat_fee = True

        # In Algorand AVM for transfer to a receiver, the receiver must be in the 'accounts' array 
        # of the app call if it's not the sender or app address.
        atc.add_method_call(
            app_id=app_id,
            method=method,
            sender=executor_address,
            sp=sp,
            signer=signer,
            method_args=[micro_algos],
            accounts=[params["recipient_address"]] # Add recipient to accounts for inner txn
        )

        result = atc.execute(client, 4)
        
        return {
            "success": True,
            "action": "send_native_token",
            "message": f"Successfully sent {amount_algo} ALGO to {params['recipient_address']}",
            "tx_id": result.tx_ids[0]
        }

    except Exception as e:
        print(f"[ActionEngine] ALGO transfer failed: {str(e)}")
        return {"success": False, "error": f"ALGO transfer failed: {str(e)}"}


def action_send_erc20(params: Dict[str, Any], ctx: ActionContext) -> Dict[str, Any]:
    """Send ASA (Algorand Standard Asset)."""
    validate_required_fields(params, ["token_address", "recipient_address", "amount"])
    # token_address is asset_id in Algorand
    asset_id = int(params["token_address"])
    validate_algorand_address(params["recipient_address"], "recipient_address")
    amount = parse_numeric(params["amount"], "amount")

    if not ctx.wallet_app_id:
        return {"success": False, "error": "Missing Wallet App ID"}

    try:
        executor_address, signer = _get_executor_signer(ctx)
        client = config.algod_client
        sp = client.suggested_params()
        sp.fee = 2000
        sp.flat_fee = True
        
        atc = AtomicTransactionComposer()
        method = abi.Method(
            name="withdraw_asset",
            args=[
                abi.Argument(type=abi.UintType(64), name="asset_id"),
                abi.Argument(type=abi.UintType(64), name="amount")
            ],
            returns=abi.Returns(type=abi.Returns.VOID)
        )

        # Raw amount (assuming decimals handled by user or fetched)
        raw_amount = int(amount) 

        atc.add_method_call(
            app_id=ctx.wallet_app_id,
            method=method,
            sender=executor_address,
            sp=sp,
            signer=signer,
            method_args=[asset_id, raw_amount],
            accounts=[params["recipient_address"]],
            foreign_assets=[asset_id]
        )

        result = atc.execute(client, 4)
        return {
            "success": True,
            "action": "send_erc20",
            "message": f"Sent asset {asset_id} to {params['recipient_address']}",
            "tx_id": result.tx_ids[0]
        }
    except Exception as e:
        err_msg = str(e)
        if "opted-in" in err_msg.lower():
             return {"success": False, "error": "ASA_OptInRequired", "details": "The recipient or agent wallet has not opted-in to this asset."}
        return {"success": False, "error": f"ASA transfer failed: {err_msg}"}


def action_batch_send_erc20(params: Dict[str, Any], ctx: ActionContext) -> Dict[str, Any]:
    return {"success": False, "error": "Action not yet implemented for AVM"}


def action_swap_exact_in(params: Dict[str, Any], ctx: ActionContext) -> Dict[str, Any]:
    return {"success": False, "error": "Action not yet implemented for AVM"}


def action_swap_exact_out(params: Dict[str, Any], ctx: ActionContext) -> Dict[str, Any]:
    return {"success": False, "error": "Action not yet implemented for AVM"}


def action_claim_faucet(params: Dict[str, Any], ctx: ActionContext) -> Dict[str, Any]:
    return {"success": False, "error": "Action not yet implemented for AVM"}


from adapters import NotificationAdapter

def action_send_email_notification(params: Dict[str, Any], ctx: ActionContext) -> Dict[str, Any]:
    # Normalize body/message
    if not params.get("message"):
        params["message"] = params.get("body") or params.get("email_body") or ""
        
    validate_required_fields(params, ["to", "subject", "message"])
    validate_email(params["to"], "to")
    
    notifier = NotificationAdapter()
    result = notifier.send_email(
        to_email=params["to"],
        subject=params["subject"],
        body=params["message"],
        automation_id=ctx.automation_id or "unknown",
        wallet=ctx.wallet_address or "unknown"
    )
    
    if result.get("success"):
        return {
            "success": True,
            "action": "send_email_notification",
            "message": f"Successfully sent email to {params['to']}"
        }
    else:
        return {
            "success": False,
            "action": "send_email_notification",
            "message": f"Failed to send email to {params['to']}: {result.get('error')}"
        }


def action_send_webhook(params: Dict[str, Any], ctx: ActionContext) -> Dict[str, Any]:
    validate_required_fields(params, ["webhook_url", "payload"])
    validate_url(params["webhook_url"], "webhook_url")
    return {
        "success": True,
        "action": "send_webhook",
        "message": f"Would send webhook to {params['webhook_url']}",
        "payload": params["payload"]
    }


def action_transfer_nft(params: Dict[str, Any], ctx: ActionContext) -> Dict[str, Any]:
    # NFT in Algorand is just an ASA with amount 1
    params["amount"] = 1
    params["token_address"] = params.get("nft_contract") or params.get("asset_id")
    return action_send_erc20(params, ctx)


def action_list_nft(params: Dict[str, Any], ctx: ActionContext) -> Dict[str, Any]:
    return {"success": False, "error": "Action not yet implemented for AVM"}


def action_log_message(params: Dict[str, Any], ctx: ActionContext) -> Dict[str, Any]:
    validate_required_fields(params, ["message"])
    return {
        "success": True,
        "action": "log_message",
        "message": params["message"]
    }


def action_notify(params: Dict[str, Any], ctx: ActionContext) -> Dict[str, Any]:
    # Normalize body/message
    if not params.get("message"):
        params["message"] = params.get("body") or params.get("email_body") or ""

    validate_required_fields(params, ["message"])
    channel = params.get("channel", "email") 
    
    notifier = NotificationAdapter()
    
    if channel == "email":
        validate_required_fields(params, ["to", "subject"])
        result = notifier.send_email(
            to_email=params["to"],
            subject=params["subject"],
            body=params["message"],
            automation_id=ctx.automation_id or "unknown",
            wallet=ctx.wallet_address or "unknown",
            cooldown=params.get("notification_cooldown") or params.get("cooldown"),
            project_name=params.get("project_name") or ctx.project_name or ""
        )
    elif channel == "telegram":
        profile_id = ctx.owner_id
        if not profile_id and ctx.wallet_address:
             from runtime_store import get_store
             store = get_store()
             profile_id = store.ensure_profile(ctx.wallet_address)
        
        if not profile_id:
            return {"success": False, "error": "missing_owner_context"}
        
        result = notifier.send_telegram(
            user_id=profile_id,
            message=params["message"],
            automation_id=ctx.automation_id or "unknown",
            cooldown=params.get("notification_cooldown") or params.get("cooldown"),
            project_name=params.get("project_name") or ctx.project_name or ""
        )
    else:
        return {"success": False, "error": f"unsupported_channel: {channel}"}
        
    success = result.get("success", False)
    error_msg = result.get("error")
    
    return {
        "success": success,
        "action": "notify",
        "channel": channel,
        "error": error_msg,
        "message": "Notification delivered" if success else f"Failed to send {channel} notification: {error_msg}"
    }


def action_get_balance(params: Dict[str, Any], ctx: ActionContext) -> Dict[str, Any]:
    validate_required_fields(params, ["address"])
    validate_algorand_address(params["address"], "address")
    
    idxr = config.indexer_client
    try:
        account_info = idxr.account_info(params["address"])
        balance_micro = account_info.get("account", {}).get("amount", 0)
        balance_algo = balance_micro / 10**6
        
        return {
            "success": True,
            "action": "get_balance",
            "message": f"Balance for {params['address']} is {balance_algo} ALGO",
            "balance_micro": balance_micro,
            "balance_algo": balance_algo
        }
    except Exception as e:
        return {
            "success": False,
            "action": "get_balance",
            "message": f"Indexer request failed: {str(e)}"
        }


ACTION_REGISTRY: Dict[str, Callable[[Dict[str, Any], ActionContext], Dict[str, Any]]] = {
    "send_native_token": action_send_native_token,
    "send_erc20": action_send_erc20,
    "batch_send_erc20": action_batch_send_erc20,
    "swap_exact_in": action_swap_exact_in,
    "swap_exact_out": action_swap_exact_out,
    "claim_faucet": action_claim_faucet,
    "send_email_notification": action_send_email_notification,
    "send_webhook": action_send_webhook,
    "transfer_nft": action_transfer_nft,
    "list_nft": action_list_nft,
    "log_message": action_log_message,
    "get_balance": action_get_balance,
    "notify": action_notify,
}


class ActionEngine:
    def __init__(self, registry: Optional[Dict[str, Callable[[Dict[str, Any], ActionContext], Dict[str, Any]]]] = None):
        self.registry = registry or ACTION_REGISTRY

    def execute(self, action_type: str, params: Dict[str, Any], ctx: Optional[ActionContext] = None) -> Dict[str, Any]:
        ctx = ctx or ActionContext()
        handler = self.registry.get(action_type)
        if not handler:
            raise UnsupportedActionError(f"Unsupported action: {action_type}")
        return handler(params, ctx)