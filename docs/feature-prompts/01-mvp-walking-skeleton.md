# Feature 1: MVP Walking Skeleton

**Status**: Not Started
**Dependencies**: None (first feature)
**Estimated Time**: 3-5 days
**Priority**: Critical

---

## Goal

Prove the entire stack works end-to-end by implementing the minimal viable product: upload a single GPX file and see it rendered on an interactive map. This establishes the foundation for all future features.

---

## Context

See [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) for complete technical specifications.

**Key Architectural Decisions:**
- FastAPI backend (pure API) + React TypeScript frontend (SPA)
- SQLite with R*Tree spatial indexing
- Content-addressable GPX storage (files named by SHA256 hash)
- MapLibre GL JS for map rendering (WebGL, handles large datasets)
- All paths must be relative (Caddy proxy strips `/color-the-map` prefix)
- Port 8005 for local and production

**Current State:**
- Flask "Hello World" skeleton exists
- Deployment infrastructure in place (systemd, Caddy, deploy scripts)
- Sample GPX files in `sample-gpx-files/` for testing

---

## What You're Building

### Backend
1. FastAPI application structure
2. GPX file upload endpoint
3. GPX parser service (extract coordinates + metadata)
4. Content-addressable storage service (SHA256-based filenames)
5. SQLite database with tracks table
6. Basic track retrieval endpoints

### Frontend
1. React + TypeScript + Vite project
2. MapLibre GL JS map component
3. Simple upload button/form
4. Track display on map
5. Basic track metadata display

### Infrastructure
1. Updated deployment scripts (frontend build)
2. Static file serving from FastAPI
3. Relative path configuration throughout

---

## Acceptance Criteria

- [ ] User can click "Upload" button and select a .gpx file
- [ ] File is validated (extension, size < 10MB)
- [ ] File content hashed (SHA256 of minified GPX)
- [ ] File stored in `data/gpx/{hash}.gpx`
- [ ] Track metadata extracted and saved to SQLite
- [ ] Track geometry parsed (list of [lon, lat, ele] coordinates)
- [ ] Map renders with OpenStreetMap tiles
- [ ] Track renders as a line on the map
- [ ] Map centers and zooms to fit track bounds
- [ ] Track metadata displayed: filename, distance, date
- [ ] Frontend build integrated into deploy.sh
- [ ] Application deploys successfully via deploy-to-prod.sh
- [ ] All relative paths work in production (`/color-the-map` prefix)
- [ ] Can test with sample files in `sample-gpx-files/`

---

## Implementation Sequence

### Step 1: Clean Up Existing Code

**Delete Flask template directory:**
```bash
rm -rf templates/
```

**Note**: We'll keep `app.py` as the entry point but completely rewrite it for FastAPI (required for systemd compatibility). We'll also replace `requirements.txt` with new FastAPI dependencies.

**Reasoning**: Starting fresh with FastAPI + React, but maintaining the same entry point for systemd service.

---

### Step 2: Setup Backend Structure

**Create directory structure:**
```bash
mkdir -p backend/{api,services,db,tests,static}
mkdir -p data/gpx
```

**Note**: `backend/static` will hold the built frontend. During development it won't exist yet, so FastAPI handles this gracefully with a try/except.

**Create files:**
- `backend/__init__.py`
- `backend/config.py`
- `backend/main.py`
- `backend/api/__init__.py`
- `backend/api/routes.py`
- `backend/api/models.py`
- `backend/services/__init__.py`
- `backend/services/gpx_parser.py`
- `backend/services/storage_service.py`
- `backend/services/track_service.py`
- `backend/db/__init__.py`
- `backend/db/database.py`
- `backend/db/schema.sql`

