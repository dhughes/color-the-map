# Color The Map - Architecture Documentation

## ⚠️ IMPLEMENTATION STATUS

**This document describes the planned target architecture, not the current implementation.**

**Current State (as of 2026-01-05):**
- Backend: Flask skeleton with "Hello World" page (to be replaced with FastAPI)
- Frontend: Single HTML template (to be replaced with React + TypeScript)
- Database: Not yet implemented (to be SQLite)
- Map: Not yet implemented (to be MapLibre GL JS)

**This architecture document is a blueprint for implementation.** Follow the feature prompts in `docs/feature-prompts/` to build toward this architecture incrementally.

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Decisions](#architecture-decisions)
4. [Directory Structure](#directory-structure)
5. [Data Models](#data-models)
6. [API Design](#api-design)
7. [Frontend Architecture](#frontend-architecture)
8. [Key Design Patterns](#key-design-patterns)
9. [Configuration & Deployment](#configuration--deployment)
10. [Testing Strategy](#testing-strategy)
11. [Performance Considerations](#performance-considerations)

---

## System Overview

**Color The Map** is a GPS track visualization application designed to help users visualize their progress in covering every road, trail, and path in their city through various fitness activities (cycling, running, walking, etc.).

### Primary Goals
- Visualize hundreds of GPS tracks on an interactive map
- Handle large GPX files efficiently (performance is critical)
- Track coverage progress over time
- Support multiple activity types from various sources

### Key Constraints
- **Private application**: Authentication required via forward_auth
- **Reverse proxy**: Runs behind Caddy at `/color-the-map` path prefix
- **Relative paths only**: All URLs must be relative to work with path stripping
- **Single-user initially**: Designed for personal use, can expand later
- **Self-hosted**: Deployed on user's infrastructure via systemd

---

## Technology Stack

### Backend
- **FastAPI 0.109+**: Pure API backend, auto-generated OpenAPI docs
- **Python 3.13+**: With full type hints everywhere (mypy strict mode)
- **Pydantic 2.5+**: Request/response validation and serialization
- **SQLite 3**: Database with R*Tree spatial extension
- **Alembic**: Database migrations
- **gpxpy**: GPX file parsing
- **uvicorn**: ASGI server

**Why FastAPI over Flask:**
- Auto-generated API documentation
- Native async support for file I/O
- First-class type hint support with Pydantic
- Better suited for pure API backend architecture

**Why SQLite over PostgreSQL:**
- Zero operational overhead (no separate DB server)
- R*Tree spatial indexing built-in
- Sufficient performance for hundreds/thousands of tracks
- Simple backups (single file)
- Easy local development

### Frontend
- **React 18+**: UI framework
- **TypeScript**: Type safety throughout
- **Vite 5+**: Build tool and dev server (fast HMR)
- **MapLibre GL JS**: WebGL-based map rendering (handles large datasets)
- **React Query**: Server state management and caching

**Why MapLibre over Leaflet:**
- WebGL rendering (much faster with hundreds of tracks)
- Better performance with large datasets
- Modern API, active development
- No API key required (using OpenStreetMap tiles)

### Development Tools
- **Backend**: ruff (lint), black (format), mypy (types), pytest (test)
- **Frontend**: ESLint, Prettier, Vitest + React Testing Library
- **Pre-commit hooks**: Enforced code quality from day one

---

## Architecture Decisions

### Clarified Design Decisions (from Phase 3)

#### Upload & Import
- **Upload failures**: Skip failed files, show summary at end
- **Max file size**: 10 MB per GPX file
- **Activity inference**: During upload (blocking) - infer before import completes
- **Duplicate handling**: Hash from minified GPX (no whitespace), skip if exists, center on existing tracks

#### Map Configuration
- **Tile provider**: OpenStreetMap (no API key, swappable via config)
- **Initial center**: User geolocation → last track bounds → MapLibre default
- **Initial zoom**: 13 (city-sized view ~6km across)
- **Track color**: Magenta (#FF00FF) - configurable constant
- **Simplification**: Balanced (epsilon 0.00025) - configurable
- **Viewport padding**: 100% (2x viewport for smooth panning)

#### Track Management
- **Track list sorting**: By activity date, newest first
- **Selection behavior**:
  - Cmd/Ctrl+click for multi-select
  - Topmost track selected on overlapping clicks
  - Clear selection on filter change
  - Can select hidden tracks from list
- **Isolation mode**: Require explicit action to exit (clicking map does nothing)
- **Visibility toggle**: Eye icon in track list + details panel + bulk operations

#### Filtering
- **Filter logic**: AND (must match all active filters)
- **Date filter UI**: Two date inputs (from/to)
- **Activity type**: Free text with autocomplete from previous types

#### Data Storage
- **GPX storage**: Content-addressable (filesystem by hash)
- **Original files**: Keep on disk, hash in database
- **Database backups**: Rely on server-level backups
- **Selection state**: Clear on page reload (no persistence)

#### Statistics
- **Track stats**: Date, distance, min/avg/max speed, elevation gain/loss
- **Multi-select**: Show count + combined stats + bulk actions

#### Mobile/Responsive
- **Breakpoint**: 640px (phones only get simplified view)
- **Mobile view**: Map only, no sidebar, no filters, no track list

#### Development Workflow
- **Testing**: TDD-ish (tests with implementation for core logic)
- **Pre-commit hooks**: Set up before coding starts
- **Flask cleanup**: Delete Flask files at project start

---

## Directory Structure

```
color-the-map/
├── docs/                          # Documentation
│   ├── ARCHITECTURE.md            # This file
│   ├── ROADMAP.md                 # Feature roadmap
│   └── feature-prompts/           # Feature implementation prompts
│       ├── 01-mvp-walking-skeleton.md
│       ├── 02-multi-track-rendering.md
│       ├── 03-bulk-upload-deduplication.md
│       ├── 04-track-management.md
│       ├── 05-filtering-search.md
│       └── 06-statistics-analytics.md
│
├── backend/                       # FastAPI backend
│   ├── __init__.py
│   ├── main.py                    # FastAPI app entry point
│   ├── config.py                  # Configuration (paths, constants)
│   │
│   ├── api/                       # API endpoints
│   │   ├── __init__.py
│   │   ├── routes.py              # Route definitions
│   │   └── models.py              # Pydantic request/response models
│   │
│   ├── services/                  # Business logic layer
│   │   ├── __init__.py
│   │   ├── gpx_parser.py          # Parse GPX files
│   │   ├── track_service.py       # Track operations
│   │   ├── spatial_service.py     # Spatial queries (R*Tree)
│   │   ├── storage_service.py     # Content-addressable storage
│   │   └── activity_inference.py  # Infer activity type from filename
│   │
│   ├── db/                        # Database layer
│   │   ├── __init__.py
│   │   ├── database.py            # SQLite connection management
│   │   ├── models.py              # SQLAlchemy ORM models
│   │   └── schema.sql             # Database schema definition
│   │
│   └── tests/                     # Backend tests
│       ├── __init__.py
│       ├── conftest.py            # Pytest fixtures
│       ├── test_gpx_parser.py
│       ├── test_storage.py
│       └── test_api.py
│
├── frontend/                      # React TypeScript frontend
│   ├── public/
│   │   └── index.html             # Entry point
│   │
│   ├── src/
│   │   ├── main.tsx               # React entry point
│   │   ├── App.tsx                # Root component
│   │   ├── config.ts              # Frontend config constants
│   │   │
│   │   ├── components/            # React components
│   │   │   ├── Map/
│   │   │   │   ├── MapContainer.tsx
│   │   │   │   ├── TrackLayer.tsx
│   │   │   │   └── MapControls.tsx
│   │   │   ├── TrackList/
│   │   │   │   ├── TrackList.tsx
│   │   │   │   ├── TrackListItem.tsx
│   │   │   │   └── TrackDetails.tsx
│   │   │   ├── Upload/
│   │   │   │   ├── UploadPanel.tsx
│   │   │   │   └── UploadProgress.tsx
│   │   │   └── Filters/
│   │   │       ├── DateFilter.tsx
│   │   │       └── ActivityFilter.tsx
│   │   │
│   │   ├── hooks/                 # Custom React hooks
│   │   │   ├── useTracks.ts       # Track data fetching
│   │   │   ├── useUpload.ts       # Upload handling
│   │   │   └── useMapBounds.ts    # Map viewport management
│   │   │
│   │   ├── api/                   # API client layer
│   │   │   ├── client.ts          # Base API client (relative paths)
│   │   │   └── tracks.ts          # Track API endpoints
│   │   │
│   │   ├── types/                 # TypeScript types
│   │   │   └── track.ts           # Track interfaces
│   │   │
│   │   └── utils/                 # Utility functions
│   │       ├── relative-path.ts   # Path handling helpers
│   │       └── formatting.ts      # Display formatters
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts             # Vite config (relative paths)
│   └── vitest.config.ts           # Test configuration
│
├── data/                          # Runtime data (gitignored)
│   ├── gpx/                       # Content-addressed GPX files
│   │   ├── a3f2e1c8...gpx        # SHA256-named files
│   │   └── b8d9c4a7...gpx
│   └── tracks.db                  # SQLite database
│
├── sample-gpx-files/              # Test data (committed)
│   ├── route_2024-09-21_9.04am.gpx
│   ├── Cycling 2025-12-19T211415Z.gpx
│   └── ...
│
├── requirements.txt               # Python dependencies
├── pyproject.toml                 # Python tooling config
├── .pre-commit-config.yaml        # Pre-commit hooks
├── app.py                         # Entry point (runs FastAPI via uvicorn)
├── deploy.sh                      # Server-side deployment
├── deploy-to-prod.sh              # Local deployment trigger
├── color-the-map.service          # Systemd service
├── caddy.conf                     # Caddy reverse proxy config
├── app.json                       # App metadata
├── CLAUDE.md                      # Claude Code guidance
└── README.md                      # Project documentation
```

---

## Data Models

### Database Schema

#### Tracks Table
```sql
CREATE TABLE tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT UNIQUE NOT NULL,              -- SHA256 of minified GPX content
    name TEXT NOT NULL,                      -- Default: filename without .gpx
    filename TEXT NOT NULL,                  -- Original filename
    activity_type TEXT,                      -- e.g., "Cycling", "Walking", "Running"
    activity_type_inferred TEXT,            -- Original inference (preserved)
    activity_date TIMESTAMP NOT NULL,        -- Date/time of activity
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Metrics
    distance_meters REAL,
    duration_seconds INTEGER,
    avg_speed_ms REAL,                       -- meters per second
    max_speed_ms REAL,
    min_speed_ms REAL,
    elevation_gain_meters REAL,
    elevation_loss_meters REAL,

    -- Spatial bounds
    bounds_min_lat REAL,
    bounds_min_lon REAL,
    bounds_max_lat REAL,
    bounds_max_lon REAL,

    -- UI state
    visible BOOLEAN DEFAULT TRUE,

    -- User notes
    description TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tracks_hash ON tracks(hash);
CREATE INDEX idx_tracks_type ON tracks(activity_type);
CREATE INDEX idx_tracks_date ON tracks(activity_date DESC);
CREATE INDEX idx_tracks_uploaded ON tracks(uploaded_at DESC);

-- R*Tree spatial index for viewport queries
CREATE VIRTUAL TABLE track_spatial USING rtree(
    id,                  -- Corresponds to tracks.id
    min_lat, max_lat,
    min_lon, max_lon
);
```

#### Future Tables (not MVP)
```sql
-- For simplified geometries at multiple zoom levels
CREATE TABLE simplified_geometry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id INTEGER NOT NULL,
    zoom_level INTEGER NOT NULL,            -- e.g., 10, 12, 14
    geojson TEXT NOT NULL,                   -- GeoJSON LineString
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
    UNIQUE(track_id, zoom_level)
);
```

### Pydantic Models (API)

#### Request Models
```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class TrackUpload(BaseModel):
    """File upload is handled separately (multipart/form-data)"""
    pass

class TrackUpdate(BaseModel):
    name: Optional[str] = None
    activity_type: Optional[str] = None
    description: Optional[str] = None
    visible: Optional[bool] = None

class TrackFilter(BaseModel):
    activity_type: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    visible: Optional[bool] = None
```

#### Response Models
```python
class TrackResponse(BaseModel):
    id: int
    hash: str
    name: str
    filename: str
    activity_type: Optional[str]
    activity_type_inferred: Optional[str]
    activity_date: datetime
    uploaded_at: datetime

    distance_meters: Optional[float]
    duration_seconds: Optional[int]
    avg_speed_ms: Optional[float]
    max_speed_ms: Optional[float]
    min_speed_ms: Optional[float]
    elevation_gain_meters: Optional[float]
    elevation_loss_meters: Optional[float]

    bounds_min_lat: Optional[float]
    bounds_min_lon: Optional[float]
    bounds_max_lat: Optional[float]
    bounds_max_lon: Optional[float]

    visible: bool
    description: Optional[str]

    class Config:
        from_attributes = True

class TrackListResponse(BaseModel):
    tracks: list[TrackResponse]
    total: int
    offset: int
    limit: int

class TrackGeometry(BaseModel):
    type: str = "LineString"
    coordinates: list[list[float]]  # [[lon, lat, ele], ...]

class UploadResult(BaseModel):
    success: bool
    message: str
    track: Optional[TrackResponse] = None
    duplicate: bool = False
```

### TypeScript Types

```typescript
// frontend/src/types/track.ts
export interface Track {
  id: number;
  hash: string;
  name: string;
  filename: string;
  activity_type: string | null;
  activity_type_inferred: string | null;
  activity_date: string;  // ISO 8601
  uploaded_at: string;

  distance_meters: number | null;
  duration_seconds: number | null;
  avg_speed_ms: number | null;
  max_speed_ms: number | null;
  min_speed_ms: number | null;
  elevation_gain_meters: number | null;
  elevation_loss_meters: number | null;

  bounds_min_lat: number | null;
  bounds_min_lon: number | null;
  bounds_max_lat: number | null;
  bounds_max_lon: number | null;

  visible: boolean;
  description: string | null;
}

export interface TrackListResponse {
  tracks: Track[];
  total: number;
  offset: number;
  limit: number;
}

export interface TrackGeometry {
  type: 'LineString';
  coordinates: [number, number, number?][];  // [lon, lat, ele?]
}

export interface UploadResult {
  success: boolean;
  message: string;
  track?: Track;
  duplicate: boolean;
}
```

---

## API Design

### Base URL
- **Local development**: `http://localhost:8005`
- **Production**: `https://www.doughughes.net/color-the-map/`

**Critical**: All API calls from frontend must use relative paths (no leading `/`).

### Endpoints

#### Tracks

**Upload Track**
```
POST api/v1/tracks
Content-Type: multipart/form-data

Body:
  file: <GPX file>

Response: 201 Created
{
  "success": true,
  "message": "Track uploaded successfully",
  "track": { <TrackResponse> },
  "duplicate": false
}

Response: 409 Conflict (duplicate)
{
  "success": false,
  "message": "Track already exists",
  "duplicate": true,
  "track": { <existing track> }
}

Response: 400 Bad Request (invalid file)
{
  "detail": "Invalid GPX file: <error message>"
}
```

**List Tracks**
```
GET api/v1/tracks?activity_type=Cycling&start_date=2024-01-01&end_date=2024-12-31&limit=100&offset=0

Response: 200 OK
{
  "tracks": [ <TrackResponse>... ],
  "total": 150,
  "offset": 0,
  "limit": 100
}
```

**Get Track Details**
```
GET api/v1/tracks/{id}

Response: 200 OK
{ <TrackResponse> }

Response: 404 Not Found
{ "detail": "Track not found" }
```

**Get Track Geometry**
```
GET api/v1/tracks/{id}/geometry

Response: 200 OK
{
  "type": "LineString",
  "coordinates": [[lon, lat, ele], ...]
}
```

**Update Track**
```
PATCH api/v1/tracks/{id}
Content-Type: application/json

Body:
{
  "name": "New name",
  "activity_type": "Running",
  "description": "Morning run",
  "visible": true
}

Response: 200 OK
{ <TrackResponse> }
```

**Delete Track**
```
DELETE api/v1/tracks/{id}

Response: 204 No Content

Response: 404 Not Found
{ "detail": "Track not found" }
```

**Bulk Update Visibility**
```
POST api/v1/tracks/bulk/visibility
Content-Type: application/json

Body:
{
  "track_ids": [1, 2, 3],
  "visible": false
}

Response: 200 OK
{
  "updated": 3
}
```

**Bulk Update Activity Type**
```
POST api/v1/tracks/bulk/activity-type
Content-Type: application/json

Body:
{
  "track_ids": [1, 2, 3],
  "activity_type": "Cycling"
}

Response: 200 OK
{
  "updated": 3
}
```

#### Spatial Queries

**Get Tracks in Viewport**
```
POST api/v1/spatial/viewport
Content-Type: application/json

Body:
{
  "min_lat": 35.9,
  "max_lat": 35.95,
  "min_lon": -79.1,
  "max_lon": -79.05
}

Response: 200 OK
{
  "track_ids": [1, 5, 12, 23, ...]
}
```

#### Statistics

**Get Summary Stats**
```
GET api/v1/stats/summary

Response: 200 OK
{
  "total_tracks": 150,
  "total_distance_km": 1250.5,
  "total_duration_hours": 87.3,
  "activity_types": {
    "Cycling": 75,
    "Running": 50,
    "Walking": 25
  },
  "date_range": {
    "first_activity": "2024-01-15T10:00:00Z",
    "last_activity": "2025-01-05T15:30:00Z"
  }
}
```

**Get Combined Stats for Selection**
```
POST api/v1/stats/combined
Content-Type: application/json

Body:
{
  "track_ids": [1, 2, 3]
}

Response: 200 OK
{
  "count": 3,
  "total_distance_meters": 45000,
  "total_duration_seconds": 7200,
  "date_range": {
    "earliest": "2024-06-01T10:00:00Z",
    "latest": "2024-06-15T15:30:00Z"
  }
}
```

#### Health Check

```
GET api/health

Response: 200 OK
{
  "status": "healthy",
  "database": "connected",
  "gpx_storage": "accessible"
}
```

---

## Frontend Architecture

### Component Structure

```
App (Root)
├── MapContainer
│   ├── MapLibreMap
│   ├── TrackLayer (renders tracks)
│   └── MapControls (zoom, center)
├── Sidebar (desktop only, hidden on mobile)
│   ├── UploadPanel
│   ├── TrackList
│   │   └── TrackListItem (repeated)
│   ├── Filters
│   │   ├── ActivityFilter
│   │   └── DateFilter
│   └── DetailsPanel (when track selected)
│       └── StatsPanel
└── MobileView (mobile only)
    └── MapContainer (full screen)
```

### State Management

**React Query** for server state:
- Track list
- Track geometry
- Statistics

**React Context** for UI state:
- Selected track IDs
- Map viewport
- Active filters
- Mobile/desktop view

**Local component state** for:
- Form inputs
- UI toggles
- Loading states

### Relative Path Configuration

**vite.config.ts**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '',  // CRITICAL: Empty string for relative paths
  build: {
    outDir: '../backend/static',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8005',  // Proxy API calls in dev
    },
  },
});
```

**API Client**
```typescript
// frontend/src/api/client.ts
const API_BASE = '';  // Relative paths only

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) throw new Error(response.statusText);
  return response.json();
}

// Usage
apiGet<TrackListResponse>('api/v1/tracks');  // NO leading slash
```

### MapLibre Configuration

```typescript
import maplibregl from 'maplibre-gl';

const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      'osm': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors'
      }
    },
    layers: [{
      id: 'osm',
      type: 'raster',
      source: 'osm'
    }]
  },
  center: [-79.0558, 35.9132],  // Chapel Hill fallback
  zoom: 13
});
```

**Track Rendering**
```typescript
map.addSource('tracks', {
  type: 'geojson',
  data: {
    type: 'FeatureCollection',
    features: tracks.map(track => ({
      type: 'Feature',
      geometry: trackGeometry,
      properties: { id: track.id, color: TRACK_COLOR }
    }))
  }
});

