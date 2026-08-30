#!/usr/bin/env bash
# start.sh — Start both HeatIQ services together for local development/demo
set -e
cd "$(dirname "$0")"

echo "========================================"
echo " HeatIQ — Starting both services"
echo "========================================"
echo ""
echo "Backend  → http://127.0.0.1:8000"
echo "Frontend → http://localhost:3000"
echo ""

# Activate Python virtualenv if present
if [ -d ".venv" ]; then
  echo "Activating .venv..."
  source .venv/bin/activate
fi

# Start FastAPI backend in background
echo "Starting FastAPI backend..."
uvicorn app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

# Start React/Express frontend in background
echo "Starting React frontend..."
npm run dev --prefix frontend &
FRONTEND_PID=$!

echo ""
echo "Both services started."
echo "  Backend PID:  $BACKEND_PID"
echo "  Frontend PID: $FRONTEND_PID"
echo ""
echo "Press Ctrl+C to stop both."

# Cleanly kill both on Ctrl+C
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait
