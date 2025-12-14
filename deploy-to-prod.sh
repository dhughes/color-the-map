#!/bin/bash
set -e

SERVER_USER="dhughes"
SERVER_HOST="ssh.doughughes.net"

echo "🚀 Deploying Color The Map to production server..."

echo "📤 Pushing local changes to git..."
git push

echo "🔗 Connecting to server and running deployment..."
ssh ${SERVER_USER}@${SERVER_HOST} 'cd ~/apps/color-the-map && bash deploy.sh'

echo "✅ Production deployment complete!"
