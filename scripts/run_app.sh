#!/usr/bin/env bash
# ==============================================================================
# PULSE Clinical Decision Support System (CDSS)
# One-Command Local Startup Script
# Nature Computational Science (2026) Architecture
# Original Author: Wei Wu (@ww20hust), PKU/HUST
# ==============================================================================

set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

echo "=================================================================="
echo "  PULSE Clinical Decision Support System (CDSS) Launcher"
echo "  Nature Computational Science (2026)"
echo "=================================================================="

# Check Python environment
if [ -d "$REPO_DIR/.venv" ]; then
    PYTHON_BIN="$REPO_DIR/.venv/bin/python"
else
    PYTHON_BIN="python3"
fi

echo "[1/3] Checking and initializing database..."
$PYTHON_BIN -c "
from server.db.session import init_db, SessionLocal
from server.demo_data.seed_data import seed_database
init_db()
with SessionLocal() as db:
    seed_database(db, overwrite=False)
print('Database ready with preloaded clinical cohorts.')
"

# Cleanup background processes on exit
cleanup() {
    echo ""
    echo "Shutting down PULSE CDSS services..."
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    echo "Services stopped cleanly."
}
trap cleanup EXIT INT TERM

echo "[2/3] Starting FastAPI Backend on http://localhost:8000 ..."
$PYTHON_BIN -m uvicorn server.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend health
echo "Waiting for backend engine to report healthy..."
for i in {1..20}; do
    if curl -s http://localhost:8000/health | grep -q "healthy"; then
        echo "Backend engine is ONLINE."
        break
    fi
    sleep 1
done

echo "[3/3] Starting Next.js / shadcn UI Frontend on http://localhost:3000 ..."
cd "$REPO_DIR/frontend"
npm run dev -- -p 3000 &
FRONTEND_PID=$!

echo ""
echo "=================================================================="
echo "  PULSE CDSS is running!"
echo "  • Clinical Web UI:      http://localhost:3000"
echo "  • Swagger REST API:     http://localhost:8000/docs"
echo "  • Health Endpoint:      http://localhost:8000/health"
echo "=================================================================="
echo "Press Ctrl+C to stop all services."

wait
