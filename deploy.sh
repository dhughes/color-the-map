#!/bin/bash
set -e

echo "🚀 Deploying Color The Map..."

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull

# Build frontend
echo "🎨 Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Activate virtual environment and update dependencies
echo "📦 Updating Python dependencies..."
source venv/bin/activate
pip install -r requirements.txt

echo "🔧 Updating Caddy configuration..."
sudo ~/infrastructure/deploy.sh caddy

# Restart service
echo "🔄 Restarting service..."
sudo systemctl restart color-the-map

# Show status
echo "✅ Deployment complete!"
echo "📊 Service status:"
systemctl status color-the-map --no-pager