map.addLayer({
  id: 'track-lines',
  type: 'line',
  source: 'tracks',
  paint: {
    'line-color': ['get', 'color'],
    'line-width': 3,
    'line-opacity': 0.8
  }
});
```

---

## Key Design Patterns

### 1. Content-Addressable Storage

**Purpose**: Prevent duplicate GPX files, ensure data integrity.

**Implementation**:
```python
# backend/services/storage_service.py
import hashlib
from pathlib import Path

class StorageService:
    def __init__(self, storage_path: Path):
        self.storage_path = storage_path
        self.storage_path.mkdir(parents=True, exist_ok=True)

    def calculate_hash(self, content: bytes) -> str:
        """Hash minified GPX content (no whitespace)"""
        minified = self._minify_gpx(content)
        return hashlib.sha256(minified).hexdigest()

    def _minify_gpx(self, content: bytes) -> bytes:
        """Remove extra whitespace and line breaks"""
        import re
        text = content.decode('utf-8')
        # Remove whitespace between tags
        text = re.sub(r'>\s+<', '><', text)
        # Remove leading/trailing whitespace
        text = text.strip()
        return text.encode('utf-8')

    def store_gpx(self, gpx_hash: str, content: bytes) -> Path:
        file_path = self.storage_path / f"{gpx_hash}.gpx"
        if not file_path.exists():
            file_path.write_bytes(content)
        return file_path

    def load_gpx(self, gpx_hash: str) -> bytes:
        file_path = self.storage_path / f"{gpx_hash}.gpx"
        return file_path.read_bytes()

    def delete_gpx(self, gpx_hash: str) -> bool:
        file_path = self.storage_path / f"{gpx_hash}.gpx"
        if file_path.exists():
            file_path.unlink()
            return True
        return False
