# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication Guidelines

**CRITICAL:** When you need to ask the user questions, ALWAYS use the `AskUserQuestion` tool instead of embedding questions in long responses. Use it multiple times if needed for multiple questions. Questions buried in text are hard for the user to respond to.

**CRITICAL:** NEVER push to GitHub without explicit user permission. Always ask first, even if it seems like the logical next step.

## Code Reviewer Guidelines

**Attitude & Approach:**
When asked to review a PR, adopt the mindset of a senior engineer with high ownership of code quality:

- **Be rigorous but pragmatic** - High standards for new code, but understand we're incrementally improving from legacy patterns. Be thorough, not nitpicky. Don't be a pedantic jerk that blocks progress, but don't let poor work slip by either.
- **Be direct and honest** - Don't sugarcoat issues. Clear, constructive feedback is more valuable than politeness.
- **Focus on what matters** - Performance bugs, type safety, error handling, test quality, and maintainability issues are blocking. Style preferences are not.
- **Demand quality** - Linting, formatting, and type checking must be perfect. No exceptions.
- **Test architecture matters** - Tests that test implementation details or have poor type safety are as bad as no tests.
- **Error handling is not optional** - Every async operation needs proper error handling.
- **No technical debt in new code** - Old code can have issues we'll fix incrementally, but new code must meet current standards.
- **Suggest improvements** - When you see opportunities for better patterns, suggest them as non-blocking improvements.

**What to Review:**

1. **Type Safety**
   - All TypeScript should be properly typed (no `any`, no missing properties)
   - Test data must match actual types, not partial objects
   - Python must pass mypy strict mode

2. **Performance**
   - Watch for unnecessary re-renders (new object/array allocations in render path)
   - Check for N+1 queries or inefficient database access
   - Look for memory leaks (uncleaned event listeners, etc.)

3. **Error Handling**
   - Every async function needs try/catch or proper error boundaries
   - Network calls need error states
   - User-facing errors need helpful messages

4. **Test Quality**
   - Tests should test behavior, not implementation
   - No exporting internal components just for testing
   - Test data should be properly typed
   - Module-level mocks should be scoped to tests that need them
   - Tests should test the public API (e.g., `<App />`, not `<AppContent />`)

5. **Test Database Isolation (CRITICAL!)**
   - Tests MUST use the in-memory SQLite pattern via `app.dependency_overrides`
   - Tests MUST use the `test_db_session` fixture from conftest.py
   - Tests MUST NEVER import the production database configuration directly
   - Tests MUST NEVER touch `data/tracks.db` - this has happened before and wiped prod data

6. **Database & ORM**
   - SQLAlchemy 2.0+ with async support (aiosqlite) - verify proper async patterns
   - Schema changes MUST go through Alembic migrations
   - Verify proper use of the ORM (no raw SQL unless justified)
   - Check for proper session management and cleanup

7. **Frontend Styling**
   - Use the CSS variable system defined in `index.css` (`--color-primary`, `--color-bg`, etc.)
   - NO inline styles except for truly dynamic values (e.g., percentage widths for progress bars)
   - NO component-specific CSS files when existing CSS variables would suffice
   - Styles should be consistent with the existing design system

8. **Code Quality**
   - No unnecessary abstractions or premature optimization
   - Error-prone patterns (missing cleanup, race conditions, etc.)
   - Security issues (XSS, SQL injection, path traversal, etc.)
   - Adherence to project architecture and patterns
   - All URLs and paths MUST be relative (never absolute) - see "CRITICAL: Relative Paths Only" section

**How to Leave Comments:**

**CRITICAL:** Comments MUST be added directly on specific lines in the PR files, not just listed in a general review comment.

Use the GitHub CLI API to add line-specific comments:

```bash
# Get the latest commit SHA
gh pr view <pr-number> --json commits --jq '.commits[-1].oid'

# Add a comment on a specific line
gh api repos/:owner/:repo/pulls/<pr-number>/comments -X POST \
  -f body="Your detailed comment here with examples" \
  -f commit_id="<commit-sha>" \
  -f path="path/to/file.tsx" \
  -f side="RIGHT" \
  -F line=<line-number>
```

**Structure of Comments:**

1. **Start with the issue type**: `**Performance Issue:**`, `**Type Safety Violation:**`, `**Missing Error Handling:**`
2. **Explain the problem**: What's wrong and why it matters
3. **Provide the fix**: Show the correct code with a code block
4. **Be specific**: Reference exact line numbers, variable names, function names

