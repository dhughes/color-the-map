#!/bin/bash
set -e

echo "🚀 Deploying Color The Map..."

git checkout .

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull

# Build frontend
echo "🎨 Building frontend..."

# Load nvm if it exists (for Node.js installed via nvm)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

cd frontend
npm ci
npm run build
cd ..

# Activate virtual environment and update dependencies
echo "📦 Updating Python dependencies..."
source venv/bin/activate
pip install -r requirements.txt

# Run database migrations
echo "🗄️  Running database migrations..."
alembic upgrade head

echo "🔧 Updating Caddy configuration..."
sudo ~/infrastructure/deploy.sh caddy

# Restart service
echo "🔄 Restarting service..."
sudo systemctl restart color-the-map

# Show status
echo "✅ Deployment complete!"
echo "📊 Service status:"
systemctl status color-the-map --no-pager
