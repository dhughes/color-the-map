# Feature 4: Track Selection & Management

**Status**: Not Started
**Dependencies**: Features 1-3
**Estimated Time**: 4-5 days
**Priority**: High

---

## Goal

Implement multi-select functionality (Cmd/Ctrl+click), track details panel for editing metadata, bulk operations for selected tracks, and track isolation mode.

---

## Acceptance Criteria

- [ ] Cmd/Ctrl+click adds/removes tracks from selection
- [ ] Selected tracks highlighted in list and map (brighter color)
- [ ] Single selection: Show details panel with editable fields
- [ ] Details panel shows: name (editable), activity type (editable), date, distance, speeds, elevation gain/loss, description (editable)
- [ ] Can delete single track from details panel (with confirmation)
- [ ] Multi-selection: Show bulk operations panel
- [ ] Bulk panel shows: count, combined distance, combined duration, date range
- [ ] Bulk operations: Toggle visibility, Change activity type
- [ ] Isolation mode: Clicking track name/icon isolates it (hides others, zooms to fit)
- [ ] Exit isolation: Explicit button (clicking map doesn't exit)
- [ ] Selection cleared on filter change

---

## Implementation Sequence

### Step 1: Add Selection State Management

**Create `frontend/src/context/SelectionContext.tsx`:**
```typescript
import { createContext, useContext, useState, ReactNode } from 'react'

interface SelectionContextType {
  selectedIds: number[]
  toggleSelection: (id: number, multiSelect: boolean) => void
  clearSelection: () => void
  isolatedTrackId: number | null
  setIsolatedTrackId: (id: number | null) => void
}

const SelectionContext = createContext<SelectionContextType | null>(null)

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [isolatedTrackId, setIsolatedTrackId] = useState<number | null>(null)

  const toggleSelection = (id: number, multiSelect: boolean) => {
    if (multiSelect) {
      setSelectedIds(prev =>
        prev.includes(id)
          ? prev.filter(i => i !== id)
          : [...prev, id]
      )
    } else {
      setSelectedIds([id])
    }
  }

  const clearSelection = () => setSelectedIds([])

  return (
    <SelectionContext.Provider value={{
      selectedIds,
      toggleSelection,
      clearSelection,
      isolatedTrackId,
      setIsolatedTrackId
    }}>
      {children}
    </SelectionContext.Provider>
  )
}

export const useSelection = () => {
  const context = useContext(SelectionContext)
  if (!context) throw new Error('useSelection must be used within SelectionProvider')
  return context
}
```

---

### Step 2: Create Track Details Panel

**Create `frontend/src/components/Details/TrackDetailsPanel.tsx`:**
```typescript
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTrack, deleteTrack } from '../../api/client'
import type { Track } from '../../types/track'

export function TrackDetailsPanel({ track }: { track: Track }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(track.name)
  const [activityType, setActivityType] = useState(track.activity_type || '')
  const [description, setDescription] = useState(track.description || '')

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateTrack(track.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tracks'])
      setEditing(false)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteTrack(track.id),
    onSuccess: () => {
      queryClient.invalidateQueries(['tracks'])
    }
  })

  const handleSave = () => {
    updateMutation.mutate({ name, activity_type: activityType, description })
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this track?')) {
      deleteMutation.mutate()
    }
  }

  const formatDistance = (meters: number | null) =>
    meters ? `${(meters / 1000).toFixed(2)} km` : 'N/A'

  const formatSpeed = (ms: number | null) =>
    ms ? `${(ms * 3.6).toFixed(1)} km/h` : 'N/A'

  return (
    <div style={{ padding: '20px', backgroundColor: 'white' }}>
      <h3>Track Details</h3>

      {editing ? (
        <>
          <div style={{ marginBottom: '10px' }}>
            <label>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Activity Type</label>
            <input
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: '100%', padding: '5px', minHeight: '60px' }}
            />
          </div>
          <button onClick={handleSave}>Save</button>
          <button onClick={() => setEditing(false)}>Cancel</button>
        </>
      ) : (
        <>
          <div><strong>Name:</strong> {track.name}</div>
          <div><strong>Activity:</strong> {track.activity_type || 'Unknown'}</div>
          <div><strong>Date:</strong> {new Date(track.activity_date).toLocaleDateString()}</div>
          <div><strong>Distance:</strong> {formatDistance(track.distance_meters)}</div>
          <div><strong>Avg Speed:</strong> {formatSpeed(track.avg_speed_ms)}</div>
          <div><strong>Max Speed:</strong> {formatSpeed(track.max_speed_ms)}</div>
          <div><strong>Elevation Gain:</strong> {track.elevation_gain_meters?.toFixed(0) || 'N/A'} m</div>
          <div><strong>Elevation Loss:</strong> {track.elevation_loss_meters?.toFixed(0) || 'N/A'} m</div>
          {track.description && <div><strong>Notes:</strong> {track.description}</div>}

          <div style={{ marginTop: '20px' }}>
            <button onClick={() => setEditing(true)}>Edit</button>
            <button onClick={handleDelete} style={{ marginLeft: '10px', color: 'red' }}>
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}
```

---

### Step 3: Create Bulk Operations Panel

**Create `frontend/src/components/Details/BulkOperationsPanel.tsx`:**
```typescript
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bulkUpdateTracks } from '../../api/client'

export function BulkOperationsPanel({ trackIds, tracks }) {
  const queryClient = useQueryClient()
  const [activityType, setActivityType] = useState('')

  const selectedTracks = tracks.filter(t => trackIds.includes(t.id))

  const totalDistance = selectedTracks.reduce(
    (sum, t) => sum + (t.distance_meters || 0),
    0
  )

  const totalDuration = selectedTracks.reduce(
    (sum, t) => sum + (t.duration_seconds || 0),
    0
  )

  const bulkMutation = useMutation({
    mutationFn: (data: any) => bulkUpdateTracks(trackIds, data),
    onSuccess: () => queryClient.invalidateQueries(['tracks'])
  })

  return (
    <div style={{ padding: '20px', backgroundColor: 'white' }}>
      <h3>{trackIds.length} Tracks Selected</h3>

      <div style={{ marginBottom: '20px' }}>
        <div><strong>Total Distance:</strong> {(totalDistance / 1000).toFixed(2)} km</div>
        <div><strong>Total Duration:</strong> {Math.round(totalDuration / 3600)} hours</div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label>Change Activity Type</label>
        <input
          value={activityType}
          onChange={(e) => setActivityType(e.target.value)}
          placeholder="Enter activity type"
          style={{ width: '100%', padding: '5px' }}
        />
        <button
          onClick={() => bulkMutation.mutate({ activity_type: activityType })}
          disabled={!activityType}
        >
          Apply
        </button>
      </div>

      <div>
        <button onClick={() => bulkMutation.mutate({ visible: false })}>
          Hide All
        </button>
        <button onClick={() => bulkMutation.mutate({ visible: true })}>
          Show All
        </button>
      </div>
    </div>
  )
}
```

---

### Step 4: Implement Isolation Mode

**Update Map component to respect isolation:**
```typescript
// In frontend/src/components/Map.tsx
const { isolatedTrackId } = useSelection()

// Filter tracks to show
const tracksToRender = isolatedTrackId
  ? tracks.filter(t => t.id === isolatedTrackId)
  : tracks.filter(t => t.visible)

// When entering isolation, fit bounds
useEffect(() => {
  if (!map.current || !isolatedTrackId) return

  const track = tracks.find(t => t.id === isolatedTrackId)
  if (track?.bounds_min_lat) {
    map.current.fitBounds([
      [track.bounds_min_lon, track.bounds_min_lat],
      [track.bounds_max_lon, track.bounds_max_lat]
    ], { padding: 50 })
  }
}, [isolatedTrackId])
```

**Add isolation controls to TrackListItem:**
```typescript
// In TrackListItem.tsx
const { setIsolatedTrackId } = useSelection()

<button
  onClick={(e) => {
    e.stopPropagation()
    setIsolatedTrackId(track.id)
  }}
  title="Show only this track"
>
  🔍 Isolate
</button>
```

**Add exit isolation button:**
```typescript
// In TrackList or App.tsx
{isolatedTrackId && (
  <button
    onClick={() => setIsolatedTrackId(null)}
    style={{
      position: 'absolute',
      top: 10,
      right: 10,
      padding: '10px',
      backgroundColor: '#dc3545',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      zIndex: 1001
    }}
  >
    Exit Isolation Mode
  </button>
)}
```

---

### Step 5: Add Backend Endpoints

**Add to `backend/api/routes.py`:**
```python
@router.delete("/tracks/{track_id}")
async def delete_track(track_id: int):
    """Delete a track"""
    with db.get_connection() as conn:
        # Delete from spatial index
        conn.execute("DELETE FROM track_spatial WHERE id = ?", (track_id,))

        # Get hash before deleting
        cursor = conn.execute("SELECT hash FROM tracks WHERE id = ?", (track_id,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Track not found")

        gpx_hash = row['hash']

        # Delete from tracks
        conn.execute("DELETE FROM tracks WHERE id = ?", (track_id,))

    # Delete GPX file
    storage.delete_gpx(gpx_hash)

    return {"success": True}

@router.post("/tracks/bulk/update")
async def bulk_update_tracks(data: BulkUpdateRequest):
    """Bulk update tracks"""
    with db.get_connection() as conn:
        if data.visible is not None:
            conn.executemany(
                "UPDATE tracks SET visible = ? WHERE id = ?",
                [(data.visible, tid) for tid in data.track_ids]
            )

        if data.activity_type:
            conn.executemany(
                "UPDATE tracks SET activity_type = ? WHERE id = ?",
                [(data.activity_type, tid) for tid in data.track_ids]
            )

    return {"updated": len(data.track_ids)}

class BulkUpdateRequest(BaseModel):
    track_ids: List[int]
    visible: Optional[bool] = None
    activity_type: Optional[str] = None
```

---

## Testing

- [ ] Cmd/Ctrl+click selects multiple tracks
- [ ] Edit track details and save
- [ ] Delete track (with confirmation)
- [ ] Bulk change activity type
- [ ] Bulk toggle visibility
- [ ] Isolation mode zoom to fit

---

**Prompt Version**: 1.0