```

### 2. Activity Type Inference

**Strategy**: Try multiple methods in order of confidence.

```python
# backend/services/activity_inference.py
import re
from typing import Optional

class ActivityInferenceService:
    # Common patterns in GPX Export filenames
    PATTERNS = [
        r'^(Cycling|Walking|Running|Swimming|Hiking|Downhill Skiing|Multisport)\s+\d{4}',
        r'^(Cycling|Walking|Running|Swimming|Hiking|Downhill Skiing|Multisport)\s+\d{4}-\d{2}-\d{2}',
    ]

    def infer_from_filename(self, filename: str) -> Optional[str]:
        """Extract activity type from filename"""
        for pattern in self.PATTERNS:
            match = re.match(pattern, filename)
            if match:
                return match.group(1)
        return None

    def infer_from_speed(self, avg_speed_ms: float) -> Optional[str]:
        """Guess activity from average speed (less reliable)"""
        if avg_speed_ms < 2.0:  # < 7.2 km/h
            return "Walking"
        elif avg_speed_ms < 4.0:  # < 14.4 km/h
            return "Running"
        elif avg_speed_ms < 10.0:  # < 36 km/h
            return "Cycling"
        else:
            return "Skiing"  # or motorized

    def infer(self, filename: str, avg_speed_ms: Optional[float] = None) -> str:
        """Try multiple inference methods"""
        # Try filename first (most reliable)
        activity = self.infer_from_filename(filename)
        if activity:
            return activity

        # Try speed-based heuristic
        if avg_speed_ms:
            activity = self.infer_from_speed(avg_speed_ms)
            if activity:
                return activity

        return "Unknown"
