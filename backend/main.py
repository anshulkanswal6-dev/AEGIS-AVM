from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List, Union
from agent import GenAIAgent
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import traceback

from contextlib import asynccontextmanager
from fastapi.exceptions import RequestValidationError
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- Mount Runtime API (additive — no existing routes changed) ---
from automations_api import router as automations_router, startup_worker, shutdown_worker
from integrations.telegram.router import router as telegram_router
from worker import get_worker
from scheduler import get_scheduler
from config import SYSTEM_STATUS, validate_config

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Unified Startup Orchestration
    print("\n" + "="*50)
    print(" [BOOT] AEGIS PLATFORM STARTING...")
    print("="*50)
    
    # 1. Inspect Environment
    validate_config()

    # 2. Start Subsystems (Safe Wrap)
    try:
        await startup_worker()
        
        # Verify subsystems
        w = get_worker()
        s = get_scheduler()
        
        SYSTEM_STATUS["worker"] = "active" if w.is_running else "failed"
        SYSTEM_STATUS["scheduler"] = "running" if s.running else "failed"
        
        print(f" (OK) API Server: Online")
        print(f" (OK) Worker Engine: {SYSTEM_STATUS['worker']}")
        print(f" (OK) Scheduler: {SYSTEM_STATUS['scheduler']}")
        print(f" (OK) Telegram Poller: {SYSTEM_STATUS['telegram']}")
    except Exception as e:
        print(f" (ERROR) CRITICAL SUBSYSTEM FAILURE: {e}")
        traceback.print_exc()
        SYSTEM_STATUS["worker"] = "error"

    print("="*50 + "\n")
    
    yield
    await shutdown_worker()

app = FastAPI(lifespan=lifespan)
app.include_router(automations_router)
app.include_router(telegram_router, prefix="/api")

# Enable CORS for frontend
_raw_origin = os.getenv("CLIENT_ORIGIN", "").strip()

if _raw_origin and _raw_origin != "*":
    _allowed_origins = [o.strip().rstrip("/") for o in _raw_origin.split(",") if o.strip()]
    _allowed_origins += ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]
    _use_credentials = True
else:
    _allowed_origins = ["*"]
    _use_credentials = False

print(f"[CORS] Allowed origins: {_allowed_origins}, credentials: {_use_credentials}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=_use_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Agent
import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
catalogue_path = os.path.join(BASE_DIR, "catalogue.json")
action_catalogue_path = os.path.join(BASE_DIR, "action_catalogue.json")
agent = GenAIAgent(catalogue_path, action_catalogue_path)

# --- Global Error Handlers ---
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"VALIDATION ERROR: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"CRITICAL ERROR: {str(exc)}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": traceback.format_exc()},
    )

@app.get("/health")
async def health_check():
    """Consolidated health check with live system status."""
    try:
        w = get_worker()
        s = get_scheduler()
        
        # Update system status with reality check
        SYSTEM_STATUS["worker"] = "active" if w.is_running else "stopped"
        SYSTEM_STATUS["scheduler"] = "running" if s.running else "stopped"
    except:
        pass

    return {
        "status": "online",
        "timestamp": os.getenv("DEPLOYMENT_TIMESTAMP", "unknown"),
        "systems": SYSTEM_STATUS
    }

# --- Request Models (Synced with agentService.ts) ---

class ChatRequest(BaseModel):
    user_message: str
    session_id: Optional[str] = None
    project_name: Optional[str] = None
    wallet_address: Optional[str] = None
    known_fields: Dict[str, Any] = Field(default_factory=dict)
    planning_model_id: str = os.getenv("DEFAULT_PLANNING_MODEL", "gemini_flash")
    codegen_model_id: str = os.getenv("DEFAULT_CODEGEN_MODEL", "gemini_flash")

class ContinueRequest(BaseModel):
    session_id: str
    wallet_address: Optional[str] = None
    project_name: Optional[str] = None
    fields: Dict[str, Any] = Field(default_factory=dict)
    planning_model_id: str = os.getenv("DEFAULT_PLANNING_MODEL", "gemini_flash")


class ApproveRequest(BaseModel):
    session_id: str
    approved: bool
    feedback: Optional[str] = None

# --- Endpoints ---

@app.get("/models")
async def get_models():
    return agent.list_available_models()

@app.post("/chat")
async def chat(req: ChatRequest):
    return agent.chat(
        user_message=req.user_message,
        session_id=req.session_id,
        wallet_address=req.wallet_address,
        known_fields=req.known_fields,
        planning_model_id=req.planning_model_id,
        codegen_model_id=req.codegen_model_id,
        project_name=req.project_name
    )

@app.post("/continue")
async def continue_chat(req: ContinueRequest):
    return agent.continue_chat(
        session_id=req.session_id, 
        fields=req.fields,
        wallet_address=req.wallet_address,
        planning_model_id=req.planning_model_id,
        project_name=req.project_name
    )

@app.post("/approve")
async def approve(req: ApproveRequest):
    return agent.approve_plan(session_id=req.session_id, approved=req.approved, feedback=req.feedback)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
