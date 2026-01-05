# Color The Map

Visualize GPS workout tracks and work toward covering every trail, road, and alley in town.

## Features

- Upload GPX files from your GPS device or fitness tracker
- Visualize all tracks on an interactive map
- Color-code tracks by type, speed, or other categories (coming soon)
- Track progress toward covering every street

## Development

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run locally
python app.py
```

Access at: http://localhost:8005

## First-Time Installation on Server

SSH to the server and run these commands:

```bash
# Clone the repository
cd ~/apps
git clone <repo-url> color-the-map
cd color-the-map

# Create virtual environment and install dependencies
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Install systemd service
sudo ln -s /home/dhughes/apps/color-the-map/color-the-map.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable color-the-map
sudo systemctl start color-the-map

# Configure passwordless sudo for service restart (required for deployment)
sudo visudo -f /etc/sudoers.d/color-the-map
# Add this line:
# dhughes ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart color-the-map
# Save and exit (Ctrl+X, then Y, then Enter)

# Deploy infrastructure to update Caddy configuration
cd ~/infrastructure
sudo ./deploy.sh
```

Check that everything is running:

```bash
systemctl status color-the-map
journalctl -u color-the-map -f
```

## Deployment

After initial installation, deploy updates from your local machine:

```bash
./deploy-to-prod.sh
```

This will push changes to git, SSH to the server, pull updates, install dependencies, and restart the service.

## Port

This app runs on port 8005.