```

### 3. Viewport-Based Track Loading

**Purpose**: Only load tracks visible in current map viewport.

```python
# backend/services/spatial_service.py
from typing import List

class SpatialService:
    def __init__(self, db):
        self.db = db

    def find_tracks_in_viewport(
        self,
        min_lat: float,
        max_lat: float,
        min_lon: float,
        max_lon: float,
        padding_percent: float = 1.0  # 100% padding = 2x viewport
    ) -> List[int]:
        """Find tracks intersecting viewport with padding"""
        # Add padding
        lat_range = max_lat - min_lat
        lon_range = max_lon - min_lon

        padded_min_lat = min_lat - (lat_range * padding_percent / 2)
        padded_max_lat = max_lat + (lat_range * padding_percent / 2)
        padded_min_lon = min_lon - (lon_range * padding_percent / 2)
        padded_max_lon = max_lon + (lon_range * padding_percent / 2)

        # Query R*Tree spatial index
        cursor = self.db.execute("""
            SELECT id FROM track_spatial
            WHERE max_lat >= ? AND min_lat <= ?
              AND max_lon >= ? AND min_lon <= ?
        """, (padded_min_lat, padded_max_lat, padded_min_lon, padded_max_lon))

        return [row[0] for row in cursor.fetchall()]
```

### 4. Service Layer Pattern

**Purpose**: Separate business logic from HTTP handling, enable testing.

```python
# backend/services/track_service.py
from typing import Optional, List
from datetime import datetime

