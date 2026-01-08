#!/bin/bash
set -e

SERVER_USER="dhughes"
SERVER_HOST="ssh.doughughes.net"

echo "🚀 Deploying Color The Map to production server..."

# Run tests
echo "🧪 Running backend tests..."
source venv/bin/activate
pytest backend/tests/ -v --tb=short || { echo "❌ Backend tests failed!"; exit 1; }

echo "🧪 Running frontend tests..."
cd frontend
npm test run || { echo "❌ Frontend tests failed!"; exit 1; }
cd ..

# Run linting
echo "🔍 Running backend linting..."
ruff check backend/ || { echo "❌ Backend linting failed!"; exit 1; }

echo "🔍 Running frontend linting..."
cd frontend
npm run lint || { echo "❌ Frontend linting failed!"; exit 1; }
cd ..

# TypeScript check
echo "🔍 TypeScript check..."
cd frontend
npx tsc --noEmit || { echo "❌ TypeScript check failed!"; exit 1; }
cd ..

echo "✅ All checks passed!"

echo "📤 Pushing local changes to git..."
git push

echo "🔗 Connecting to server and running deployment..."
ssh ${SERVER_USER}@${SERVER_HOST} 'cd ~/apps/color-the-map && bash deploy.sh'

echo "✅ Production deployment complete!"
