# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication Guidelines

**CRITICAL:** When you need to ask the user questions, ALWAYS use the `AskUserQuestion` tool instead of embedding questions in long responses. Use it multiple times if needed for multiple questions. Questions buried in text are hard for the user to respond to.

**CRITICAL:** NEVER push to GitHub without explicit user permission. Always ask first, even if it seems like the logical next step.

## Implementation Documentation

**Before implementing features, read these documents:**

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Complete technical architecture, technology stack decisions, data models, API design, and key design patterns
- **[docs/ROADMAP.md](docs/ROADMAP.md)** - Sequential feature implementation plan with dependencies and success criteria
- **[docs/feature-prompts/](docs/feature-prompts/)** - Detailed implementation prompts for each feature, designed for use with the `feature-dev` skill

**Implementation Approach:**
1. Read ARCHITECTURE.md to understand overall system design
2. Check ROADMAP.md to see current progress and next feature
3. Use the corresponding feature prompt file with `feature-dev` skill
4. Each feature builds on previous features - implement in order

## Project Overview

Color The Map is a GPS track visualization tool for mapping workout routes. The goal is to self-propel (ride, run, walk, or hike) every trail, road, and alley in town and visualize progress on an interactive map.

**Current Status:** Basic Flask skeleton with "Hello World" page. Core functionality (map visualization, GPX upload/processing, track rendering) not yet implemented.

## MVP Feature Scope

**Desktop View:**
- Full map with right sidebar containing track list
- Drag & drop GPX upload with progress dialog
- Track selection (single/multi) with details/bulk operations panels
- Filtering by activity type and date range
- All core features enabled

**Mobile/Responsive View:**
- Map only (full screen)
- NO sidebar, NO filters, NO track list
- Simplified UI for viewing tracks on mobile devices

## Development Commands

### Local Development
```bash
# Backend setup (from project root)
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend setup
cd frontend
npm install
cd ..

# Run backend (terminal 1, from project root)
source venv/bin/activate
uvicorn backend.main:app --reload --port 8005

# Run frontend dev server (terminal 2)
cd frontend
npm run dev
# Vite dev server proxies API calls to backend

# Run tests (from project root)
source venv/bin/activate
pytest backend/tests/ -v               # Backend tests
cd frontend && npm test -- --run       # Frontend tests

# Run linting/formatting (from project root)
source venv/bin/activate
ruff check backend/                    # Backend linter
ruff format backend/                   # Backend formatter
mypy backend/ --ignore-missing-imports # Backend type checker
cd frontend && npm run lint            # Frontend linter
```

### Deployment
```bash
# Deploy to production (from local machine)
./deploy-to-prod.sh
# This script:
# 1. Runs all tests (backend + frontend)
# 2. Runs linting checks
# 3. Pushes to git
# 4. SSHs to server and runs deploy.sh

# Manual deployment on server
ssh dhughes@ssh.doughughes.net
cd ~/apps/color-the-map
./deploy.sh
# This script:
# 1. Pulls latest changes
# 2. Installs backend dependencies
# 3. Installs frontend dependencies
# 4. Builds frontend (npm run build)
# 5. Runs database migrations
# 6. Updates Caddy config
# 7. Restarts systemd service
```

## Architecture

**Technology Stack**

*Backend:*
- **FastAPI** - Pure API backend with auto-generated OpenAPI docs
- **Python 3.13+** with full type hints everywhere
- **mypy** in strict mode for type checking
- **SQLAlchemy** - ORM for database operations
- **Alembic** - Database migrations
- **pytest + pytest-cov** - Testing with 80% coverage target
- **ruff** - Linting
- **black** - Code formatting
- **gpxpy** - GPX file parsing

*Frontend:*
- **React 18+** - UI framework
- **TypeScript** - Type safety throughout
- **Vite** - Build tool and dev server
- **React Query** - Server state management and caching
- **MapLibre GL JS** - WebGL-based map rendering (handles large datasets)
- **Vitest + React Testing Library** - Testing with 80% coverage target
- **ESLint + Prettier** - Linting and formatting

*Development:*
- Pre-commit hooks enforce formatting/linting
- All tests must pass before deployment

**Testing (CRITICAL!)**
- TDD-ish approach for core business logic.
- Tests are the foundation of insuring code quality.
- Write tests.
- Write tests early.
- Run tests frequently.
- Don't test private functions.
- Test behavior, not implementation.