class TrackService:
    def __init__(self, db, storage: StorageService, gpx_parser, activity_inference):
        self.db = db
        self.storage = storage
        self.gpx_parser = gpx_parser
        self.activity_inference = activity_inference

    async def upload_track(self, filename: str, content: bytes):
        # Calculate hash
        gpx_hash = self.storage.calculate_hash(content)

        # Check for duplicate
        existing = self.find_by_hash(gpx_hash)
        if existing:
            return {"duplicate": True, "track": existing}

        # Parse GPX
        gpx_data = self.gpx_parser.parse(content)

        # Infer activity type
        activity_type = self.activity_inference.infer(
            filename,
            gpx_data.get('avg_speed_ms')
        )

        # Store file
        self.storage.store_gpx(gpx_hash, content)

        # Save to database
        track = self._save_to_db(filename, gpx_hash, activity_type, gpx_data)

        return {"duplicate": False, "track": track}

    def find_by_hash(self, gpx_hash: str) -> Optional[dict]:
        cursor = self.db.execute(
            "SELECT * FROM tracks WHERE hash = ?",
            (gpx_hash,)
        )
        return cursor.fetchone()

    # ... other methods
```

### 5. GPX Parsing with Statistics

```python
# backend/services/gpx_parser.py
import gpxpy
from datetime import datetime
from typing import Dict, Any, List

class GPXParser:
    def parse(self, content: bytes) -> Dict[str, Any]:
        gpx = gpxpy.parse(content.decode('utf-8'))

        # Extract track points
        coordinates = []
        elevations = []
        timestamps = []
        speeds = []

        for track in gpx.tracks:
            for segment in track.segments:
                for point in segment.points:
                    coordinates.append([point.longitude, point.latitude])
                    if point.elevation:
                        elevations.append(point.elevation)
                    if point.time:
                        timestamps.append(point.time)

                    # Extract speed from extensions if available
                    speed = self._extract_speed(point)
                    if speed:
                        speeds.append(speed)

        # Calculate statistics
        stats = self._calculate_stats(coordinates, elevations, timestamps, speeds)

        return {
            'coordinates': coordinates,
            'bounds': self._calculate_bounds(coordinates),
            **stats
        }

    def _calculate_stats(self, coordinates, elevations, timestamps, speeds):
        # Distance using Haversine
        distance = self._calculate_distance(coordinates)

        # Duration
        duration = None
        if len(timestamps) >= 2:
            duration = (timestamps[-1] - timestamps[0]).total_seconds()

        # Speed (from data or calculated)
        avg_speed = None
        max_speed = None
        min_speed = None
        if speeds:
            avg_speed = sum(speeds) / len(speeds)
            max_speed = max(speeds)
            min_speed = min(speeds)
        elif duration and duration > 0:
            avg_speed = distance / duration

        # Elevation gain/loss
        elevation_gain = 0
        elevation_loss = 0
        if len(elevations) >= 2:
            for i in range(1, len(elevations)):
                diff = elevations[i] - elevations[i-1]
                if diff > 0:
                    elevation_gain += diff
                else:
                    elevation_loss += abs(diff)

        return {
            'distance_meters': distance,
            'duration_seconds': duration,
            'avg_speed_ms': avg_speed,
            'max_speed_ms': max_speed,
            'min_speed_ms': min_speed,
            'elevation_gain_meters': elevation_gain,
            'elevation_loss_meters': elevation_loss,
            'activity_date': timestamps[0] if timestamps else datetime.utcnow()
        }

    def _calculate_distance(self, coordinates: List[List[float]]) -> float:
        """Calculate total distance using Haversine formula"""
        from math import radians, sin, cos, sqrt, atan2

        total = 0
        for i in range(1, len(coordinates)):
            lon1, lat1 = coordinates[i-1]
            lon2, lat2 = coordinates[i]

            # Haversine formula
            R = 6371000  # Earth radius in meters
            phi1 = radians(lat1)
            phi2 = radians(lat2)
            dphi = radians(lat2 - lat1)
            dlambda = radians(lon2 - lon1)

            a = sin(dphi/2)**2 + cos(phi1) * cos(phi2) * sin(dlambda/2)**2
            c = 2 * atan2(sqrt(a), sqrt(1-a))
            total += R * c

        return total

    def _calculate_bounds(self, coordinates):
        lons = [c[0] for c in coordinates]
        lats = [c[1] for c in coordinates]
        return {
            'min_lat': min(lats),
            'max_lat': max(lats),
            'min_lon': min(lons),
            'max_lon': max(lons)
        }

    def _extract_speed(self, point) -> Optional[float]:
        """Extract speed from GPX extensions (Apple Health format)"""
        if hasattr(point, 'extensions'):
            for ext in point.extensions:
                if 'speed' in ext.tag.lower():
                    try:
                        return float(ext.text)
                    except:
                        pass
        return None
