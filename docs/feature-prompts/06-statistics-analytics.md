# Feature 6: Statistics & Analytics

**Status**: Not Started
**Dependencies**: Features 1-5
**Estimated Time**: 3-4 days
**Priority**: Medium

---

## Goal

Display comprehensive statistics about uploaded tracks, including summary stats across all tracks, per-activity breakdowns, and temporal analysis.

---

## Acceptance Criteria

- [ ] Stats panel shows: total tracks, total distance, total duration
- [ ] Activity type breakdown: count + total distance per activity
- [ ] Date range display: first activity to last activity
- [ ] Stats update when tracks added/deleted
- [ ] Multi-select shows combined stats for selected tracks
- [ ] Stats formatted nicely (km, hours, dates)
- [ ] Stats query is performant (uses DB aggregations)
- [ ] Can see stats even with filters applied

---

## Implementation Sequence

### Step 1: Create Stats API Endpoint

**Add to `backend/api/routes.py`:**
```python
@router.get("/stats/summary")
async def get_summary_stats():
    """Get summary statistics for all tracks"""
    with db.get_connection() as conn:
        # Overall stats
        cursor = conn.execute("""
            SELECT
                COUNT(*) as total_tracks,
                SUM(distance_meters) as total_distance,
                SUM(duration_seconds) as total_duration,
                MIN(activity_date) as first_activity,
                MAX(activity_date) as last_activity
            FROM tracks
        """)
        summary = dict(cursor.fetchone())

        # Activity type breakdown
        cursor = conn.execute("""
            SELECT
                activity_type,
                COUNT(*) as count,
                SUM(distance_meters) as total_distance
            FROM tracks
            WHERE activity_type IS NOT NULL
            GROUP BY activity_type
            ORDER BY count DESC
        """)
        activity_breakdown = [dict(row) for row in cursor.fetchall()]

    return {
        "total_tracks": summary['total_tracks'],
        "total_distance_meters": summary['total_distance'] or 0,
        "total_duration_seconds": summary['total_duration'] or 0,
        "first_activity": summary['first_activity'],
        "last_activity": summary['last_activity'],
        "by_activity": activity_breakdown
    }

@router.post("/stats/combined")
async def get_combined_stats(data: CombinedStatsRequest):
    """Get combined stats for selected tracks"""
    with db.get_connection() as conn:
        placeholders = ','.join('?' * len(data.track_ids))
        cursor = conn.execute(f"""
            SELECT
                COUNT(*) as count,
                SUM(distance_meters) as total_distance,
                SUM(duration_seconds) as total_duration,
                MIN(activity_date) as earliest,
                MAX(activity_date) as latest
            FROM tracks
            WHERE id IN ({placeholders})
        """, tuple(data.track_ids))

        stats = dict(cursor.fetchone())

    return stats

class CombinedStatsRequest(BaseModel):
    track_ids: List[int]
```

---

### Step 2: Create Stats Components

**Create `frontend/src/components/Stats/SummaryStats.tsx`:**
```typescript
import { useQuery } from '@tanstack/react-query'
import { getSummaryStats } from '../../api/client'

export function SummaryStats() {
  const { data: stats } = useQuery({
    queryKey: ['stats', 'summary'],
    queryFn: getSummaryStats
  })

  if (!stats) return null

  const formatDistance = (meters: number) => `${(meters / 1000).toFixed(1)} km`
  const formatDuration = (seconds: number) => `${(seconds / 3600).toFixed(1)} hours`

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
      <h3 style={{ marginTop: 0 }}>Summary Statistics</h3>

      <div style={{ marginBottom: '20px' }}>
        <div><strong>Total Tracks:</strong> {stats.total_tracks}</div>
        <div><strong>Total Distance:</strong> {formatDistance(stats.total_distance_meters)}</div>
        <div><strong>Total Time:</strong> {formatDuration(stats.total_duration_seconds)}</div>
      </div>

      <div>
        <strong>Activity Breakdown:</strong>
        {stats.by_activity.map((activity: any) => (
          <div key={activity.activity_type} style={{ marginLeft: '10px' }}>
            {activity.activity_type}: {activity.count} tracks ({formatDistance(activity.total_distance)})
          </div>
        ))}
      </div>

      {stats.first_activity && stats.last_activity && (
        <div style={{ marginTop: '15px', fontSize: '12px', color: '#6c757d' }}>
          From {new Date(stats.first_activity).toLocaleDateString()} to{' '}
          {new Date(stats.last_activity).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}
```

---

### Step 3: Add Stats API Functions

**Update `frontend/src/api/client.ts`:**
```typescript
export async function getSummaryStats() {
  const response = await fetch(`${API_BASE}api/v1/stats/summary`)
  if (!response.ok) throw new Error('Failed to load stats')
  return response.json()
}

export async function getCombinedStats(trackIds: number[]) {
  const response = await fetch(`${API_BASE}api/v1/stats/combined`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ track_ids: trackIds })
  })
  if (!response.ok) throw new Error('Failed to load stats')
  return response.json()
}
```

---

### Step 4: Integrate into Sidebar

**Update TrackList to include stats:**
```typescript
export function TrackList() {
  return (
    <div>
      <FilterPanel />
      <SummaryStats />
      {/* Track list items */}
    </div>
  )
}
```

**Update BulkOperationsPanel to use API:**
```typescript
const { data: combinedStats } = useQuery({
  queryKey: ['stats', 'combined', trackIds],
  queryFn: () => getCombinedStats(trackIds),
  enabled: trackIds.length > 0
})
```

---

### Step 4: Integrate Stats Invalidation

**Update upload, delete, and update mutations to invalidate stats:**

**In Upload component:**
```typescript
const uploadMutation = useMutation({
  mutationFn: uploadGPX,
  onSuccess: () => {
    queryClient.invalidateQueries(['tracks'])
    queryClient.invalidateQueries(['stats'])  // Invalidate stats
  }
})
```

**In TrackDetailsPanel (delete):**
```typescript
const deleteMutation = useMutation({
  mutationFn: () => deleteTrack(track.id),
  onSuccess: () => {
    queryClient.invalidateQueries(['tracks'])
    queryClient.invalidateQueries(['stats'])  // Invalidate stats
  }
})
```

**In BulkOperationsPanel:**
```typescript
const bulkMutation = useMutation({
  mutationFn: (data: any) => bulkUpdateTracks(trackIds, data),
  onSuccess: () => {
    queryClient.invalidateQueries(['tracks'])
    queryClient.invalidateQueries(['stats'])  // Invalidate stats
  }
})
```

---

## Testing

- [ ] Verify stats display correctly
- [ ] Upload new track - stats update
- [ ] Delete track - stats update
- [ ] Activity breakdown accurate
- [ ] Combined stats for multi-select accurate
- [ ] Stats query performance acceptable

---

**Prompt Version**: 1.0