**Key file: `backend/config.py`**
```python
from pathlib import Path

class Config:
    BASE_DIR = Path(__file__).parent.parent
    DATA_DIR = BASE_DIR / "data"
    GPX_DIR = DATA_DIR / "gpx"
    DB_PATH = DATA_DIR / "tracks.db"
    STATIC_DIR = BASE_DIR / "backend" / "static"

    HOST = "0.0.0.0"
    PORT = 8005

    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
    ALLOWED_EXTENSIONS = {".gpx"}

    DEFAULT_CENTER = (-79.0558, 35.9132)  # Chapel Hill, NC
    DEFAULT_ZOOM = 13
    TRACK_COLOR = "#FF00FF"  # Magenta

    @classmethod
    def ensure_dirs(cls):
        cls.DATA_DIR.mkdir(exist_ok=True)
        cls.GPX_DIR.mkdir(exist_ok=True)

config = Config()
```

---

### Step 3: Implement Database Layer

**Create database schema (`backend/db/schema.sql`):**
```sql
CREATE TABLE IF NOT EXISTS tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    filename TEXT NOT NULL,
    activity_type TEXT,
    activity_type_inferred TEXT,       -- Original inference (preserved)
    activity_date TIMESTAMP NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    distance_meters REAL,
    duration_seconds INTEGER,
    avg_speed_ms REAL,
    max_speed_ms REAL,
    min_speed_ms REAL,
    elevation_gain_meters REAL,
    elevation_loss_meters REAL,

    bounds_min_lat REAL,
    bounds_min_lon REAL,
    bounds_max_lat REAL,
    bounds_max_lon REAL,

    visible BOOLEAN DEFAULT TRUE,
    description TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tracks_hash ON tracks(hash);
CREATE INDEX IF NOT EXISTS idx_tracks_date ON tracks(activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_type ON tracks(activity_type);

-- R*Tree spatial index (for Feature 2, but created now to avoid migrations)
CREATE VIRTUAL TABLE IF NOT EXISTS track_spatial USING rtree(
    id,                 -- track ID
    min_lat, max_lat,
    min_lon, max_lon
);
```

**Implement database connection (`backend/db/database.py`):**
```python
import sqlite3
from pathlib import Path
from contextlib import contextmanager

class Database:
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Initialize database and run schema"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row

        # Performance pragmas
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")

        # Run schema
        schema_path = Path(__file__).parent / "schema.sql"
        with open(schema_path) as f:
            conn.executescript(f.read())

        conn.close()

    @contextmanager
    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
```

---

### Step 4: Implement Storage Service

**Create storage service (`backend/services/storage_service.py`):**
```python
import hashlib
import re
from pathlib import Path
from typing import Optional

class StorageService:
    def __init__(self, storage_path: Path):
        self.storage_path = storage_path
        self.storage_path.mkdir(parents=True, exist_ok=True)

    def calculate_hash(self, content: bytes) -> str:
        """Calculate SHA256 hash of minified GPX content"""
        minified = self._minify_gpx(content)
        return hashlib.sha256(minified).hexdigest()

    def _minify_gpx(self, content: bytes) -> bytes:
        """Remove extra whitespace and line breaks"""
        text = content.decode('utf-8')
        # Remove whitespace between tags
        text = re.sub(r'>\s+<', '><', text)
        text = text.strip()
        return text.encode('utf-8')

    def store_gpx(self, gpx_hash: str, content: bytes) -> Path:
        """Store GPX file by hash (idempotent)"""
        file_path = self.storage_path / f"{gpx_hash}.gpx"
        if not file_path.exists():
            file_path.write_bytes(content)
        return file_path

    def load_gpx(self, gpx_hash: str) -> Optional[bytes]:
        """Load GPX file by hash"""
        file_path = self.storage_path / f"{gpx_hash}.gpx"
        if not file_path.exists():
            return None
        return file_path.read_bytes()

    def delete_gpx(self, gpx_hash: str) -> bool:
        """Delete GPX file"""
        file_path = self.storage_path / f"{gpx_hash}.gpx"
        if file_path.exists():
            file_path.unlink()
            return True
        return False
```

---

### Step 5: Implement GPX Parser

**Install dependency:**
```bash
pip install gpxpy
```