```

### 6. Track Simplification (Douglas-Peucker)

**Purpose**: Reduce coordinate count while preserving shape.

```python
# backend/services/simplification.py
from typing import List, Tuple

class TrackSimplifier:
    def __init__(self, epsilon: float = 0.00025):
        self.epsilon = epsilon  # Configurable tolerance

    def simplify(self, coordinates: List[Tuple[float, float]]) -> List[Tuple[float, float]]:
        """Douglas-Peucker algorithm"""
        if len(coordinates) <= 2:
            return coordinates

        return self._douglas_peucker(coordinates, self.epsilon)

    def _douglas_peucker(self, points, epsilon):
        # Find point with max distance from line
        dmax = 0
        index = 0
        end = len(points) - 1

        for i in range(1, end):
            d = self._perpendicular_distance(points[i], points[0], points[end])
            if d > dmax:
                index = i
                dmax = d

        # If max distance > epsilon, recursively simplify
        if dmax > epsilon:
            # Recursive call
            left = self._douglas_peucker(points[:index+1], epsilon)
            right = self._douglas_peucker(points[index:], epsilon)

            # Combine results
            return left[:-1] + right
        else:
            return [points[0], points[end]]

    def _perpendicular_distance(self, point, line_start, line_end):
        """Calculate perpendicular distance from point to line"""
        x, y = point
        x1, y1 = line_start
        x2, y2 = line_end

        # Handle vertical line
        if x2 == x1:
            return abs(x - x1)

        # Calculate distance
        numerator = abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1)
        denominator = ((y2 - y1)**2 + (x2 - x1)**2)**0.5

        return numerator / denominator if denominator > 0 else 0
```

---

## Configuration & Deployment

### Environment Configuration

**backend/config.py**
```python
from pathlib import Path
from typing import Optional
import os

class Config:
    # Paths
    BASE_DIR = Path(__file__).parent.parent
    DATA_DIR = BASE_DIR / "data"
    GPX_DIR = DATA_DIR / "gpx"
    DB_PATH = DATA_DIR / "tracks.db"
    STATIC_DIR = BASE_DIR / "backend" / "static"

    # Server
    HOST = "0.0.0.0"
    PORT = 8005

    # Upload limits
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
    ALLOWED_EXTENSIONS = {".gpx"}

    # Map defaults
    DEFAULT_CENTER = (-79.0558, 35.9132)  # Chapel Hill, NC
    DEFAULT_ZOOM = 13
    TRACK_COLOR = "#FF00FF"  # Magenta

    # Simplification
    SIMPLIFICATION_EPSILON = 0.00025  # Balanced

    # Viewport
    VIEWPORT_PADDING = 1.0  # 100% = 2x viewport

    @classmethod
    def ensure_dirs(cls):
        cls.DATA_DIR.mkdir(exist_ok=True)
        cls.GPX_DIR.mkdir(exist_ok=True)

config = Config()
```

### Deployment Configuration

**app.py** (Entry point for systemd)
```python
#!/usr/bin/env python3
"""
Entry point for systemd service.
Maintains compatibility with existing deployment.
"""
from backend.main import app
from backend.config import config

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(
        app,
        host=config.HOST,
        port=config.PORT,
        log_level="info"
    )
```

**deploy.sh** (Updated for frontend build)
```bash
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

# Run database migrations (if any)
echo "🗄️  Running database migrations..."
# alembic upgrade head  # Uncomment when migrations added

echo "🔧 Updating Caddy configuration..."
sudo ~/infrastructure/deploy.sh caddy

# Restart service
echo "🔄 Restarting service..."
sudo systemctl restart color-the-map

# Show status
echo "✅ Deployment complete!"
echo "📊 Service status:"
systemctl status color-the-map --no-pager
```

**color-the-map.service** (No changes needed)
```ini
[Unit]
Description=Color The Map - GPS Track Visualizer
After=network.target

[Service]
Type=simple
User=dhughes
WorkingDirectory=/home/dhughes/apps/color-the-map
ExecStart=/home/dhughes/apps/color-the-map/venv/bin/python app.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**caddy.conf** (No changes needed)
```
# Color The Map
redir /color-the-map /color-the-map/ 301

handle /color-the-map/* {
    forward_auth localhost:8000 {
        uri /verify
    }
    uri strip_prefix /color-the-map
    reverse_proxy localhost:8005
}
```

