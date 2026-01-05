# Feature 2: Multi-Track Rendering & Management

**Status**: Not Started
**Dependencies**: Feature 1 (MVP must work)
**Estimated Time**: 4-6 days
**Priority**: High

---

## Goal

Enable users to view and manage multiple GPS tracks simultaneously on the map. Implement viewport-based loading for performance with hundreds of tracks. Add a track list sidebar for browsing and basic management.

---

## Context

See [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) for technical specifications.

**Building On:**
- Feature 1 provides: Single track upload/display, database, services
- You're adding: Multiple tracks, track list UI, spatial queries, selection

**Key Requirements:**
- Right sidebar with scrollable track list (desktop only)
- Display: track name, activity type, eye icon for visibility toggle
- Single-click selects a track
- Viewport-based rendering (only load tracks visible in map)
- R*Tree spatial indexing for fast "tracks in viewport" queries
- Mobile view: Hide sidebar, show map only (640px breakpoint)

---

## Acceptance Criteria

- [ ] Can upload multiple tracks (reuse Feature 1 upload)
- [ ] Right sidebar shows all tracks (sorted by date, newest first)
- [ ] Track list items show: name, activity type, eye icon
- [ ] Clicking track in list selects it (highlights in list)
- [ ] Clicking eye icon toggles track visibility on/off
- [ ] Map renders only visible tracks
- [ ] Only tracks in viewport (+100% padding) are loaded
- [ ] R*Tree spatial index working for bbox queries
- [ ] Selected track highlighted on map (brighter color)
- [ ] Mobile (< 640px): Sidebar hidden, map full screen
- [ ] Performance: 50+ tracks render smoothly
- [ ] Tracks remain visible after page reload

---

## Implementation Sequence

### Step 1: Add R*Tree Spatial Index

**Update database schema (`backend/db/schema.sql`):**
```sql
-- Add R*Tree virtual table
CREATE VIRTUAL TABLE IF NOT EXISTS track_spatial USING rtree(
    id,                 -- track ID
    min_lat, max_lat,
    min_lon, max_lon
);
```

**Update track upload to populate spatial index:**
```python
# In backend/services/track_service.py, after inserting track:

# Insert into spatial index
conn.execute("""
    INSERT INTO track_spatial (id, min_lat, max_lat, min_lon, max_lon)
    VALUES (?, ?, ?, ?, ?)
""", (
    track_id,
    gpx_data['bounds_min_lat'],
    gpx_data['bounds_max_lat'],
    gpx_data['bounds_min_lon'],
    gpx_data['bounds_max_lon']
))
```

---

### Step 2: Create Spatial Service

**Create `backend/services/spatial_service.py`:**
```python
from typing import List
from ..db.database import Database

class SpatialService:
    def __init__(self, db: Database):
        self.db = db

    def find_tracks_in_viewport(
        self,
        min_lat: float,
        max_lat: float,
        min_lon: float,
        max_lon: float,
        padding_percent: float = 1.0  # 100% padding = 2x viewport
    ) -> List[int]:
        """Find track IDs intersecting viewport with padding"""
        # Add padding
        lat_range = max_lat - min_lat
        lon_range = max_lon - min_lon

        padded_min_lat = min_lat - (lat_range * padding_percent / 2)
        padded_max_lat = max_lat + (lat_range * padding_percent / 2)
        padded_min_lon = min_lon - (lon_range * padding_percent / 2)
        padded_max_lon = max_lon + (lon_range * padding_percent / 2)

        # Query R*Tree spatial index
        with self.db.get_connection() as conn:
            cursor = conn.execute("""
                SELECT id FROM track_spatial
                WHERE max_lat >= ? AND min_lat <= ?
                  AND max_lon >= ? AND min_lon <= ?
            """, (padded_min_lat, padded_max_lat, padded_min_lon, padded_max_lon))

            return [row[0] for row in cursor.fetchall()]
```

---

### Step 3: Add Track List Endpoints