**Create GPX parser (`backend/services/gpx_parser.py`):**
```python
import gpxpy
from datetime import datetime
from typing import Dict, Any, List
from math import radians, sin, cos, sqrt, atan2

class GPXParser:
    def parse(self, content: bytes) -> Dict[str, Any]:
        """Parse GPX file and extract metadata + coordinates"""
        gpx = gpxpy.parse(content.decode('utf-8'))

        coordinates = []
        elevations = []
        timestamps = []

        # Extract all track points
        for track in gpx.tracks:
            for segment in track.segments:
                for point in segment.points:
                    coordinates.append([point.longitude, point.latitude])
                    if point.elevation:
                        elevations.append(point.elevation)
                    if point.time:
                        timestamps.append(point.time)

        if not coordinates:
            raise ValueError("No track points found in GPX file")

        # Calculate statistics
        distance = self._calculate_distance(coordinates)
        duration = self._calculate_duration(timestamps)
        speed_stats = self._calculate_speed(distance, duration)
        elevation_stats = self._calculate_elevation(elevations)
        bounds = self._calculate_bounds(coordinates)
        activity_date = timestamps[0] if timestamps else datetime.utcnow()

        return {
            'coordinates': coordinates,
            'distance_meters': distance,
            'duration_seconds': duration,
            'avg_speed_ms': speed_stats['avg'],
            'max_speed_ms': speed_stats['max'],
            'min_speed_ms': speed_stats['min'],
            'elevation_gain_meters': elevation_stats['gain'],
            'elevation_loss_meters': elevation_stats['loss'],
            'bounds_min_lat': bounds['min_lat'],
            'bounds_max_lat': bounds['max_lat'],
            'bounds_min_lon': bounds['min_lon'],
            'bounds_max_lon': bounds['max_lon'],
            'activity_date': activity_date
        }

    def _calculate_distance(self, coordinates: List[List[float]]) -> float:
        """Calculate total distance using Haversine formula"""
        total = 0.0
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

    def _calculate_duration(self, timestamps: List[datetime]) -> int:
        """Calculate duration in seconds"""
        if len(timestamps) < 2:
            return 0
        return int((timestamps[-1] - timestamps[0]).total_seconds())

    def _calculate_speed(self, distance: float, duration: int) -> Dict[str, float]:
        """Calculate speed statistics"""
        avg_speed = distance / duration if duration > 0 else 0
        return {
            'avg': avg_speed,
            'max': avg_speed,  # Simplified for MVP
            'min': avg_speed
        }

    def _calculate_elevation(self, elevations: List[float]) -> Dict[str, float]:
        """Calculate elevation gain and loss"""
        gain = 0.0
        loss = 0.0

        for i in range(1, len(elevations)):
            diff = elevations[i] - elevations[i-1]
            if diff > 0:
                gain += diff
            else:
                loss += abs(diff)

        return {'gain': gain, 'loss': loss}

    def _calculate_bounds(self, coordinates: List[List[float]]) -> Dict[str, float]:
        """Calculate bounding box"""
        lons = [c[0] for c in coordinates]
        lats = [c[1] for c in coordinates]

        return {
            'min_lat': min(lats),
            'max_lat': max(lats),
            'min_lon': min(lons),
            'max_lon': max(lons)
        }
```

---

### Step 6: Implement Track Service