### Relative Path Handling

**Critical Pattern**: Because Caddy strips `/color-the-map` prefix before proxying, all URLs in the application must be relative.

**Frontend API calls:**
```typescript
// ✅ CORRECT
fetch('api/v1/tracks')
fetch('./api/v1/tracks')

// ❌ WRONG
fetch('/api/v1/tracks')  // Would become www.doughughes.net/api/v1/tracks
```

**Vite configuration:**
```typescript
// vite.config.ts
export default defineConfig({
  base: '',  // Empty string = relative paths
  // ...
});
```

**FastAPI static file serving:**
```python
# backend/main.py
from fastapi.staticfiles import StaticFiles

# API routes first
app.include_router(api_router, prefix="/api/v1")

# Serve built frontend (catch-all at end)
app.mount("/", StaticFiles(directory="backend/static", html=True), name="static")
```

---

## Testing Strategy

### Coverage Target
- **80% overall coverage**
- Focus on business logic (services, parsers)
- Less critical for routes (thin layer)

### Backend Testing

**Unit Tests** (no I/O):
```python
# tests/test_gpx_parser.py
from backend.services.gpx_parser import GPXParser

def test_parse_basic_gpx():
    parser = GPXParser()
    content = b'<?xml version="1.0"?>...'  # Sample GPX
    result = parser.parse(content)

    assert result['distance_meters'] > 0
    assert len(result['coordinates']) > 0
    assert 'bounds' in result

def test_calculate_distance():
    parser = GPXParser()
    coords = [
        [-79.0558, 35.9132],  # Chapel Hill
        [-79.0500, 35.9200]
    ]
    distance = parser._calculate_distance(coords)
    assert distance > 0
    assert distance < 10000  # Sanity check
```

**Integration Tests** (with database):
```python
# tests/test_track_service.py
import pytest
from backend.services.track_service import TrackService

@pytest.fixture
def track_service(tmp_path):
    # Setup test database and storage
    # ...
    return TrackService(db, storage, parser, inference)

def test_upload_track(track_service, sample_gpx):
    result = track_service.upload_track("test.gpx", sample_gpx)

    assert result['duplicate'] == False
    assert result['track']['name'] == "test"
    assert result['track']['distance_meters'] > 0

def test_duplicate_detection(track_service, sample_gpx):
    # First upload
    track_service.upload_track("test.gpx", sample_gpx)

    # Second upload (should detect duplicate)
    result = track_service.upload_track("test2.gpx", sample_gpx)

    assert result['duplicate'] == True
```

**API Tests** (end-to-end):
```python
# tests/test_api.py
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_upload_track(sample_gpx_file):
    response = client.post(
        "api/v1/tracks",
        files={"file": ("test.gpx", sample_gpx_file, "application/gpx+xml")}
    )

    assert response.status_code == 201
    data = response.json()
    assert data['success'] == True
    assert data['track']['name'] == "test"

def test_list_tracks():
    response = client.get("api/v1/tracks")

    assert response.status_code == 200
    data = response.json()
    assert 'tracks' in data
    assert 'total' in data
```

### Frontend Testing

**Component Tests**:
```typescript
// frontend/src/components/Map/MapContainer.test.tsx
import { render, screen } from '@testing-library/react';
import { MapContainer } from './MapContainer';

test('renders map container', () => {
  render(<MapContainer tracks={[]} />);
  const mapElement = screen.getByTestId('map-container');
  expect(mapElement).toBeInTheDocument();
});
```

**Hook Tests**:
```typescript
// frontend/src/hooks/useTracks.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useTracks } from './useTracks';

test('fetches tracks', async () => {
  const { result } = renderHook(() => useTracks());

  await waitFor(() => expect(result.current.isLoading).toBe(false));

  expect(result.current.tracks).toBeDefined();
  expect(Array.isArray(result.current.tracks)).toBe(true);
});
```

### Pre-commit Hooks

**.pre-commit-config.yaml**
```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.9
    hooks:
      - id: ruff
        args: [--fix, --exit-non-zero-on-fix]

  - repo: https://github.com/psf/black
    rev: 23.12.1
    hooks:
      - id: black

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.8.0
    hooks:
      - id: mypy
        additional_dependencies: [types-all]

  - repo: https://github.com/pre-commit/mirrors-eslint
    rev: v8.56.0
    hooks:
      - id: eslint
        files: \.(ts|tsx)$
        types: [file]
        args: [--fix]

  - repo: https://github.com/pre-commit/mirrors-prettier
    rev: v3.1.0
    hooks:
      - id: prettier
        files: \.(ts|tsx|json|css)$
```

---

## Performance Considerations

### Backend Optimization

**1. Spatial Indexing (R*Tree)**
- Essential for "tracks in viewport" queries
- O(log n) instead of O(n) for spatial queries
- Handles hundreds of tracks efficiently

**2. Connection Pooling**
- SQLite connection pool for concurrent requests
- Prevent "database is locked" errors

**3. Async I/O**
- Use FastAPI's async endpoints for file operations
- Non-blocking GPX file reads

**4. Caching Strategy (Future)**
- Cache simplified geometries
- Cache viewport query results (short TTL)
- Consider Redis for multi-process caching

### Frontend Optimization

**1. Viewport-Based Loading**
- Only load tracks visible in current viewport
- Use MapLibre's `moveend` event to update
- Debounce viewport changes (500ms)

**2. Track Simplification**
- Reduce coordinate count with Douglas-Peucker
- Different levels of detail per zoom level
- Pre-simplify on backend

**3. React Query Optimization**
```typescript
const { data: tracks } = useQuery({
  queryKey: ['tracks', viewport],
  queryFn: () => fetchTracksInViewport(viewport),
  staleTime: 5 * 60 * 1000,  // 5 minutes
  gcTime: 10 * 60 * 1000,     // 10 minutes (was cacheTime)
});
```

