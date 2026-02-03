#!/bin/bash
# Check if frontend/node_modules directory exists
# Returns "exists" or "missing" to stdout

if [ -d frontend/node_modules ]; then
    echo "exists"
else
    echo "missing"
fi
