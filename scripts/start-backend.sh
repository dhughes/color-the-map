#!/bin/bash
# Start the backend dev server on an available port.
# Finds an available port starting from 8005 and starts uvicorn.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKTREE_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$WORKTREE_ROOT"

BACKEND_PORT=$("$SCRIPT_DIR/find-available-port.sh" 8005)
FRONTEND_PORT=${FRONTEND_PORT:-5173}

echo "Starting backend on port $BACKEND_PORT (CORS allows frontend on $FRONTEND_PORT)"

source venv/bin/activate
PORT=$BACKEND_PORT FRONTEND_PORT=$FRONTEND_PORT exec uvicorn backend.main:app --reload --port $BACKEND_PORT
