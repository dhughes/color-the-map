#!/bin/bash
# Start the backend dev server.
# Usage: ./scripts/start-backend.sh [backend_port] [frontend_port]
#        ./scripts/start-backend.sh --auto  (finds available ports)
# Defaults to 8005 for backend and 5173 for frontend if not provided.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKTREE_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$WORKTREE_ROOT"

if [ "$1" = "--auto" ]; then
    BACKEND_PORT=$("$SCRIPT_DIR/find-available-port.sh" 8006)
    FRONTEND_PORT=$("$SCRIPT_DIR/find-available-port.sh" 5174)
else
    BACKEND_PORT=${1:-8005}
    FRONTEND_PORT=${2:-5173}
fi

echo "Starting backend on port $BACKEND_PORT (CORS allows frontend on $FRONTEND_PORT)"
echo "Start frontend with: ./scripts/start-frontend.sh $BACKEND_PORT $FRONTEND_PORT"

source venv/bin/activate
PORT=$BACKEND_PORT FRONTEND_PORT=$FRONTEND_PORT exec uvicorn backend.main:app --reload --port $BACKEND_PORT
