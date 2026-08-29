import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from app.agent.loop import run_agent
from app.alerts_scheduler import get_status, run_forever
from app.config import settings
from app.models import AskRequest, AskResponse

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="HeatIQ Decision Agent",
    description="Autonomous agent that answers heat-safety questions using real FortyGuard data.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    asyncio.create_task(run_forever())


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "groq_configured": bool(settings.groq_api_key),
        "fortyguard_configured": bool(settings.fortyguard_api_key),
    }


@app.post("/ask", response_model=AskResponse)
async def ask(req: AskRequest, request: Request) -> AskResponse:
    """Answer a heat-safety question using the autonomous agent.

    API key overrides can be supplied via request headers:
      X-Groq-Api-Key       — overrides GROQ_API_KEY from .env
      X-FortyGuard-Api-Key — overrides FORTYGUARD_API_KEY from .env

    This allows the frontend to inject user-configured keys without
    requiring a server restart or .env edit.
    """
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="question must not be empty")

    # Extract optional per-request API key overrides from headers
    groq_key_override: Optional[str] = request.headers.get("X-Groq-Api-Key") or None
    fg_key_override: Optional[str] = request.headers.get("X-FortyGuard-Api-Key") or None

    try:
        return await run_agent(
            req.question,
            groq_api_key=groq_key_override,
            fortyguard_api_key=fg_key_override,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Agent failed: {e}") from e


@app.get("/alerts/status")
async def alerts_status():
    s = get_status()
    last = s.get("last_check")
    if last:
        delta = (datetime.now(timezone.utc) - datetime.fromisoformat(last)).total_seconds()
        minutes_ago = round(delta / 60, 1)
    else:
        minutes_ago = None
    return {
        "last_check": last,
        "minutes_ago": minutes_ago,
        "tracked_count": s.get("tracked_count", 0),
        "unsafe_locations": s.get("unsafe_locations", []),
    }