**Create track service (`backend/services/track_service.py`):**
```python
from pathlib import Path
from typing import Optional, Dict, Any
from .gpx_parser import GPXParser
from .storage_service import StorageService
from ..db.database import Database

class TrackService:
    def __init__(self, db: Database, storage: StorageService, parser: GPXParser):
        self.db = db
        self.storage = storage
        self.parser = parser

    def upload_track(self, filename: str, content: bytes) -> Dict[str, Any]:
        """Upload and process GPX track"""
        # Calculate hash
        gpx_hash = self.storage.calculate_hash(content)

        # Check for duplicate
        with self.db.get_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM tracks WHERE hash = ?",
                (gpx_hash,)
            )
            existing = cursor.fetchone()

        if existing:
            return {
                'duplicate': True,
                'track': dict(existing)
            }

        # Parse GPX
        try:
            gpx_data = self.parser.parse(content)
        except Exception as e:
            raise ValueError(f"Invalid GPX file: {e}")

        # Store file
        self.storage.store_gpx(gpx_hash, content)

        # Save to database
        name = Path(filename).stem  # Remove .gpx extension
        activity_type = "Unknown"  # Will be enhanced in Feature 3
        with self.db.get_connection() as conn:
            cursor = conn.execute("""
                INSERT INTO tracks (
                    hash, name, filename, activity_type, activity_type_inferred,
                    activity_date, distance_meters, duration_seconds,
                    avg_speed_ms, max_speed_ms, min_speed_ms,
                    elevation_gain_meters, elevation_loss_meters,
                    bounds_min_lat, bounds_max_lat,
                    bounds_min_lon, bounds_max_lon
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                gpx_hash, name, filename, activity_type, activity_type,
                gpx_data['activity_date'],
                gpx_data['distance_meters'], gpx_data['duration_seconds'],
                gpx_data['avg_speed_ms'], gpx_data['max_speed_ms'], gpx_data['min_speed_ms'],
                gpx_data['elevation_gain_meters'], gpx_data['elevation_loss_meters'],
                gpx_data['bounds_min_lat'], gpx_data['bounds_max_lat'],
                gpx_data['bounds_min_lon'], gpx_data['bounds_max_lon']
            ))

            track_id = cursor.lastrowid

            # Insert into spatial index (for Feature 2, but created now)
            conn.execute("""
                INSERT INTO track_spatial (id, min_lat, max_lat, min_lon, max_lon)
                VALUES (?, ?, ?, ?, ?)
            """, (
                track_id,
                gpx_data['bounds_min_lat'], gpx_data['bounds_max_lat'],
                gpx_data['bounds_min_lon'], gpx_data['bounds_max_lon']
            ))

            # Fetch complete track
            cursor = conn.execute("SELECT * FROM tracks WHERE id = ?", (track_id,))
            track = dict(cursor.fetchone())

        # Add coordinates (not stored in DB for MVP)
        track['coordinates'] = gpx_data['coordinates']

        return {
            'duplicate': False,
            'track': track
        }

    def get_track(self, track_id: int) -> Optional[Dict]:
        """Get track by ID"""
        with self.db.get_connection() as conn:
            cursor = conn.execute("SELECT * FROM tracks WHERE id = ?", (track_id,))
            track = cursor.fetchone()

        if not track:
            return None

        track_dict = dict(track)

        # Load coordinates from GPX file
        gpx_content = self.storage.load_gpx(track_dict['hash'])
        if gpx_content:
            gpx_data = self.parser.parse(gpx_content)
            track_dict['coordinates'] = gpx_data['coordinates']

        return track_dict
```

---

### Step 7: Create API Endpoints

**Create Pydantic models (`backend/api/models.py`):**
```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class TrackResponse(BaseModel):
    id: int
    hash: str
    name: str
    filename: str
    activity_date: datetime
    distance_meters: Optional[float]
    duration_seconds: Optional[int]
    avg_speed_ms: Optional[float]
    elevation_gain_meters: Optional[float]
    elevation_loss_meters: Optional[float]
    bounds_min_lat: Optional[float]
    bounds_max_lat: Optional[float]
    bounds_min_lon: Optional[float]
    bounds_max_lon: Optional[float]
    coordinates: Optional[List[List[float]]] = None

class UploadResult(BaseModel):
    success: bool
    message: str
    track: Optional[TrackResponse] = None
    duplicate: bool = False
```

