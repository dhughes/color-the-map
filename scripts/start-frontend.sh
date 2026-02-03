#!/bin/bash
# Start the frontend dev server.
# Usage: ./scripts/start-frontend.sh <backend_port> <frontend_port>
# Both ports are required so frontend knows where to proxy and which port to use.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKTREE_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$WORKTREE_ROOT/frontend"

BACKEND_PORT=$1
FRONTEND_PORT=$2

if [ -z "$BACKEND_PORT" ] || [ -z "$FRONTEND_PORT" ]; then
    echo "Usage: ./scripts/start-frontend.sh <backend_port> <frontend_port>"
    echo "Example: ./scripts/start-frontend.sh 8006 5175"
    exit 1
fi

echo "Starting frontend on port $FRONTEND_PORT (proxying API to backend on $BACKEND_PORT)"

VITE_API_PORT=$BACKEND_PORT exec npm run dev -- --port $FRONTEND_PORT
