# Heat Decision Agent

Autonomous AI agent that answers natural-language heat-safety questions
("Is it safe to hold an outdoor event in Anna Nagar tomorrow afternoon?")
by deciding for itself which FortyGuard Temperature API tools to call,
reasoning over the results, and returning a structured Safe/Caution/Unsafe
decision with an explanation.

Built for FortyGuard Hackathon — Track 06: Agentic AI.

## Problem

Generic weather forecasts miss street-level heat reality. A shaded park and
an exposed bus stop 200m apart can differ by several degrees. Schools, event
organizers, delivery companies, and city agencies either react too late or
apply blanket rules that ignore specific locations, times, and exposure
duration.

## Solution

An LLM-driven agent (Claude, via tool-calling) that:

1. Receives a free-text question.
2. Decides which of its tools to call — `get_current_heat`,
   `get_exceedance`, `get_forecast`, `compare_route`, `predict_safe_duration`, 
   and `predict_risk` — and with what parameters.
3. Feeds tool results back to itself and reasons against documented
   heat-safety thresholds.
4. Returns `{decision, reasoning, data_used}` plus a full trace of every
   tool call made, so the trace itself is visible evidence of genuine
   agentic behavior rather than a scripted pipeline.

This repo currently ships **Phases 1 through 4** end-to-end (core decision agent, routing, background alerts, ML risk classifier) with Phase 5 remaining as a UI stretch goal.

## Architecture (text diagram)

```
                 ┌────────────────────┐
  User question  │                    │
 ───────────────►│   FastAPI  /ask    │
                 │                    │
                 └─────────┬──────────┘
                           │
                           ▼
                 ┌────────────────────┐
                 │   Agent Loop        │  agent/loop.py
                 │  (Claude + tools)   │
                 └─────────┬──────────┘
                           │ tool_use
                           ▼
                 ┌────────────────────┐
                 │   Tool Dispatcher   │  agent/tools.py
                 └─────────┬──────────┘
                           │
                           ▼
                 ┌────────────────────┐
                 │ fortyguard_client.py│──► FortyGuard Temperature API
                 │  snapshot/exceedance│    (snapshot, exceedance, forecast)
                 │  /forecast          │
                 └─────────┬──────────┘
                           │ tool_result
                           ▼
                 ┌────────────────────┐
                 │   Agent Loop        │  reasons again, may call more
                 │  (Claude + tools)   │  tools, then emits final decision
                 └─────────┬──────────┘
                           │
                           ▼
                 ┌────────────────────┐
                 │ Structured response │  {decision, reasoning,
                 │ + tool-call trace   │   data_used, trace[]}
                 └────────────────────┘
```

## Project layout

```
heat-decision-agent/
├── app/
│   ├── main.py                # FastAPI app, POST /ask
│   ├── fortyguard_client.py   # FortyGuard API wrapper (async submit/poll aware)
│   ├── agent/
│   │   ├── tools.py           # tool schemas + dispatcher
│   │   ├── loop.py            # Claude tool-calling agent loop
│   │   └── thresholds.py      # documented heat-safety bands
│   ├── models.py               # Pydantic request/response models
│   └── config.py               # env/config loading
├── scripts/
│   └── test_agent.py          # 4 sample questions, run against /ask
├── frontend/
│   └── index.html              # minimal chat-style UI (Phase 5 starter)
├── requirements.txt
├── .env.example
└── README.md
```

## Heat-safety thresholds (documented, editable)

Defined in `app/agent/thresholds.py`. These are **placeholder** bands based
on commonly cited heat-index guidance (adapt to WHO/IMD/local advisory
numbers before using in production):

| Band     | Heat Index (°C) | Exceedance guidance                          |
|----------|------------------|-----------------------------------------------|
| Safe     | < 35             | No sustained exceedance above 35°C            |
| Caution  | 35 – 40          | Exceeds 35°C for < 2 continuous hours         |
| Unsafe   | > 40             | Exceeds 40°C at all, or >35°C for 2+ hours    |