**Create API routes (`backend/api/routes.py`):**
```python
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from .models import TrackResponse, UploadResult
from ..services.track_service import TrackService
from ..config import config

router = APIRouter()

# Dependency injection (simple version for MVP)
from ..db.database import Database
from ..services.storage_service import StorageService
from ..services.gpx_parser import GPXParser

db = Database(config.DB_PATH)
storage = StorageService(config.GPX_DIR)
parser = GPXParser()
track_service = TrackService(db, storage, parser)

@router.post("/tracks", response_model=UploadResult, status_code=status.HTTP_201_CREATED)
async def upload_track(file: UploadFile = File(...)):
    """Upload a GPX file"""
    # Validate file extension
    if not file.filename.endswith('.gpx'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only GPX files are allowed"
        )

    # Read file content
    content = await file.read()

    # Validate file size
    if len(content) > config.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large (max {config.MAX_FILE_SIZE / 1024 / 1024}MB)"
        )

    # Upload track
    try:
        result = track_service.upload_track(file.filename, content)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    if result['duplicate']:
        return UploadResult(
            success=False,
            message="Track already exists",
            duplicate=True,
            track=TrackResponse(**result['track'])
        )

    return UploadResult(
        success=True,
        message="Track uploaded successfully",
        track=TrackResponse(**result['track']),
        duplicate=False
    )

@router.get("/tracks/{track_id}", response_model=TrackResponse)
async def get_track(track_id: int):
    """Get track by ID with coordinates"""
    track = track_service.get_track(track_id)

    if not track:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Track not found"
        )

    return TrackResponse(**track)
```

---

### Step 8: Create FastAPI Main Application

**Create main app (`backend/main.py`):**
```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import router as api_router
from .config import config

# Ensure data directories exist
config.ensure_dirs()

app = FastAPI(
    title="Color The Map",
    description="GPS Track Visualization API",
    version="1.0.0"
)

# CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(api_router, prefix="/api/v1", tags=["tracks"])

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

# Serve static frontend (after API routes)
try:
    app.mount("/", StaticFiles(directory=config.STATIC_DIR, html=True), name="static")
except RuntimeError:
    # Static dir doesn't exist yet (dev mode)
    pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=config.HOST, port=config.PORT)
```

**Create entry point (`app.py` for systemd compatibility):**
```python
#!/usr/bin/env python3
from backend.main import app
from backend.config import config

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host=config.HOST, port=config.PORT)
```

**Create requirements.txt:**
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
gpxpy==1.6.2
pydantic==2.5.3
python-multipart==0.0.6
```

---

### Step 9: Setup Frontend

**Initialize React + TypeScript project:**
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install maplibre-gl
npm install @tanstack/react-query
```

**Configure Vite (`frontend/vite.config.ts`):**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '',  // CRITICAL: Relative paths for Caddy proxy
  build: {
    outDir: '../backend/static',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8005',
        changeOrigin: true,
      },
    },
  },
})
```

**Create config (`frontend/src/config.ts`):**
```typescript
export const config = {
  mapCenter: [-79.0558, 35.9132] as [number, number],  // Chapel Hill, NC
  mapZoom: 13,
  trackColor: '#FF00FF',  // Magenta
} as const
```

**Create types (`frontend/src/types/track.ts`):**
```typescript
export interface Track {
  id: number
  hash: string
  name: string
  filename: string
  activity_type: string | null
  activity_type_inferred: string | null
  activity_date: string
  uploaded_at: string

  distance_meters: number | null
  duration_seconds: number | null
  avg_speed_ms: number | null
  max_speed_ms: number | null
  min_speed_ms: number | null
  elevation_gain_meters: number | null
  elevation_loss_meters: number | null

  bounds_min_lat: number | null
  bounds_max_lat: number | null
  bounds_min_lon: number | null
  bounds_max_lon: number | null

  visible: boolean
  description: string | null

  created_at: string
  updated_at: string

  coordinates?: [number, number][]  // Loaded separately
}

export interface UploadResult {
  success: boolean
  message: string
  track?: Track
  duplicate: boolean
}
```

---

### Step 10: Create API Client

**Create API client (`frontend/src/api/client.ts`):**
```typescript
const API_BASE = ''  // Relative paths only

