#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================="
echo "         Starting LogMyTime App          "
echo "========================================="

# Trap INT and TERM signals to kill background child processes
cleanup() {
    echo ""
    echo "Shutting down LogMyTime..."
    kill $(jobs -p) 2>/dev/null || true
    wait $(jobs -p) 2>/dev/null || true
    echo "LogMyTime stopped."
}
trap cleanup SIGINT SIGTERM EXIT

echo "Starting FastAPI Backend (Port 8000)..."
(cd "$DIR/backend" && "$DIR/venv/bin/python" -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload) &

echo "Starting Vite Frontend (Port 5173)..."
(cd "$DIR/frontend" && npm run dev) &

echo ""
echo "LogMyTime is running!"
echo "Backend API:  http://127.0.0.1:8000"
echo "Frontend SPA: http://localhost:5173"
echo "Press Ctrl+C to stop both servers."
echo ""

wait