**Example Comment:**
```
**Performance Issue:** This creates a new empty array on every render when not authenticated, which will cause unnecessary re-renders of child components.

Create a stable reference outside the component:
```tsx
const EMPTY_TRACKS: Track[] = [];

// Then in the component:
const tracks = useMemo(
  () => (isAuthenticated ? tracksData : EMPTY_TRACKS),
  [isAuthenticated, tracksData],
);
```
```

**General Review Comment:**

After adding all line-specific comments, add one general review comment summarizing:
- What's good about the PR
- How many issues were found
- Whether they're blocking or not
- Overall recommendation (approve/request changes/comment)

```bash
gh pr review <pr-number> --comment --body "## Overall Assessment

Good work on [feature]. The core approach is solid.

However, there are several code quality issues that need to be addressed:
1. Performance issues
2. Missing error handling
3. Type safety violations

I've added line-specific comments. Please address these before merging."
```

**Review Workflow:**

1. Read the PR description and understand what it's trying to accomplish
2. Check out the diff: `gh pr diff <pr-number>`
3. Read changed files thoroughly
4. Get the commit SHA for adding comments
5. Add line-specific comments for each issue (run them in parallel if many)
6. Add a general summary comment
7. Report back to the user with a summary

**Never:**
- Accept type safety violations ("we'll fix it later")
- Accept missing error handling in async code
- Accept tests that test implementation details
- Accept incomplete test data that doesn't match types
- Accept performance issues like unnecessary allocations
- Accept tests that could touch the production database
- Accept inline styles (except for dynamic values)
- Accept absolute paths/URLs
- Accept schema changes without Alembic migrations
- List issues in a general comment without adding them to specific lines

## Handling PR Review Feedback

When a PR receives review comments, you need to read all comments (both PR-level and file-level) and respond appropriately.

**CRITICAL: Keep conversations together!** Always reply to file-level comments directly in their thread, not as separate PR-level comments.

### Reading All PR Comments

**Step 1: Get PR-level review comments**
```bash
gh pr view <pr-number> --json reviews --jq '.reviews[] | {state: .state, body: .body, author: .author.login}'
```

**Step 2: Get file-level (line-specific) comments**
```bash
gh api repos/:owner/:repo/pulls/<pr-number>/comments --jq '.[] | {path: .path, line: .line, body: .body, id: .id}'
```

This returns all comments on specific files with their:
- `path`: File path (e.g., `frontend/src/App.tsx`)
- `line`: Line number the comment is on
- `body`: Comment text
- `id`: Comment ID (needed for replying)

**Step 3: List all comments clearly**

When the user asks you to review feedback, read both PR-level and file-level comments, then list them all out organized by file and line number so the user knows you've read everything.

### Replying to File-Level Comments

**CRITICAL:** Always reply to file-level comments in their thread using the `in_reply_to` parameter. Never post a separate PR comment about file-level issues.

**Correct way to reply to a file comment:**
```bash
# 1. Get the comment ID from the file comment you want to reply to
gh api repos/:owner/:repo/pulls/<pr-number>/comments --jq '.[] | select(.path == "path/to/file.tsx" and .line == 42) | .id'

# 2. Reply directly to that comment thread
gh api repos/:owner/:repo/pulls/<pr-number>/comments -X POST \
  -f body="Your reply here" \
  -F in_reply_to=<comment-id>
```

**Example:**
```bash
# Find the comment ID for a specific file/line
COMMENT_ID=$(gh api repos/owner/repo/pulls/40/comments --jq '.[] | select(.path == "frontend/src/App.tsx" and .line == 61) | .id')

# Reply to that specific comment thread
gh api repos/owner/repo/pulls/40/comments -X POST \
  -f body="Good catch! I've fixed this by creating a stable EMPTY_TRACKS constant." \
  -F in_reply_to=$COMMENT_ID
```

### Workflow for Addressing Feedback

1. **Read all comments** - Use both commands above to get PR-level and file-level comments
2. **Organize by file** - Group file-level comments by file path for clarity
3. **Address each issue** - Make the necessary code changes
4. **Reply in thread** - For each file-level comment, reply directly to that comment thread explaining your fix
5. **Push changes** - Commit and push your fixes
6. **Summarize** - Optionally add a PR-level comment summarizing all changes made

