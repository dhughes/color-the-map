# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Color The Map is a GPS track visualization tool for mapping workout routes. The goal is to self-propel (ride, run, walk, or hike) every trail, road, and alley in town and visualize progress on an interactive map. Users can upload GPX files and view all tracks color-coded by type, speed, or other categories.

## Development Commands

### Local Development
```bash
# Setup
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run locally
python app.py
# Access at http://localhost:8005
```

### Deployment
```bash
# Deploy to production (from local machine)
./deploy-to-prod.sh

# Manual deployment on server
ssh dhughes@ssh.doughughes.net
cd ~/apps/color-the-map
./deploy.sh
```

## Architecture

**Flask + Leaflet Application**
- Flask backend (`app.py`) serves API and web interface
- Leaflet.js for interactive map rendering
- Runs on port 8005 (both locally and in production)
- Private URL: https://www.doughughes.net/color-the-map (requires login)
- Caddy reverse proxy handles routing via `/color-the-map` path prefix with forward_auth

**Data Storage**
- GPX files stored in `data/gpx/` directory (gitignored)
- Simple file-based storage (no database yet)

**Deployment Infrastructure**
- Systemd service manages the Flask process with auto-restart
- Caddy configuration in `caddy.conf` includes forward_auth for authentication
- `deploy.sh` runs on server: git pull → pip install → update Caddy → restart service
- `deploy-to-prod.sh` runs locally: git push → SSH to server → run deploy.sh

**Key Configuration**
- `app.json`: Metadata for app (name, icon 🗺️, image color-the-map.png, description)
- `color-the-map.service`: Systemd service definition
- `caddy.conf`: Reverse proxy routing configuration with authentication

## Important Notes

- This is a private app - authentication is required via forward_auth to the auth service
- Map is currently centered on Chapel Hill coordinates (35.9132, -79.0558) - adjust as needed
- GPX parsing happens client-side using JavaScript DOMParser
- All tracks currently display in red - color-coding by type/speed is planned
- When modifying deployment scripts, remember SSH commands need `cd` to set working directory: `ssh user@host 'cd ~/path && script.sh'`
- Infrastructure deployment (`~/infrastructure/deploy.sh caddy`) is managed externally
