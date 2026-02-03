#!/bin/bash
# Check if venv directory exists
# Returns "exists" or "missing" to stdout

if [ -d venv ]; then
    echo "exists"
else
    echo "missing"
fi