**Why keep conversations together:**
- Makes it easy to see the discussion about a specific issue in one place
- Reviewers can mark conversations as "resolved" when satisfied
- Future readers can understand the context of why code changed
- Reduces noise in the main PR thread

**Never:**
- Reply to file-level comments with a general PR comment
- Create new file comments when replying to existing ones
- Lose track of which issues you've addressed

## Project Overview

Color The Map is a GPS track visualization tool for mapping workout routes. The goal is to self-propel (ride, run, walk, or hike) every trail, road, and alley in town and visualize progress on an interactive map.

**Current Status:** FastAPI backend with React frontend. Core functionality implemented: map visualization, GPX upload/processing, track rendering, user authentication.

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

### Worktree Development (Parallel Development)

Each git worktree needs its own `venv` and `node_modules` - they cannot be shared because they contain absolute paths and platform-specific binaries.

**Worktree Setup (run once per new worktree):**
```bash
./scripts/setup-worktree.sh
```

This script copies `venv` and `node_modules` from the main repo (fast), or installs fresh if main repo doesn't have them. It's idempotent - safe to run multiple times.

**For Claude Code:** Before running any Python or npm commands, check if `venv` and `frontend/node_modules` exist. If not, run `./scripts/setup-worktree.sh` first.

**Helper Scripts for Environment Checks:**
Use these scripts instead of inline shell conditionals (they're pre-approved for execution):
```bash
./scripts/check-for-worktree.sh      # Returns "worktree" or "main-repo"
./scripts/check-venv-exists.sh       # Returns "exists" or "missing"
./scripts/check-node-modules-exists.sh  # Returns "exists" or "missing"
```

**Port Configuration (for running multiple worktrees simultaneously):**
- Backend reads `PORT` env var (default: 8005)
- Backend reads `FRONTEND_PORT` env var for CORS (default: 5173)
- Frontend reads `VITE_API_PORT` env var for proxy target (default: 8005)

**Finding Available Ports:**
```bash
# Find first available port starting from a given number
./scripts/find-available-port.sh 8006  # Returns first available port >= 8006
./scripts/find-available-port.sh 5174  # For frontend
```

**Starting Dev Servers in a Worktree:**
```bash
# Start backend (finds available ports automatically, prints them to console)
./scripts/start-backend.sh --auto

# Start frontend (use ports from backend output)
./scripts/start-frontend.sh 8006 5175
```

**For Claude Code:** When starting dev servers:
1. Run `./scripts/check-venv-exists.sh` and `./scripts/check-node-modules-exists.sh` - if either returns "missing", run `./scripts/setup-worktree.sh`
2. Run `./scripts/check-for-worktree.sh` - if "worktree", use `./scripts/start-backend.sh --auto` to avoid port conflicts
3. If "main-repo", use `./scripts/start-backend.sh` (defaults to 8005/5173)
4. Start frontend with `./scripts/start-frontend.sh <backend_port> <frontend_port>` using ports from backend output
5. Tell the user which ports are being used so they know where to access the app

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
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Configuration
│   ├── database.py             # SQLAlchemy Base
│   ├── api/                    # API routes and Pydantic models
│   ├── auth/                   # Authentication (fastapi-users)
│   ├── models/                 # SQLAlchemy models
│   ├── services/               # Business logic (GPX processing, etc.)
│   └── tests/                  # pytest tests with fixtures
├── frontend/
│   ├── src/
│   │   ├── components/         # React components + CSS
│   │   ├── contexts/           # React contexts (AuthContext)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # API client
│   │   ├── types/              # TypeScript type definitions
│   │   ├── utils/              # Utility functions
│   │   ├── index.css           # Global styles and CSS variables
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── vitest.config.ts
├── alembic/                    # Database migrations
│   └── versions/
├── data/                       # gitignored
│   ├── gpx/                    # Uploaded GPX files
│   └── tracks.db               # SQLite database
├── sample-gpx-files/           # Test GPX files
├── scripts/                    # Development scripts
├── .pre-commit-config.yaml
├── deploy.sh                   # Server-side deployment
└── deploy-to-prod.sh           # Local deployment trigger
```

**Current Implementation Status**
- FastAPI backend with async SQLAlchemy (aiosqlite)
- React + TypeScript frontend with MapLibre GL JS
- User authentication via fastapi-users
- GPX upload, parsing, and track visualization working
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