**4. Lazy Loading**
- Load track geometry only when needed
- Paginate track list (100 items at a time)
- Virtual scrolling for large lists

**5. MapLibre Performance**
- Use GeoJSON source with `generateId: true`
- Batch track updates instead of one-by-one
- Use MapLibre's built-in simplification
- Disable unused map features

### Database Optimization

**1. Index Strategy**
```sql
-- Already covered
CREATE INDEX idx_tracks_hash ON tracks(hash);
CREATE INDEX idx_tracks_type ON tracks(activity_type);
CREATE INDEX idx_tracks_date ON tracks(activity_date DESC);
CREATE VIRTUAL TABLE track_spatial USING rtree(...);
```

**2. Query Optimization**
- Use prepared statements (parameterized queries)
- ANALYZE after bulk inserts
- VACUUM periodically

**3. Connection Management**
- Set appropriate timeout values
- Use write-ahead logging (WAL mode)
- Set pragmas for performance

```python
# backend/db/database.py
import sqlite3

def init_db(db_path):
    conn = sqlite3.connect(db_path, check_same_thread=False)

    # Performance pragmas
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=-64000")  # 64MB cache
    conn.execute("PRAGMA temp_store=MEMORY")

    # Enable R*Tree
    conn.enable_load_extension(True)

    return conn
```

---

## Security Considerations

### Backend Security

**1. File Upload Validation**
```python
# Validate file extension
if not filename.endswith('.gpx'):
    raise ValueError("Only GPX files allowed")

# Validate file size
if len(content) > MAX_FILE_SIZE:
    raise ValueError("File too large")

# Validate GPX structure (parsing will catch invalid XML)
try:
    gpx_data = gpx_parser.parse(content)
except Exception as e:
    raise ValueError(f"Invalid GPX: {e}")
```

**2. SQL Injection Prevention**
- Always use parameterized queries
- Never concatenate user input into SQL

```python
# ✅ CORRECT
cursor.execute("SELECT * FROM tracks WHERE id = ?", (track_id,))

# ❌ WRONG
cursor.execute(f"SELECT * FROM tracks WHERE id = {track_id}")
```

**3. Path Traversal Prevention**
- Use hash-based filenames (no user input)
- Validate all file paths

```python
# Storage paths are hash-based, no user input
file_path = GPX_DIR / f"{gpx_hash}.gpx"  # Safe
```

**4. CORS Configuration**
```python
# backend/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Frontend Security

**1. Content Security Policy**
```html
<!-- public/index.html -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               img-src 'self' https://tile.openstreetmap.org;
               script-src 'self' 'unsafe-inline';
               style-src 'self' 'unsafe-inline';">
```

**2. XSS Prevention**
- React automatically escapes content
- Never use `dangerouslySetInnerHTML` with user input
- Sanitize any user-provided HTML/URLs

### Authentication

Handled by Caddy's `forward_auth` to separate auth service. Application assumes authenticated requests only.

---

## Monitoring & Logging

### Backend Logging

```python
# backend/main.py
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('data/app.log'),
        logging.StreamHandler()  # For systemd
    ]
)

logger = logging.getLogger(__name__)

@app.post("/api/v1/tracks")
async def upload_track(file: UploadFile):
    logger.info(f"Upload started: {file.filename}")
    try:
        result = await track_service.upload(file.filename, await file.read())
        logger.info(f"Upload complete: {result['track']['id']}")
        return result
    except Exception as e:
        logger.error(f"Upload failed: {e}", exc_info=True)
        raise
```

### Health Monitoring

```python
# backend/api/routes.py
@router.get("/health")
async def health_check():
    # Check database
    try:
        db.execute("SELECT 1")
        db_status = "connected"
    except:
        db_status = "disconnected"

    # Check GPX storage
    storage_status = "accessible" if GPX_DIR.exists() else "not_found"

    healthy = db_status == "connected" and storage_status == "accessible"

    return {
        "status": "healthy" if healthy else "unhealthy",
        "database": db_status,
        "gpx_storage": storage_status
    }
```

### Systemd Journal

View logs:
```bash
journalctl -u color-the-map -f
```

---

## Future Enhancements

### Phase 2+ Features (Not in MVP)
1. **Color-coding by speed**: Gradient from red (slow) to green (fast)
2. **Heatmap visualization**: Density map of most-traveled areas
3. **Weather integration**: Historical weather at activity time/location
4. **Coverage statistics**: Percentage of city roads covered
5. **Export functionality**: Export track data, generate reports
6. **Track editing**: Split/merge tracks, trim endpoints
7. **Comparison views**: Compare multiple tracks side-by-side
8. **Social features**: Share tracks, leaderboards (multi-user)

### Technical Debt to Address
1. **Database migrations**: Set up Alembic properly
2. **Comprehensive error handling**: User-friendly error messages
3. **Rate limiting**: Prevent upload abuse
4. **Backup automation**: Automated database backups
5. **Performance monitoring**: Track API response times
6. **E2E testing**: Playwright or Cypress for full workflows

---

## References

### External Documentation
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [MapLibre GL JS Documentation](https://maplibre.org/maplibre-gl-js/docs/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [SQLite R*Tree Documentation](https://www.sqlite.org/rtree.html)
- [gpxpy Documentation](https://github.com/tkrajina/gpxpy)

### Internal Documentation
- [ROADMAP.md](./ROADMAP.md) - Feature implementation sequence
- [Feature Prompts](./feature-prompts/) - Step-by-step implementation guides
- [CLAUDE.md](../CLAUDE.md) - Claude Code guidance

---

**Document Version**: 1.0
**Last Updated**: 2026-01-05
**Status**: Initial architecture design, ready for implementation