**Add to `backend/api/routes.py`:**
```python
@router.get("/tracks", response_model=List[TrackResponse])
async def list_tracks():
    """List all tracks (metadata only, no coordinates)"""
    with db.get_connection() as conn:
        cursor = conn.execute("""
            SELECT * FROM tracks
            ORDER BY activity_date DESC
        """)
        tracks = [dict(row) for row in cursor.fetchall()]

    return [TrackResponse(**track) for track in tracks]

@router.post("/spatial/viewport")
async def tracks_in_viewport(viewport: ViewportRequest):
    """Get track IDs in viewport"""
    spatial_service = SpatialService(db)

    track_ids = spatial_service.find_tracks_in_viewport(
        viewport.min_lat,
        viewport.max_lat,
        viewport.min_lon,
        viewport.max_lon
    )

    return {"track_ids": track_ids}

@router.patch("/tracks/{track_id}", response_model=TrackResponse)
async def update_track(track_id: int, update: TrackUpdate):
    """Update track (for visibility toggle)"""
    with db.get_connection() as conn:
        # Build update query dynamically
        updates = []
        params = []

        if update.visible is not None:
            updates.append("visible = ?")
            params.append(update.visible)

        if updates:
            params.append(track_id)
            conn.execute(f"""
                UPDATE tracks
                SET {', '.join(updates)}
                WHERE id = ?
            """, tuple(params))

        # Return updated track
        cursor = conn.execute("SELECT * FROM tracks WHERE id = ?", (track_id,))
        track = cursor.fetchone()

    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    return TrackResponse(**dict(track))
```

**Add request model:**
```python
class ViewportRequest(BaseModel):
    min_lat: float
    max_lat: float
    min_lon: float
    max_lon: float

class TrackUpdate(BaseModel):
    visible: Optional[bool] = None
```

---

### Step 4: Create Track List Component

**Create `frontend/src/components/TrackList/TrackList.tsx`:**
```typescript
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listTracks, updateTrack } from '../../api/client'
import { TrackListItem } from './TrackListItem'
import type { Track } from '../../types/track'

interface TrackListProps {
  selectedTrackId: number | null
  onSelectTrack: (trackId: number) => void
}

export function TrackList({ selectedTrackId, onSelectTrack }: TrackListProps) {
  const queryClient = useQueryClient()

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['tracks'],
    queryFn: listTracks
  })

  const toggleVisibility = useMutation({
    mutationFn: ({ trackId, visible }: { trackId: number; visible: boolean }) =>
      updateTrack(trackId, { visible }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] })
    }
  })

  if (isLoading) {
    return <div style={{ padding: '20px' }}>Loading...</div>
  }

  return (
    <div style={{
      width: '350px',
      height: '100%',
      backgroundColor: '#f8f9fa',
      borderLeft: '1px solid #dee2e6',
      overflowY: 'auto'
    }}>
      <div style={{ padding: '20px', borderBottom: '1px solid #dee2e6' }}>
        <h2 style={{ margin: 0 }}>Tracks ({tracks.length})</h2>
      </div>

      <div>
        {tracks.map(track => (
          <TrackListItem
            key={track.id}
            track={track}
            selected={track.id === selectedTrackId}
            onSelect={() => onSelectTrack(track.id)}
            onToggleVisibility={() =>
              toggleVisibility.mutate({
                trackId: track.id,
                visible: !track.visible
              })
            }
          />
        ))}
      </div>
    </div>
  )
}
```

**Create `frontend/src/components/TrackList/TrackListItem.tsx`:**
```typescript
import type { Track } from '../../types/track'

interface TrackListItemProps {
  track: Track
  selected: boolean
  onSelect: () => void
  onToggleVisibility: () => void
}

export function TrackListItem({
  track,
  selected,
  onSelect,
  onToggleVisibility
}: TrackListItemProps) {
  return (
    <div
      onClick={onSelect}
      style={{
        padding: '15px 20px',
        borderBottom: '1px solid #dee2e6',
        cursor: 'pointer',
        backgroundColor: selected ? '#e7f3ff' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleVisibility()
        }}
        style={{
          border: 'none',
          background: 'none',
          fontSize: '18px',
          cursor: 'pointer',
          padding: '5px'
        }}
        title={track.visible ? 'Hide track' : 'Show track'}
      >
        {track.visible ? '👁️' : '👁️‍🗨️'}
      </button>

      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500 }}>{track.name}</div>
        <div style={{ fontSize: '12px', color: '#6c757d' }}>
          {track.activity_type || 'Unknown'}
        </div>
      </div>
    </div>
  )
}
```

---

### Step 5: Update Map for Multiple Tracks

