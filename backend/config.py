"""
AEGIS Runtime Configuration
Central config for the local runtime environment.
All values are designed to be overridden by environment variables later.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env
load_dotenv()

# =========================================================
# Platform / Admin Credentials (INTERNAL ONLY)
# =========================================================

# --- AI Engine ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
DEFAULT_PLANNING_MODEL = os.getenv("DEFAULT_PLANNING_MODEL", "gemini_flash")
DEFAULT_CODEGEN_MODEL = os.getenv("DEFAULT_CODEGEN_MODEL", "gemini_flash")

# --- Notifications (Infrastructure) ---
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")

# Legacy SMTP (to be deprecated)
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")

# --- Algorand (Blockchain Infrastructure) ---
ALGOD_URL = os.getenv("ALGOD_URL", "https://testnet-api.algonode.cloud")
ALGOD_TOKEN = os.getenv("ALGOD_TOKEN", "")
INDEXER_URL = os.getenv("INDEXER_URL", "https://testnet-idx.algonode.cloud")
INDEXER_TOKEN = os.getenv("INDEXER_TOKEN", "")
ALGORAND_NETWORK = os.getenv("ALGORAND_NETWORK", "testnet")

# --- Smart Contracts / Apps ---
FACTORY_APP_ID = int(os.getenv("FACTORY_APP_ID", "0"))
FACTORY_APP_ADDRESS = os.getenv("FACTORY_APP_ADDRESS", "")

# --- Execution Node (Executor Wallet) ---
# This mnemonic is used by the backend worker to sign transactions
ALGORAND_EXECUTOR_MNEMONIC = os.getenv("ALGORAND_EXECUTOR_MNEMONIC")
ALGORAND_EXECUTOR_ADDRESS = os.getenv("ALGORAND_EXECUTOR_ADDRESS")
EXECUTOR_PRIVATE_KEY = ALGORAND_EXECUTOR_MNEMONIC # Alias for backward compatibility

# Initialize Algorand Clients
from algosdk.v2client import algod, indexer
algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_URL)
indexer_client = indexer.IndexerClient(INDEXER_TOKEN, INDEXER_URL)

# --- Storage (Supabase Admin) ---
# Options: "memory", "json_file", "supabase"
STORE_BACKEND = os.getenv("STORE_BACKEND") or "supabase"
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "") # Should be Service Role Key

# --- Telegram Bot ---
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_BOT_USERNAME = os.getenv("TELEGRAM_BOT_USERNAME", "Aegis_telebot")
TELEGRAM_WEBHOOK_URL = os.getenv("TELEGRAM_WEBHOOK_URL")
TELEGRAM_WEBHOOK_SECRET = os.getenv("TELEGRAM_WEBHOOK_SECRET")

# =========================================================
# Runtime / Scheduling Defaults
# =========================================================
CHAIN_NAME = "Algorand Testnet"
CURRENCY_SYMBOL = "ALGO"
RPC_URL = ALGOD_URL

DEFAULT_CHAIN = CHAIN_NAME
DEFAULT_RPC_URL = ALGOD_URL
DEFAULT_SCHEDULE_INTERVAL_SECONDS = int(os.getenv("DEFAULT_SCHEDULE_INTERVAL_SECONDS", "60"))
POLLING_INTERVAL_SECONDS = int(os.getenv("POLLING_INTERVAL_SECONDS", "30"))
WORKER_AUTOSTART = os.getenv("WORKER_AUTOSTART", "true").lower() in ("true", "1", "yes")

# =========================================================
# Local JSON File Store Paths (fallback when STORE_BACKEND=json_file)
# =========================================================
RUNTIME_DATA_DIR = Path(os.getenv("RUNTIME_DATA_DIR", Path(__file__).parent / "runtime_data"))
STORE_JSON_PATH = RUNTIME_DATA_DIR / "automations.json"
LOGS_JSON_PATH = RUNTIME_DATA_DIR / "logs.json"
TERMINAL_LOGS_JSON_PATH = RUNTIME_DATA_DIR / "terminal_logs.json"
MAX_LOGS_PER_AUTOMATION = int(os.getenv("MAX_LOGS_PER_AUTOMATION", "200"))

# =========================================================
# System Status Tracking
# =========================================================
SYSTEM_STATUS = {
    "api": "active",
    "worker": "pending",
    "scheduler": "pending",
    "telegram": "pending",
    "storage": STORE_BACKEND,
    "env_vars": {}
}

def check_env_vars():
    """Build a map of critical environment variables for health checks."""
    vars_to_check = {
        "GEMINI_API_KEY": bool(GEMINI_API_KEY),
        "TELEGRAM_BOT_TOKEN": bool(TELEGRAM_BOT_TOKEN),
        "SUPABASE_KEY": bool(SUPABASE_KEY),
        "ALGOD_URL": bool(ALGOD_URL),
        "FACTORY_APP_ID": bool(FACTORY_APP_ID > 0),
        "ALGORAND_EXECUTOR": bool(ALGORAND_EXECUTOR_MNEMONIC),
    }
    SYSTEM_STATUS["env_vars"] = vars_to_check
    return vars_to_check

# --- Feature Flags (Computed) ---
check_env_vars()

# Subsystem Status Flags
EMAIL_CONFIG_READY = bool(RESEND_API_KEY)
TELEGRAM_CONFIG_READY = bool(TELEGRAM_BOT_TOKEN)
SUPABASE_CONFIG_READY = bool(SUPABASE_URL and SUPABASE_KEY)
BLOCKCHAIN_CONFIG_READY = bool(ALGORAND_EXECUTOR_MNEMONIC and ALGOD_URL)

def get_system_report():
    """Build a report of the current system status for API/UI visibility."""
    return {
        "identity": {
            "name": "Algorand Testnet",
            "symbol": "ALGO",
            "chain_id": 0
        },
        "features": {
            "email": EMAIL_CONFIG_READY,
            "telegram": TELEGRAM_CONFIG_READY,
            "storage": STORE_BACKEND if SUPABASE_CONFIG_READY else "memory",
            "execution": BLOCKCHAIN_CONFIG_READY
        },
        "health": "healthy" if (SUPABASE_CONFIG_READY and BLOCKCHAIN_CONFIG_READY) else "degraded"
    }

def validate_config():
    """Print a startup report and return missing critical vars."""
    env = SYSTEM_STATUS["env_vars"]
    report = []
    
    print("\n" + "="*40)
    print(" AEGIS SYSTEM STARTUP ".center(40, "="))
    print("="*40)
    
    # Infrastructure
    infra = [
        ("Gemini AI", bool(GEMINI_API_KEY)),
        ("Supabase", SUPABASE_CONFIG_READY),
        ("Blockchain", BLOCKCHAIN_CONFIG_READY),
        ("Telegram", TELEGRAM_CONFIG_READY),
        ("Resend/Email", EMAIL_CONFIG_READY),
    ]
    
    for label, active in infra:
        status = "[READY]" if active else "[DISABLED / MISSING]"
        print(f"  {label.ljust(15)}: {status}")
        if not active:
            report.append(label)
            
    print("="*40)
    print(f" [Network]  Algorand {ALGORAND_NETWORK}")
    print(f" [Algod]    {ALGOD_URL}")
    print(f" [Factory]  App ID {FACTORY_APP_ID}")
    print("="*40 + "\n")
    
    return report

# Perform initial check
validate_config()