**Project Structure**
```
color-the-map/
├── backend/
│   ├── app/
│   │   ├── __init__.py         # FastAPI app factory
│   │   ├── main.py             # Entry point, serve static + API
│   │   ├── models/             # SQLAlchemy models
│   │   ├── schemas/            # Pydantic schemas (API contracts)
│   │   ├── services/           # Business logic (GPX processing, etc.)
│   │   ├── routers/            # API route handlers
│   │   └── db.py               # Database setup
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── fixtures/           # Sample GPX files
│   ├── requirements.txt
│   └── pyproject.toml          # Tool configurations
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── services/           # API client
│   │   ├── types/              # TypeScript type definitions
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── tests/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── vitest.config.ts
├── data/                       # gitignored
│   ├── gpx/                    # Uploaded GPX files
│   └── color-the-map.db        # SQLite database
├── .pre-commit-config.yaml
├── deploy.sh                   # Server-side deployment
└── deploy-to-prod.sh           # Local deployment trigger
```

**Current Implementation Status**
- Basic Flask "Hello World" skeleton exists
- Will be completely replaced with FastAPI + React architecture
- Deployment infrastructure (systemd, Caddy) is in place and working

**API Design**
- API routes: `/api/v1/*`
- Frontend served from root: `/`
- Runs on port 8005 (both locally and in production)
- Private URL: https://www.doughughes.net/color-the-map (requires login)
- Caddy reverse proxy handles routing via `/color-the-map` path prefix with forward_auth

**Database**
- SQLite for development and production (simple, file-based)
- Alembic migrations tracked in version control
- Schema includes track metadata (filename, date, distance, activity type, simplified geometry)

**Deployment Infrastructure**
- Systemd service manages the FastAPI process with auto-restart
- Caddy configuration in `caddy.conf` includes forward_auth for authentication
- `deploy.sh` runs on server: git pull → npm build → pip install → migrations → update Caddy → restart service
- `deploy-to-prod.sh` runs locally: run tests → lint → git push → SSH to server → run deploy.sh

**Key Configuration**
- `app.json`: Metadata for app (name, icon 🗺️, image color-the-map.png, description)
- `color-the-map.service`: Systemd service definition (runs uvicorn)
- `caddy.conf`: Reverse proxy routing configuration with authentication

## CRITICAL: Relative Paths Only

**ALL URLs and paths in the application MUST be relative, never absolute.**

This application runs behind a Caddy reverse proxy at `/color-the-map` in production. The `caddy.conf` includes:
- Redirect: `/color-the-map` → `/color-the-map/` (with trailing slash)
- Path stripping: `uri strip_prefix /color-the-map` before proxying to Flask

**Examples:**
- ✅ CORRECT: `<a href="">Home</a>` or `<a href="api/tracks">Tracks</a>`
- ✅ CORRECT: `fetch('api/tracks')` or `fetch('./api/tracks')`
- ❌ WRONG: `<a href="/">Home</a>` or `<a href="/api/tracks">Tracks</a>`
- ❌ WRONG: `fetch('/api/tracks')`

Absolute paths (starting with `/`) will break when deployed because they bypass the `/color-the-map` prefix. The app must work both:
- Locally: `http://localhost:8005`
- Production: `https://www.doughughes.net/color-the-map/`

Reference implementation: `/Users/doughughes/Projects/Personal/home-inventory`

## Important Notes

- This is a private app - authentication is required via forward_auth to the auth service
- Target map center: Chapel Hill, NC coordinates (35.9132, -79.0558)
- When modifying deployment scripts, remember SSH commands need `cd` to set working directory: `ssh user@host 'cd ~/path && script.sh'`
- Infrastructure deployment (`~/infrastructure/deploy.sh caddy`) is managed externally

## Sample GPX Files

Sample GPX files for testing are located in `sample-gpx-files/`:

- `route_2024-09-21_9.04am.gpx` - Triathlon track from Apple health export
- `route_2025-03-14_6.24pm.gpx` - Apple health export (activity type unclear)
- `Walking 2031.gpx` - Walking track from GPX Export
- `Cycling 2025-12-19T211415Z.gpx` - Cycling track from GPX Export
- `Multisport 2025-09-27T131031Z-1.gpx` - Triathlon from GPX Export
- `route_2025-03-01_5.31pm.gpx` - Export from gpx.studio
- `Downhill Skiing 2025-01-23T001434Z.gpx` - Downhill skiing from GPX Export
- `What the hell. Why not?.gpx` - Export from Komoot (filename is track name)

**GPX File Sources:**
- Apple Fitness (via GPX Export app or Apple's health export)
- Komoot
- gpx.studio
- Potentially others in the future

**Activity Type Detection:**
- GPX Export files typically named: `[Activity] YYYY-MM-DDTHH:MM:SSZ.gpx` (e.g., `Walking 2025-12-31T194656Z.gpx`)
- Common activities: Walking, Cycling, Running, Swimming, Downhill Skiing, Multisport
- Apple exports may include speed data in GPX
- Speed can be calculated from track points when not provided
- Filename parsing is primary method for activity type inference