**Update `frontend/src/components/Map.tsx`:**
```typescript
interface MapProps {
  tracks: Track[]
  selectedTrackId: number | null
}

export function Map({ tracks, selectedTrackId }: MapProps) {
  // ... existing map initialization ...

  useEffect(() => {
    if (!map.current) return

    const mapInstance = map.current

    // Remove existing layers/sources
    if (mapInstance.getLayer('tracks-line')) {
      mapInstance.removeLayer('tracks-line')
    }
    if (mapInstance.getSource('tracks')) {
      mapInstance.removeSource('tracks')
    }

    // Filter visible tracks
    const visibleTracks = tracks.filter(t => t.visible && t.coordinates)

    if (visibleTracks.length === 0) return

    // Create GeoJSON feature collection
    const features = visibleTracks.map(track => ({
      type: 'Feature',
      id: track.id,
      properties: {
        id: track.id,
        selected: track.id === selectedTrackId
      },
      geometry: {
        type: 'LineString',
        coordinates: track.coordinates!
      }
    }))

    // Add source
    mapInstance.addSource('tracks', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features
      }
    })

    // Add layer with selection highlighting
    mapInstance.addLayer({
      id: 'tracks-line',
      type: 'line',
      source: 'tracks',
      paint: {
        'line-color': config.trackColor,
        'line-width': [
          'case',
          ['get', 'selected'],
          5,  // Selected tracks thicker
          3
        ],
        'line-opacity': [
          'case',
          ['get', 'selected'],
          1.0,  // Selected tracks brighter
          0.7
        ]
      }
    })
  }, [tracks, selectedTrackId])

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
}
```

---

### Step 6: Update App Component

**Update `frontend/src/App.tsx`:**
```typescript
import { useState } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { Map } from './components/Map'
import { TrackList } from './components/TrackList/TrackList'
import { Upload } from './components/Upload'
import { listTracks, getTrack } from './api/client'

const queryClient = new QueryClient()

function AppContent() {
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null)
  const [isMobile] = useState(window.innerWidth < 640)

  const { data: trackList = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: listTracks
  })

  // Load coordinates for visible tracks
  // For MVP: Load all visible tracks with coordinates upfront
  // TODO: Optimize with viewport-based loading in future iteration
  const visibleTrackIds = trackList.filter(t => t.visible).map(t => t.id)

  const { data: tracksWithCoords = [] } = useQuery({
    queryKey: ['tracks', 'with-geometry', visibleTrackIds],
    queryFn: async () => {
      // Load each track's geometry
      const promises = visibleTrackIds.map(id => getTrack(id))
      return Promise.all(promises)
    },
    enabled: visibleTrackIds.length > 0
  })

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <Map tracks={tracksWithCoords} selectedTrackId={selectedTrackId} />
        <Upload onUploadSuccess={() => queryClient.invalidateQueries(['tracks'])} />
      </div>

      {!isMobile && (
        <TrackList
          selectedTrackId={selectedTrackId}
          onSelectTrack={setSelectedTrackId}
        />
      )}
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

export default App
```

---

### Step 7: Add API Functions

**Update `frontend/src/api/client.ts`:**
```typescript
export async function listTracks(): Promise<Track[]> {
  const response = await fetch(`${API_BASE}api/v1/tracks`)
  if (!response.ok) throw new Error('Failed to load tracks')
  return response.json()
}

export async function updateTrack(
  trackId: number,
  update: { visible?: boolean }
): Promise<Track> {
  const response = await fetch(`${API_BASE}api/v1/tracks/${trackId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update)
  })
  if (!response.ok) throw new Error('Failed to update track')
  return response.json()
}
```

---

### Step 8: Setup React Query

**Update `frontend/package.json`:**
```bash
npm install @tanstack/react-query
```

---

## Testing

### Manual Tests
- [ ] Upload 3+ GPX files
- [ ] Verify all tracks appear in sidebar list
- [ ] Click track in list - verify it highlights
- [ ] Click eye icon - verify track disappears from map
- [ ] Reload page - verify tracks persist
- [ ] Test on mobile (< 640px) - sidebar should be hidden
- [ ] Upload 50+ tracks - verify performance is acceptable

### Unit Tests
- [ ] Test spatial query service
- [ ] Test viewport bounds calculation with padding

---

## Success Verification

- Multiple tracks visible on map simultaneously
- Track list functional with selection and visibility toggles
- Mobile view works (no sidebar)
- Performance acceptable with 50+ tracks

---

## Next Steps

After completion:
- Move to Feature 3: Bulk Upload & Deduplication
- Consider adding track loading based on viewport bounds

---

**Prompt Version**: 1.0
