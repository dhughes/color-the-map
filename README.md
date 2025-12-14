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

## Deployment

Deploy to production server:

```bash
./deploy-to-prod.sh
```

This will push changes to git, SSH to the server, pull updates, install dependencies, and restart the service.

## Port

This app runs on port 8005.
