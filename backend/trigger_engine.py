from __future__ import annotations

import re
import time
import pytz
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Any, Callable, Dict, List, Optional

# Algorand-native balance fetch
from algosdk.v2client import indexer as indexer_module
import config


# =========================================================
# Exceptions
# =========================================================

class TriggerValidationError(Exception):
    pass


class UnsupportedTriggerError(Exception):
    pass


# =========================================================
# Validation helpers
# =========================================================

ALGORAND_ADDRESS_RE = re.compile(r"^[A-Z2-7]{58}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
URL_RE = re.compile(r"^https?://[^\s]+$")
INTERVAL_RE = re.compile(r"^\d+\s*(s|m|min|h|hr|d|day|w|week|seconds|minutes|hours|days|weeks)$", re.IGNORECASE)


def validate_algorand_address(value: str, field_name: str) -> None:
    if not isinstance(value, str) or not ALGORAND_ADDRESS_RE.match(value):
        raise TriggerValidationError(f"{field_name} is not a valid Algorand address")


def validate_email(value: str, field_name: str) -> None:
    if not isinstance(value, str) or not EMAIL_RE.match(value):
        raise TriggerValidationError(f"{field_name} is not a valid email")


def validate_url(value: str, field_name: str) -> None:
    if not isinstance(value, str) or not URL_RE.match(value):
        raise TriggerValidationError(f"{field_name} is not a valid URL")


def validate_interval(value: str, field_name: str) -> None:
    if not isinstance(value, str) or not INTERVAL_RE.match(value):
        raise TriggerValidationError(f"{field_name} is not a valid interval")


def validate_required_fields(params: Dict[str, Any], required_fields: List[str]) -> None:
    for field in required_fields:
        if field not in params or params[field] in (None, "", []):
            raise TriggerValidationError(f"Missing required field: {field}")


def parse_numeric(value: Any, field_name: str = "value") -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        raise TriggerValidationError(f"{field_name} must be numeric")


# =========================================================
# Context
# =========================================================

@dataclass
class TriggerContext:
    chain: Optional[str] = None
    rpc_url: Optional[str] = None
    wallet_address: Optional[str] = None
    now: Optional[datetime] = None
    memory: Optional[Dict[str, Any]] = None
    automation_created_at: Optional[datetime] = None

    def get_now(self) -> datetime:
        return self.now or datetime.now(timezone.utc)


# =========================================================
# External adapters — AVM-native
# =========================================================

def fetch_token_price(asset: str, quote_currency: str, price_source: str) -> float:
    mock_prices = {
        "ALGO": 0.35,
        "ETH": 2500.0,
        "BTC": 60000.0,
        "USDC": 1.0,
    }
    return mock_prices.get(asset.upper(), 100.0)


def fetch_wallet_balance(wallet_address: str, token: str, rpc_url: Optional[str] = None) -> float:
    """Fetch real ALGO balance from Algorand Indexer/Algod, with mock fallback."""
    # 1. Try real balance via configured Algorand clients
    if token.upper() in ["ALGO", "NATIVE"]:
        try:
            idxr = config.indexer_client
            account_info = idxr.account_info(wallet_address)
            balance_micro = account_info.get("account", {}).get("amount", 0)
            balance_algo = balance_micro / 1e6
            print(f"[TriggerEngine] Real ALGO balance for {wallet_address[:8]}...: {balance_algo}")
            return balance_algo
        except Exception as e:
            print(f"[TriggerEngine] Indexer balance fetch failed: {e}")

    # 2. Fallback to mocks for non-ALGO or if real fetch fails
    mock_balances = {
        "ALGO": 0.50,
        "USDC": 550.0,
    }
    return mock_balances.get(token.upper(), 0.0)


def fetch_gas_price_gwei(chain: Optional[str]) -> float:
    # Algorand has no gas price concept; return a constant
    return 0.001


def fetch_network_health(health_source: str) -> str:
    return "healthy"


def fetch_protocol_metric(protocol: str, metric_name: str) -> float:
    mock = {
        "health_factor": 1.25,
        "ltv": 72.0,
        "apy": 6.5,
        "profit": 14.0,
        "loss": -8.0,
    }
    return mock.get(metric_name, 0.0)


def fetch_nft_floor_price(collection: str, floor_price_source: str) -> float:
    return 0.85


def check_contract_event_emitted(contract_address: str, event_signature: str) -> bool:
    return False


def check_transaction_confirmed(tx_hash: str, confirmation_count: int) -> bool:
    return True


def check_address_activity(watched_address: str) -> bool:
    return False


def fetch_api_value(api_url: str, response_field: str) -> Any:
    return 42


def check_feed_updated(feed_url: str) -> bool:
    return False


def check_manual_approval(approver_reference: str) -> bool:
    return False


def check_multi_approval(approver_references: List[str], threshold: float) -> bool:
    approvals = 0
    return approvals >= int(threshold)


# =========================================================
# Trigger Handlers
# =========================================================

def _get_pytz_timezone(tz_str: str) -> pytz.BaseTzInfo:
    """Helper to resolve timezone string to pytz object."""
    tz_str = str(tz_str).upper()
    try:
        return pytz.timezone(tz_str)
    except Exception:
        # Resolve common ambiguous or non-standard names
        mapping = {
            "IST": "Asia/Kolkata",
            "PST": "US/Pacific",
            "EST": "US/Eastern",
            "CET": "Europe/Paris",
            "GMT": "UTC",
        }
        return pytz.timezone(mapping.get(tz_str, "UTC"))

def trigger_run_once_at_datetime(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["date", "time", "timezone"])
    now = ctx.get_now()
    
    tz = _get_pytz_timezone(params["timezone"])

    # Resolve natural language dates
    date_str = str(params["date"]).lower()
    local_now = now.astimezone(tz)
    
    if date_str == "today":
        resolved_date = local_now.strftime("%Y-%m-%d")
    elif date_str == "tomorrow":
        resolved_date = (local_now + timedelta(days=1)).strftime("%Y-%m-%d")
    else:
        resolved_date = params["date"]

    # Parse time string (handle HH:MM or HH:MMam/pm or placeholders)
    time_str = str(params["time"]).lower().strip()
    
    # Resolve relative placeholders like [[current_time_plus_2_minutes]]
    # These resolve relative to the automation's creation time
    placeholder_match = re.search(r"\[\[current_time_plus_(\d+)_minutes\]\]", time_str)
    if placeholder_match:
        minutes_offset = int(placeholder_match.group(1))
        # Use created_at if available, otherwise fallback to 'now'
        base_time = ctx.automation_created_at or now
        target_dt = base_time + timedelta(minutes=minutes_offset)
        
        # Update resolved_date and time parts
        resolved_date = target_dt.astimezone(tz).strftime("%Y-%m-%d")
        time_str = target_dt.astimezone(tz).strftime("%H:%M")
        time_match = re.match(r"^(\d{1,2}):(\d{2})$", time_str)
    else:
        time_match = re.match(r"^(\d{1,2}):(\d{2})\s*(am|pm)?$", time_str)
        
    if not time_match:
        raise TriggerValidationError(f"Invalid time format: {time_str}. Expected HH:MM or HH:MMam/pm")
    
    groups = time_match.groups()
    hh = groups[0]
    mm = groups[1]
    meridiem = groups[2] if len(groups) >= 3 else None
    
    hour = int(hh)
    minute = int(mm)
    
    if meridiem == "pm" and hour < 12:
        hour += 12
    elif meridiem == "am" and hour == 12:
        hour = 0

    # Create target datetime in our timezone
    try:
        target_naive = datetime(
            year=int(resolved_date[:4]),
            month=int(resolved_date[5:7]),
            day=int(resolved_date[8:10]),
            hour=hour,
            minute=minute
        )
        target = tz.localize(target_naive)
    except Exception as e:
        raise TriggerValidationError(f"Invalid date/time format: {resolved_date} {time_str}. {e}")
    
    # Compare with current time in UTC
    target_utc = target.astimezone(timezone.utc)
    now_utc = now.astimezone(timezone.utc) if now.tzinfo else now.replace(tzinfo=timezone.utc)
    
    is_triggered = now_utc >= target_utc
    if is_triggered:
        print(f"[TRIGGER-DEBUG] Schedule Matched! Target UTC: {target_utc}, Now UTC: {now_utc}")
    return is_triggered


def trigger_run_daily_at_time(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["time", "timezone"])
    now = ctx.get_now()
    tz = _get_pytz_timezone(params["timezone"])
    local_now = now.astimezone(tz)
    
    time_str = str(params["time"]).lower().strip()
    time_match = re.match(r"^(\d{1,2}):(\d{2})\s*(am|pm)?$", time_str)
    if not time_match:
        return False 
    
    hh, mm, meridiem = time_match.groups()
    hour = int(hh)
    minute = int(mm)
    
    if meridiem == "pm" and hour < 12:
        hour += 12
    elif meridiem == "am" and hour == 12:
        hour = 0

    is_triggered = local_now.hour == hour and local_now.minute == minute
    if is_triggered:
        print(f"[TRIGGER-DEBUG] Daily Match! Local Time: {local_now}, Target Time: {hour:02d}:{minute:02d}")
    return is_triggered


def trigger_run_weekly_on_day_time(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["weekday", "time", "timezone"])
    weekday_map = {
        "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
        "friday": 4, "saturday": 5, "sunday": 6
    }
    target_weekday = weekday_map[str(params["weekday"]).lower()]
    
    now = ctx.get_now()
    tz = _get_pytz_timezone(params["timezone"])
    local_now = now.astimezone(tz)
    
    hh, mm = map(int, str(params["time"]).split(":"))
    return local_now.weekday() == target_weekday and local_now.hour == hh and local_now.minute == mm


def trigger_run_monthly_on_date_time(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["day_of_month", "time", "timezone"])
    now = ctx.get_now()
    tz = _get_pytz_timezone(params["timezone"])
    local_now = now.astimezone(tz)
    
    hh, mm = map(int, str(params["time"]).split(":"))
    return local_now.day == int(params["day_of_month"]) and local_now.hour == hh and local_now.minute == mm


def trigger_run_every_interval(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["interval"])
    validate_interval(str(params["interval"]), "interval")
    last_run = (ctx.memory or {}).get("last_run_ts")
    if last_run is None:
        return True
    # actual scheduler usually handles this better
    return True


def trigger_run_between_time_window(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["start_time", "end_time", "timezone", "interval"])
    now = ctx.get_now()
    sh, sm = map(int, str(params["start_time"]).split(":"))
    eh, em = map(int, str(params["end_time"]).split(":"))
    start_minutes = sh * 60 + sm
    end_minutes = eh * 60 + em
    now_minutes = now.hour * 60 + now.minute
    return start_minutes <= now_minutes <= end_minutes


def trigger_run_on_cron_expression(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["cron", "timezone"])
    # scheduler should usually evaluate cron, not this simple handler
    return True


def trigger_token_price_below(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["asset", "quote_currency", "threshold", "price_source"])
    price = fetch_token_price(params["asset"], params["quote_currency"], params["price_source"])
    threshold = parse_numeric(params["threshold"], "threshold")
    return price < threshold


def trigger_token_price_above(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["asset", "quote_currency", "threshold", "price_source"])
    price = fetch_token_price(params["asset"], params["quote_currency"], params["price_source"])
    threshold = parse_numeric(params["threshold"], "threshold")
    return price > threshold


def trigger_token_price_crosses_range(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["asset", "quote_currency", "lower_bound", "upper_bound", "price_source"])
    price = fetch_token_price(params["asset"], params["quote_currency"], params["price_source"])
    lower = parse_numeric(params["lower_bound"], "lower_bound")
    upper = parse_numeric(params["upper_bound"], "upper_bound")
    return lower <= price <= upper


def trigger_percent_price_change_over_period(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["asset", "percent_change", "period", "price_source"])
    percent_change = parse_numeric(params["percent_change"], "percent_change")
    current = fetch_token_price(params["asset"], "USD", params["price_source"])
    previous = current * 0.9
    actual_change = ((current - previous) / previous) * 100
    return abs(actual_change) >= abs(percent_change)


def ensure_token_field(params: Dict[str, Any]) -> None:
    """Ensure either 'token' or 'asset' exists in params, and normalize to 'token'."""
    if "token" not in params and "asset" in params:
        params["token"] = params["asset"]
    if "token" not in params:
        # Fallback for native currency triggers if not specified
        params["token"] = "ALGO"

def trigger_wallet_balance_below(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    ensure_token_field(params)
    validate_required_fields(params, ["token", "threshold"])
    if not ctx.wallet_address:
        raise TriggerValidationError("wallet_address missing in context")
    balance = fetch_wallet_balance(ctx.wallet_address, params["token"], rpc_url=ctx.rpc_url)
    threshold = parse_numeric(params["threshold"], "threshold")
    return balance < threshold


def trigger_wallet_balance_above(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    ensure_token_field(params)
    validate_required_fields(params, ["token", "threshold"])
    if not ctx.wallet_address:
        raise TriggerValidationError("wallet_address missing in context")
    balance = fetch_wallet_balance(ctx.wallet_address, params["token"], rpc_url=ctx.rpc_url)
    threshold = parse_numeric(params["threshold"], "threshold")
    return balance > threshold


def trigger_incoming_transfer_detected(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    # Alias to balance_increased for now
    return trigger_balance_increased(params, ctx)


def trigger_balance_increased(params: Dict[str, Any], ctx: TriggerContext) -> tuple[bool, Dict[str, Any]]:
    ensure_token_field(params)
    token = params["token"]
    if not ctx.wallet_address:
         return False, {}
    
    current_balance = fetch_wallet_balance(ctx.wallet_address, token, rpc_url=ctx.rpc_url)
    
    # Memory key for this specific token
    mem_key = f"last_balance_{token.upper()}"
    last_balance = ctx.memory.get(mem_key)
    
    # Initialize if missing
    if last_balance is None:
        ctx.memory[mem_key] = current_balance
        return False, {}
        
    last_balance = float(last_balance)
    delta = current_balance - last_balance
    
    # Minimum threshold (default 0.000001)
    min_amount = parse_numeric(params.get("minimum_amount") or params.get("threshold") or 0.000001)
    
    triggered = delta >= min_amount
    
    # Update memory regardless
    ctx.memory[mem_key] = current_balance
    
    return triggered, {"delta": delta, "amount": delta, "new_balance": current_balance}


def trigger_outgoing_transfer_detected(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    ensure_token_field(params)
    validate_required_fields(params, ["token"])
    return False


def trigger_contract_event_emitted(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["contract_address", "event_signature"])
    validate_algorand_address(params["contract_address"], "contract_address")
    return check_contract_event_emitted(params["contract_address"], params["event_signature"])


def trigger_new_block(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    return True


def trigger_transaction_confirmed(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["tx_hash", "confirmation_count"])
    return check_transaction_confirmed(params["tx_hash"], int(params["confirmation_count"]))


def trigger_address_activity_detected(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["watched_address"])
    validate_algorand_address(params["watched_address"], "watched_address")
    return check_address_activity(params["watched_address"])


def trigger_gas_price_below(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["gas_threshold"])
    gas = fetch_gas_price_gwei(ctx.chain)
    threshold = parse_numeric(params["gas_threshold"], "gas_threshold")
    return gas < threshold


def trigger_gas_price_above(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["gas_threshold"])
    gas = fetch_gas_price_gwei(ctx.chain)
    threshold = parse_numeric(params["gas_threshold"], "gas_threshold")
    return gas > threshold


def trigger_network_status_changed(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["health_source"])
    previous = (ctx.memory or {}).get("previous_network_health")
    current = fetch_network_health(params["health_source"])
    return previous is not None and previous != current


def trigger_health_factor_below(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["protocol", "threshold"])
    value = fetch_protocol_metric(params["protocol"], "health_factor")
    threshold = parse_numeric(params["threshold"], "threshold")
    return value < threshold


def trigger_ltv_above(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["protocol", "threshold"])
    value = fetch_protocol_metric(params["protocol"], "ltv")
    threshold = parse_numeric(params["threshold"], "threshold")
    return value > threshold


def trigger_yield_rate_above(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["protocol", "threshold"])
    value = fetch_protocol_metric(params["protocol"], "apy")
    threshold = parse_numeric(params["threshold"], "threshold")
    return value > threshold


def trigger_yield_rate_below(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["protocol", "threshold"])
    value = fetch_protocol_metric(params["protocol"], "apy")
    threshold = parse_numeric(params["threshold"], "threshold")
    return value < threshold


def trigger_position_profit_above(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["position_reference", "threshold"])
    value = fetch_protocol_metric(params["position_reference"], "profit")
    threshold = parse_numeric(params["threshold"], "threshold")
    return value > threshold


def trigger_position_loss_below(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["position_reference", "threshold"])
    value = fetch_protocol_metric(params["position_reference"], "loss")
    threshold = parse_numeric(params["threshold"], "threshold")
    return value < -abs(threshold)


def trigger_liquidity_range_out_of_bounds(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["pool", "position_id"])
    return False


def trigger_floor_price_below(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["collection", "threshold", "floor_price_source"])
    price = fetch_nft_floor_price(params["collection"], params["floor_price_source"])
    threshold = parse_numeric(params["threshold"], "threshold")
    return price < threshold


def trigger_floor_price_above(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["collection", "threshold", "floor_price_source"])
    price = fetch_nft_floor_price(params["collection"], params["floor_price_source"])
    threshold = parse_numeric(params["threshold"], "threshold")
    return price > threshold


def trigger_mint_live(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["contract_address"])
    validate_algorand_address(params["contract_address"], "contract_address")
    return False


def trigger_reveal_happened(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["collection"])
    return False


def trigger_listing_price_below(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["collection", "marketplace", "threshold"])
    return False


def trigger_trait_match_found(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["collection", "trait_filter", "threshold"])
    return False


def trigger_faucet_claim_interval(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["interval", "faucet_url", "claim_method"])
    validate_interval(params["interval"], "interval")
    validate_url(params["faucet_url"], "faucet_url")
    return True


def trigger_test_balance_low_then_claim_faucet(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["threshold", "faucet_url", "claim_method"])
    validate_url(params["faucet_url"], "faucet_url")
    if not ctx.wallet_address:
        raise TriggerValidationError("wallet_address missing in context")
    balance = fetch_wallet_balance(ctx.wallet_address, "ALGO")
    threshold = parse_numeric(params["threshold"], "threshold")
    return balance < threshold


def trigger_webhook_received(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["webhook_name"])
    return False


def trigger_api_value_condition(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["api_url", "response_field", "operator", "threshold"])
    validate_url(params["api_url"], "api_url")
    value = fetch_api_value(params["api_url"], params["response_field"])
    threshold = params["threshold"]
    op = params["operator"]

    if op == "eq":
        return str(value) == str(threshold)
    if op == "neq":
        return str(value) != str(threshold)

    num_value = parse_numeric(value, "api response value")
    num_threshold = parse_numeric(threshold, "threshold")

    if op == "gt":
        return num_value > num_threshold
    if op == "gte":
        return num_value >= num_threshold
    if op == "lt":
        return num_value < num_threshold
    if op == "lte":
        return num_value <= num_threshold

    raise TriggerValidationError(f"Unsupported operator: {op}")


def trigger_rss_or_feed_update(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["feed_url"])
    validate_url(params["feed_url"], "feed_url")
    return check_feed_updated(params["feed_url"])


def trigger_manual_approval_received(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["approver_reference"])
    return check_manual_approval(params["approver_reference"])


def trigger_multi_approval_threshold_met(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["approver_references", "threshold"])
    return check_multi_approval(params["approver_references"], parse_numeric(params["threshold"], "threshold"))


def trigger_all_conditions_true(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["conditions"])
    conditions = params["conditions"]
    if not isinstance(conditions, list):
        raise TriggerValidationError("conditions must be a list")
    engine = TriggerEngine()
    results = [engine.evaluate(cond["type"], cond.get("params", {}), ctx) for cond in conditions]
    return all(r[0] for r in results)


def trigger_any_condition_true(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["conditions"])
    conditions = params["conditions"]
    if not isinstance(conditions, list):
        raise TriggerValidationError("conditions must be a list")
    engine = TriggerEngine()
    results = [engine.evaluate(cond["type"], cond.get("params", {}), ctx) for cond in conditions]
    return any(r[0] for r in results)


def trigger_condition_true_for_duration(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["condition", "duration"])
    # actual persistent evaluation should use run history/state
    engine = TriggerEngine()
    condition = params["condition"]
    res, _ = engine.evaluate(condition["type"], condition.get("params", {}), ctx)
    return res


def trigger_retry_until_success_with_timeout(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["retry_interval", "timeout"])
    return True


def trigger_sequence_after_previous_step(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["previous_step_reference"])
    return bool((ctx.memory or {}).get("completed_steps", {}).get(params["previous_step_reference"], False))


def trigger_automation_started(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    return True


def trigger_automation_completed(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    return True


def trigger_automation_failed(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    return True


def trigger_step_started(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["step_name"])
    return True


def trigger_step_completed(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["step_name"])
    return True


def trigger_step_failed(params: Dict[str, Any], ctx: TriggerContext) -> bool:
    validate_required_fields(params, ["step_name"])
    return True


# =========================================================
# Registry
# =========================================================

TRIGGER_REGISTRY: Dict[str, Callable[[Dict[str, Any], TriggerContext], bool]] = {
    "run_once_at_datetime": trigger_run_once_at_datetime,
    "run_daily_at_time": trigger_run_daily_at_time,
    "run_weekly_on_day_time": trigger_run_weekly_on_day_time,
    "run_monthly_on_date_time": trigger_run_monthly_on_date_time,
    "run_every_interval": trigger_run_every_interval,
    "run_between_time_window": trigger_run_between_time_window,
    "run_on_cron_expression": trigger_run_on_cron_expression,

    "token_price_below": trigger_token_price_below,
    "token_price_above": trigger_token_price_above,
    "token_price_crosses_range": trigger_token_price_crosses_range,
    "percent_price_change_over_period": trigger_percent_price_change_over_period,

    "wallet_balance_below": trigger_wallet_balance_below,
    "wallet_balance_above": trigger_wallet_balance_above,
    "incoming_transfer_detected": trigger_incoming_transfer_detected,
    "outgoing_transfer_detected": trigger_outgoing_transfer_detected,

    "contract_event_emitted": trigger_contract_event_emitted,
    "new_block": trigger_new_block,
    "transaction_confirmed": trigger_transaction_confirmed,
    "address_activity_detected": trigger_address_activity_detected,

    "gas_price_below": trigger_gas_price_below,
    "gas_price_above": trigger_gas_price_above,
    "network_status_changed": trigger_network_status_changed,

    "health_factor_below": trigger_health_factor_below,
    "ltv_above": trigger_ltv_above,
    "yield_rate_above": trigger_yield_rate_above,
    "yield_rate_below": trigger_yield_rate_below,
    "position_profit_above": trigger_position_profit_above,
    "position_loss_below": trigger_position_loss_below,
    "liquidity_range_out_of_bounds": trigger_liquidity_range_out_of_bounds,

    "floor_price_below": trigger_floor_price_below,
    "floor_price_above": trigger_floor_price_above,
    "mint_live": trigger_mint_live,
    "reveal_happened": trigger_reveal_happened,
    "listing_price_below": trigger_listing_price_below,
    "trait_match_found": trigger_trait_match_found,

    "faucet_claim_interval": trigger_faucet_claim_interval,
    "test_balance_low_then_claim_faucet": trigger_test_balance_low_then_claim_faucet,

    "webhook_received": trigger_webhook_received,
    "api_value_condition": trigger_api_value_condition,
    "rss_or_feed_update": trigger_rss_or_feed_update,

    "manual_approval_received": trigger_manual_approval_received,
    "multi_approval_threshold_met": trigger_multi_approval_threshold_met,

    "all_conditions_true": trigger_all_conditions_true,
    "any_condition_true": trigger_any_condition_true,
    "condition_true_for_duration": trigger_condition_true_for_duration,
    "retry_until_success_with_timeout": trigger_retry_until_success_with_timeout,
    "sequence_after_previous_step": trigger_sequence_after_previous_step,

    "automation_started": trigger_automation_started,
    "automation_completed": trigger_automation_completed,
    "automation_failed": trigger_automation_failed,
    "step_started": trigger_step_started,
    "step_completed": trigger_step_completed,
    "step_failed": trigger_step_failed,
    "balance_increased": trigger_balance_increased,
}


class TriggerEngine:
    def __init__(self, registry: Optional[Dict[str, Callable[[Dict[str, Any], TriggerContext], bool]]] = None):
        self.registry = registry or TRIGGER_REGISTRY

    def evaluate(self, trigger_type: str, params: Dict[str, Any], ctx: Optional[TriggerContext] = None) -> tuple[bool, Dict[str, Any]]:
        ctx = ctx or TriggerContext()
        handler = self.registry.get(trigger_type)
        if not handler:
            raise UnsupportedTriggerError(f"Unsupported trigger: {trigger_type}")
        
        result = handler(params, ctx)
        if isinstance(result, bool):
            return result, {}
        return result


# =========================================================
# Example usage
# =========================================================

if __name__ == "__main__":
    engine = TriggerEngine()

    context = TriggerContext(
        chain="algorand-testnet",
        rpc_url="https://testnet-api.algonode.cloud",
        wallet_address="TESTADDRESS" + "A" * 46,  # Dummy 58-char address
    )

    result, data = engine.evaluate("run_every_interval", {"interval": "30s"}, context)
    print(f"Trigger fired: {result}, data: {data}")