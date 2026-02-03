#!/bin/bash
# Start the backend dev server.
# Usage: ./scripts/start-backend.sh <backend_port> <frontend_port>
# If ports not provided, finds available ones automatically.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKTREE_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$WORKTREE_ROOT"

BACKEND_PORT=${1:-$("$SCRIPT_DIR/find-available-port.sh" 8005)}
FRONTEND_PORT=${2:-$("$SCRIPT_DIR/find-available-port.sh" 5173)}

echo "Starting backend on port $BACKEND_PORT (CORS allows frontend on $FRONTEND_PORT)"
echo "Start frontend with: ./scripts/start-frontend.sh $BACKEND_PORT $FRONTEND_PORT"

source venv/bin/activate
PORT=$BACKEND_PORT FRONTEND_PORT=$FRONTEND_PORT exec uvicorn backend.main:app --reload --port $BACKEND_PORT
