from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.agent.loop import run_agent
from app.models import AskRequest, AskResponse

app = FastAPI(
    title="Heat Decision Agent",
    description=(
        "Autonomous agent that answers heat-safety questions by deciding "
        "which FortyGuard Temperature API tools to call and reasoning "
        "over the results."
    ),
    version="0.1.0",
)

# Permissive CORS for the demo frontend (frontend/index.html served
# statically or opened directly as a file).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/ask", response_model=AskResponse)
async def ask(req: AskRequest) -> AskResponse:
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="question must not be empty")
    try:
        return await run_agent(req.question)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Agent failed: {e}") from e
