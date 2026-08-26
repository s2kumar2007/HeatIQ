import asyncio
import logging
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.agent.loop import run_agent
from app.alerts_scheduler import get_status, run_forever
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
    return {"status": "ok"}


@app.post("/ask", response_model=AskResponse)
async def ask(req: AskRequest) -> AskResponse:
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="question must not be empty")
    try:
        return await run_agent(req.question)
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