export async function uploadGPX(file: File): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE}api/v1/tracks`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }))
    throw new Error(error.detail || 'Upload failed')
  }

  return response.json()
}

export async function getTrack(trackId: number): Promise<Track> {
  const response = await fetch(`${API_BASE}api/v1/tracks/${trackId}`)

  if (!response.ok) {
    throw new Error('Failed to load track')
  }

  return response.json()
}
```

---

### Step 11: Create Map Component

**Install MapLibre styles:**
```bash
cd frontend
npm install maplibre-gl
```

**Add MapLibre CSS to `frontend/src/index.css`:**
```css
@import 'maplibre-gl/dist/maplibre-gl.css';

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

#root {
  height: 100vh;
}
```

**Create Map component (`frontend/src/components/Map.tsx`):**
```typescript
import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { config } from '../config'
import type { Track } from '../types/track'

interface MapProps {
  track: Track | null
}

export function Map({ track }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
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
      center: config.mapCenter,
      zoom: config.mapZoom
    })

    return () => {
      map.current?.remove()
    }
  }, [])

  // Update track when it changes
  useEffect(() => {
    if (!map.current || !track?.coordinates) return

    const mapInstance = map.current

    // Remove existing track layer/source if present
    if (mapInstance.getLayer('track-line')) {
      mapInstance.removeLayer('track-line')
    }
    if (mapInstance.getSource('track')) {
      mapInstance.removeSource('track')
    }

    // Add track source
    mapInstance.addSource('track', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: track.coordinates
        }
      }
    })

    // Add track layer
    mapInstance.addLayer({
      id: 'track-line',
      type: 'line',
      source: 'track',
      paint: {
        'line-color': config.trackColor,
        'line-width': 3,
        'line-opacity': 0.8
      }
    })

    // Fit map to track bounds
    if (track.bounds_min_lat && track.bounds_max_lat &&
        track.bounds_min_lon && track.bounds_max_lon) {
      mapInstance.fitBounds([
        [track.bounds_min_lon, track.bounds_min_lat],
        [track.bounds_max_lon, track.bounds_max_lat]
      ], {
        padding: 50
      })
    }
  }, [track])

  return (
    <div
      ref={mapContainer}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
```

---

### Step 12: Create Upload Component

**Create Upload component (`frontend/src/components/Upload.tsx`):**
```typescript
import { useState } from 'react'
import { uploadGPX } from '../api/client'
import type { Track } from '../types/track'

interface UploadProps {
  onUploadSuccess: (track: Track) => void
}

export function Upload({ onUploadSuccess }: UploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const result = await uploadGPX(file)

      if (result.duplicate) {
        alert('This track already exists!')
      }

      if (result.track) {
        onUploadSuccess(result.track)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      // Reset file input
      e.target.value = ''
    }
  }

  return (
    <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 1000 }}>
      <label
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          borderRadius: '4px',
          cursor: uploading ? 'not-allowed' : 'pointer',
          opacity: uploading ? 0.6 : 1
        }}
      >
        {uploading ? 'Uploading...' : 'Upload GPX'}
        <input
          type="file"
          accept=".gpx"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: 'none' }}
        />
      </label>
      {error && (
        <div style={{
          marginTop: '10px',
          padding: '10px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}
    </div>
  )
}
```

---

### Step 13: Create Track Info Component

**Create TrackInfo component (`frontend/src/components/TrackInfo.tsx`):**
```typescript
import type { Track } from '../types/track'

interface TrackInfoProps {
  track: Track
}

export function TrackInfo({ track }: TrackInfoProps) {
  const formatDistance = (meters: number | null) => {
    if (!meters) return 'N/A'
    return `${(meters / 1000).toFixed(2)} km`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      left: 20,
      padding: '15px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      zIndex: 1000
    }}>
      <h3 style={{ margin: '0 0 10px 0' }}>{track.name}</h3>
      <div style={{ fontSize: '14px' }}>
        <div><strong>Date:</strong> {formatDate(track.activity_date)}</div>
        <div><strong>Distance:</strong> {formatDistance(track.distance_meters)}</div>
      </div>
    </div>
  )
}
```

