#!/bin/bash
# Find the first available TCP port starting from a given port number.
# Usage: ./find-available-port.sh [starting_port]
# Default starting port is 8006 (reserves 8005 for manual use).

start_port=${1:-8006}
port=$start_port

while true; do
    # Check if port is in use (works on macOS and Linux)
    if ! lsof -i :$port -sTCP:LISTEN >/dev/null 2>&1; then
        echo $port
        exit 0
    fi
    ((port++))
done
