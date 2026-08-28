"""
Runs a handful of sample questions against the running FastAPI /ask
endpoint and prints the decision + reasoning + tool trace for each.

Usage:
    uvicorn app.main:app --reload --port 8000   # in one terminal
    python scripts/test_agent.py                # in another
"""
import json

import httpx

BASE_URL = "http://localhost:8000"

SAMPLE_QUESTIONS = [
    "Is it hot right now in Anna Nagar?",
    "Is it safe to hold an outdoor event in Anna Nagar tomorrow afternoon (2pm-6pm)?",
    "Should the school in T Nagar cancel outdoor sports this afternoon?",
    "Which is the coolest way to walk from Adyar to Velachery?",  # exercises the Phase 2 stub path
]


def main():
    with httpx.Client(timeout=60.0) as client:
        health = client.get(f"{BASE_URL}/health")
        print(f"Health check: {health.status_code} {health.json()}\n")

        for i, q in enumerate(SAMPLE_QUESTIONS, start=1):
            print(f"{'=' * 70}\nQ{i}: {q}\n{'=' * 70}")
            resp = client.post(f"{BASE_URL}/ask", json={"question": q})
            if resp.status_code != 200:
                print(f"  ERROR {resp.status_code}: {resp.text}\n")
                continue

            data = resp.json()
            print(f"Decision : {data['decision']}")
            print(f"Reasoning: {data['reasoning']}")
            print(f"Data used: {json.dumps(data['data_used'], indent=2)}")
            print("Tool trace:")
            for t in data["trace"]:
                status = "ERROR" if t.get("error") else "ok"
                print(f"  [{t['step']}] {t['tool_name']}({t['tool_input']}) -> {status}")
            print()


if __name__ == "__main__":
    main()