The agent is instructed to cite which band + which data point drove its
decision, not just assert a verdict.

## Setup

```bash
cd heat-decision-agent
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# fill in ANTHROPIC_API_KEY and FORTYGUARD_API_KEY / FORTYGUARD_BASE_URL in .env
```

### Run the API

```bash
uvicorn app.main:app --reload --port 8000
```

### Ask it something

```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Is it safe to hold an outdoor event in Anna Nagar tomorrow afternoon?"}'
```

### Run the sample question suite

```bash
python scripts/test_agent.py
```

### Background Monitoring

**Alert monitoring runs automatically on server startup.** It periodically checks the heat conditions for locations listed in `app/tracked_locations.json` in the background and issues console and/or webhook alerts when conditions become unsafe.

### Frontend

Open `frontend/index.html` directly in a browser (it calls
`http://localhost:8000/ask`), or serve it with any static file server.

## Data Collection

All training data is collected live from the FortyGuard API via scheduled polling — no synthetic or simulated values. 
- **Collection duration**: Currently polling every 30 minutes in the background.
- **Total row count**: Pending (waiting for valid API credentials in `.env` to accumulate clean rows).
## Route Comparison

The `compare_route` tool allows the agent to find the coolest or safest path between two coordinates.
It operates independently of the ML pipeline:
1. Calls the public OSRM API to fetch candidate driving routes.
2. Samples points evenly along each candidate route.
3. Calls the FortyGuard API (`get_current_heat`) to score heat exposure at each sampled point.
4. Aggregates the temperature metrics and ranks the routes, allowing the agent to recommend the optimal path.

## How the Risk Model Works (Phase 4)

Instead of a black-box prediction, the agent utilizes an **Explainable RandomForestClassifier** (`predict_risk`).
- **SHAP Integration**: A TreeExplainer objectively quantifies how much each underlying FortyGuard feature (e.g., heat index, exceedance duration) drove the model's confidence.
- **Model Calibration**: Output confidence scores are verified with Brier score and a calibration curve (`models/calibration_curve.png`).
- **Tool Output**: The exact SHAP results (Top 3) and direct temperature threshold comparisons are surfaced for the agent. The agent then dynamically reasons over this structured data to explain its logic out loud to the user (e.g. *Unsafe (81% confidence) — mainly driven by the exceedance duration*).

## FortyGuard API Integration Status

The `app/fortyguard_client.py` client stricly uses live API endpoints (e.g. `/v1/env_params` and `/v1/status/{activity_id}` polling) with the required `api-key` header. **It no longer uses placeholder data on failure.** If the API fails or is unavailable, the client raises a clear `FortyGuardAPIError` that correctly surfaces to the agent as "Data unavailable".

## What's implemented vs. stretch

- [x] Phase 1 — Core decision agent, `/ask` endpoint, tool-calling loop,
      structured decision + trace, 4 sample test questions.
- [x] Phase 2 — `compare_route` tool (OSRM sampling + per-point heat scoring).
      Implemented and wired into the agent's tool loop.
- [x] Phase 3 — Background scheduler + alert firing. Automatically monitors `app/tracked_locations.json` and fires alerts on unsafe conditions.
- [x] Phase 4 — ML risk classifier (`predict_risk` tool). Trained from FortyGuard features to predict heat risk mathematically.
- [ ] Phase 5 — Polished frontend/map, demo video. `frontend/index.html`
      is a minimal working starting point, not the polished version.

## Track fit

- **Track 06 (Agentic AI)** — primary: the LLM chooses tools and
  parameters per question rather than a fixed pipeline; trace is exposed
  in the API response for judges to inspect.
- **Track 01 crossover** — Phase 2 route comparison.
- **Track 05 crossover** — Phase 4 ML risk classifier.
