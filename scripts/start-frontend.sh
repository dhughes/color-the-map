#!/bin/bash
# Start the frontend dev server on an available port.
# Finds an available port starting from 5173 and starts Vite.
# Requires BACKEND_PORT to be set so the proxy knows where to forward API requests.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKTREE_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$WORKTREE_ROOT/frontend"

if [ -z "$BACKEND_PORT" ]; then
    echo "Error: BACKEND_PORT must be set so frontend knows where to proxy API requests."
    echo "Usage: BACKEND_PORT=8006 ./scripts/start-frontend.sh"
    exit 1
fi

FRONTEND_PORT=$("$SCRIPT_DIR/find-available-port.sh" 5173)

echo "Starting frontend on port $FRONTEND_PORT (proxying API to backend on $BACKEND_PORT)"

VITE_API_PORT=$BACKEND_PORT exec npm run dev -- --port $FRONTEND_PORT
