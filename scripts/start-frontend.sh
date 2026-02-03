#!/bin/bash
# Start the frontend dev server.
# Usage: ./scripts/start-frontend.sh [backend_port] [frontend_port]
# Defaults to 8005 for backend and 5173 for frontend if not provided.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKTREE_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$WORKTREE_ROOT/frontend"

BACKEND_PORT=${1:-8005}
FRONTEND_PORT=${2:-5173}

echo "Starting frontend on port $FRONTEND_PORT (proxying API to backend on $BACKEND_PORT)"

VITE_API_PORT=$BACKEND_PORT exec npm run dev -- --port $FRONTEND_PORT
