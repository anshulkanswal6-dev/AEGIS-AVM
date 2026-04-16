# AEGIS - Agentic Execution Layer for On-Chain Jobs

AEGIS is an autonomous execution environment that simplifies on-chain interactions through advanced AI agents. Convert natural language intent into executable blockchain logic, monitored and executed autonomously.

## Project Structure

```
AEGIS/
├── backend/          # Python FastAPI services (Deploy on Render)
│   ├── main.py      # Entry point
│   ├── agent.py     # AI agent logic
│   ├── Procfile     # Render deployment config
│   └── requirements.txt
├── frontend/         # React TypeScript frontend (Deploy on Vercel)
│   ├── src/
│   ├── package.json
│   └── vercel.json
├── agent_wallet_app.py         # Algorand AVM Logic
├── agent_wallet_factory_app.py # Factory Logic
└── README.md
```

## Setup Instructions

### Backend (Render)
1. Set the Root Directory to `backend`.
2. Environment: `Python 3.11`.
3. Build Command: `pip install -r requirements.txt`.
4. Start Command: `gunicorn main:app --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`.
5. Configure Environment Variables (see `backend/.env.example`).

### Frontend (Vercel)
1. Set the Root Directory to `frontend`.
2. Framework Preset: `Vite`.
3. Configure Environment Variables (see `frontend/.env.example`):
   - `VITE_API_URL`: Your Render backend URL.
   - `VITE_SUPABASE_URL`: Your Supabase URL.
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Key.

## Core Features
- **Intent-Based Execution**: Simple prompts become autonomous agents.
- **Agent Wallet Architecture**: Dedicated non-custodial wallets per automation.
- **Continuous Monitoring**: Real-time trigger evaluation and execution.
- **Cross-Platform Control**: Manage agents via dashboard or Telegram.

## License
© 2026 AEGIS Infrastructure.
