#!/bin/bash
# Setup a worktree for development by copying venv and node_modules from main repo.
# Run this once after creating a new worktree.

set -e

MAIN_REPO="/Users/doughughes/Projects/Personal/color-the-map"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKTREE_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$WORKTREE_ROOT"

echo "Setting up worktree: $WORKTREE_ROOT"

# Setup venv
if [ -d "venv" ]; then
    echo "venv already exists, skipping..."
else
    if [ -d "$MAIN_REPO/venv" ]; then
        echo "Copying venv from main repo..."
        cp -R "$MAIN_REPO/venv" .
        echo "Fixing venv paths..."
        python3 -m venv venv --upgrade
    else
        echo "Main repo venv not found, creating fresh..."
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
    fi
fi

# Setup node_modules
if [ -d "frontend/node_modules" ]; then
    echo "frontend/node_modules already exists, skipping..."
else
    if [ -d "$MAIN_REPO/frontend/node_modules" ]; then
        echo "Copying node_modules from main repo..."
        cp -R "$MAIN_REPO/frontend/node_modules" frontend/
    else
        echo "Main repo node_modules not found, installing fresh..."
        cd frontend
        npm install
        cd ..
    fi
fi

# Create test user
echo "Creating test user..."
source venv/bin/activate
python create_user.py doug@doughughes.net changeme

echo "Worktree setup complete!"