---

### Step 14: Create Main App Component

**Update `frontend/src/App.tsx`:**
```typescript
import { useState } from 'react'
import { Map } from './components/Map'
import { Upload } from './components/Upload'
import { TrackInfo } from './components/TrackInfo'
import type { Track } from './types/track'
import './index.css'

function App() {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Map track={currentTrack} />
      <Upload onUploadSuccess={setCurrentTrack} />
      {currentTrack && <TrackInfo track={currentTrack} />}
    </div>
  )
}

export default App
```

---

### Step 15: Update Deployment Scripts

**Update `deploy.sh`:**
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

---

### Step 16: Testing

**Test locally:**
```bash
# Terminal 1: Run backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python ../app.py

# Terminal 2: Run frontend dev server
cd frontend
npm run dev
```

**Test upload:**
1. Open http://localhost:5173
2. Click "Upload GPX"
3. Select a file from `sample-gpx-files/`
4. Verify track renders on map
5. Verify track info displays

**Test deployment:**
```bash
# Build frontend
cd frontend
npm run build
cd ..

# Run backend (serves built frontend)
python app.py

# Test at http://localhost:8005
# Verify relative paths work (no 404s in console)
```

---

## Key Files to Read

Before implementation, read these existing files:
- `CLAUDE.md` - Project guidance and constraints
- `docs/ARCHITECTURE.md` - Complete technical specification
- `caddy.conf` - Understand path stripping
- `sample-gpx-files/` - Test data examples
- `color-the-map.service` - Systemd configuration
- `deploy.sh` - Current deployment process

---

## Testing Requirements

### Unit Tests

**Create `backend/tests/test_gpx_parser.py`:**
```python
import pytest
from backend.services.gpx_parser import GPXParser

def test_parse_basic_gpx():
    parser = GPXParser()

    # Use sample GPX file
    with open('sample-gpx-files/Cycling 2025-12-19T211415Z.gpx', 'rb') as f:
        content = f.read()

    result = parser.parse(content)

    assert result['distance_meters'] > 0
    assert len(result['coordinates']) > 0
    assert 'bounds_min_lat' in result
    assert 'activity_date' in result
```

**Create `backend/tests/test_storage.py`:**
```python
import pytest
from pathlib import Path
from backend.services.storage_service import StorageService

def test_calculate_hash(tmp_path):
    storage = StorageService(tmp_path)

    content = b'<gpx>test</gpx>'
    hash1 = storage.calculate_hash(content)

    assert len(hash1) == 64  # SHA256 hex length

    # Same content = same hash
    hash2 = storage.calculate_hash(content)
    assert hash1 == hash2
```

### Manual Testing

- [ ] Upload sample GPX file
- [ ] Verify track renders on map
- [ ] Verify track info displays correctly
- [ ] Test duplicate upload (should show message)
- [ ] Test invalid file upload (should show error)
- [ ] Test file too large (should show error)
- [ ] Verify relative paths in production
- [ ] Test on mobile device (responsive)

---

## Common Pitfalls

1. **Relative paths**: Must use empty string for API_BASE, not `/`
2. **CORS**: Remember to add Vite dev server to CORS origins
3. **Static files**: Backend static directory doesn't exist until frontend built
4. **Coordinates order**: GPX uses lat/lon, GeoJSON uses [lon, lat]
5. **File extension**: Remove `.gpx` from filename for track name
6. **Hash calculation**: Must minify GPX content before hashing

---

## Success Verification

When complete, you should be able to:
1. Visit production URL: https://www.doughughes.net/color-the-map/
2. Upload a GPX file
3. See the track rendered on the map
4. See track metadata displayed
5. Upload the same file again (duplicate detected)
6. Upload multiple different files

---

## Next Steps

After Feature 1 is complete and deployed:
- Update ROADMAP.md status
- Move to Feature 2: Multi-Track Rendering & Management
- Consider adding error logging for production monitoring

---

**Prompt Version**: 1.0
**Last Updated**: 2026-01-05
