# Feature 5: Filtering & Search

**Status**: Not Started
**Dependencies**: Features 1-4
**Estimated Time**: 3-4 days
**Priority**: Medium

---

## Goal

Add filtering capabilities to narrow down visible tracks by activity type and date range. Filters use AND logic (must match all active filters).

---

## Acceptance Criteria

- [ ] Activity type filter dropdown with all existing types
- [ ] Date range filter with from/to date inputs
- [ ] Filters applied immediately on change
- [ ] Only matching tracks shown in list and on map
- [ ] Active filters displayed as badges/chips
- [ ] Clear filters button resets to show all
- [ ] Selection cleared when filters change
- [ ] Fast filtering with proper database indexes

---

## Implementation Sequence

### Step 1: Add Filter State

**Update `frontend/src/context/FilterContext.tsx`:**
```typescript
import { createContext, useContext, useState, ReactNode } from 'react'

interface Filters {
  activityType: string | null
  startDate: string | null
  endDate: string | null
}

interface FilterContextType {
  filters: Filters
  setActivityType: (type: string | null) => void
  setDateRange: (start: string | null, end: string | null) => void
  clearFilters: () => void
}

const FilterContext = createContext<FilterContextType | null>(null)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>({
    activityType: null,
    startDate: null,
    endDate: null
  })

  const setActivityType = (type: string | null) =>
    setFilters(prev => ({ ...prev, activityType: type }))

  const setDateRange = (start: string | null, end: string | null) =>
    setFilters(prev => ({ ...prev, startDate: start, endDate: end }))

  const clearFilters = () =>
    setFilters({ activityType: null, startDate: null, endDate: null })

  return (
    <FilterContext.Provider value={{
      filters,
      setActivityType,
      setDateRange,
      clearFilters
    }}>
      {children}
    </FilterContext.Provider>
  )
}

export const useFilters = () => {
  const context = useContext(FilterContext)
  if (!context) throw new Error('useFilters must be used within FilterProvider')
  return context
}
```

---

### Step 2: Create Filter Components

**Create `frontend/src/components/Filters/ActivityFilter.tsx`:**
```typescript
import { useQuery } from '@tanstack/react-query'
import { listTracks } from '../../api/client'
import { useFilters } from '../../context/FilterContext'

export function ActivityFilter() {
  const { filters, setActivityType } = useFilters()
  const { data: tracks = [] } = useQuery(['tracks'], listTracks)

  // Get unique activity types
  const activityTypes = Array.from(
    new Set(tracks.map(t => t.activity_type).filter(Boolean))
  ).sort()

  return (
    <div style={{ marginBottom: '15px' }}>
      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>
        Activity Type
      </label>
      <select
        value={filters.activityType || ''}
        onChange={(e) => setActivityType(e.target.value || null)}
        style={{ width: '100%', padding: '8px', borderRadius: '4px' }}
      >
        <option value="">All Activities</option>
        {activityTypes.map(type => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>
    </div>
  )
}
```

**Create `frontend/src/components/Filters/DateFilter.tsx`:**
```typescript
import { useFilters } from '../../context/FilterContext'

export function DateFilter() {
  const { filters, setDateRange } = useFilters()

  return (
    <div style={{ marginBottom: '15px' }}>
      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>
        Date Range
      </label>
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="date"
          value={filters.startDate || ''}
          onChange={(e) => setDateRange(e.target.value || null, filters.endDate)}
          style={{ flex: 1, padding: '8px', borderRadius: '4px' }}
        />
        <input
          type="date"
          value={filters.endDate || ''}
          onChange={(e) => setDateRange(filters.startDate, e.target.value || null)}
          style={{ flex: 1, padding: '8px', borderRadius: '4px' }}
        />
      </div>
    </div>
  )
}
```

**Create `frontend/src/components/Filters/FilterPanel.tsx`:**
```typescript
import { ActivityFilter } from './ActivityFilter'
import { DateFilter } from './DateFilter'
import { useFilters } from '../../context/FilterContext'

export function FilterPanel() {
  const { filters, clearFilters } = useFilters()

  const hasActiveFilters = filters.activityType || filters.startDate || filters.endDate

  return (
    <div style={{
      padding: '20px',
      borderBottom: '1px solid #dee2e6',
      backgroundColor: '#f8f9fa'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Filters</h3>

      <ActivityFilter />
      <DateFilter />

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear Filters
        </button>
      )}

      {hasActiveFilters && (
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#6c757d' }}>
          Active filters:
          {filters.activityType && <span> Activity: {filters.activityType}</span>}
          {filters.startDate && <span> From: {filters.startDate}</span>}
          {filters.endDate && <span> To: {filters.endDate}</span>}
        </div>
      )}
    </div>
  )
}
```

---

### Step 3: Update Track List Query

**Update `frontend/src/api/client.ts`:**
```typescript
export async function listTracks(filters?: {
  activity_type?: string
  start_date?: string
  end_date?: string
}): Promise<Track[]> {
  const params = new URLSearchParams()

  if (filters?.activity_type) params.set('activity_type', filters.activity_type)
  if (filters?.start_date) params.set('start_date', filters.start_date)
  if (filters?.end_date) params.set('end_date', filters.end_date)

  const query = params.toString()
  const url = query ? `${API_BASE}api/v1/tracks?${query}` : `${API_BASE}api/v1/tracks`

  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to load tracks')
  return response.json()
}
```

---

### Step 4: Update Backend Endpoint

**Update `backend/api/routes.py`:**
```python
@router.get("/tracks", response_model=List[TrackResponse])
async def list_tracks(
    activity_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """List tracks with optional filters"""
    query = "SELECT * FROM tracks WHERE 1=1"
    params = []

    if activity_type:
        query += " AND activity_type = ?"
        params.append(activity_type)

    if start_date:
        query += " AND activity_date >= ?"
        params.append(start_date)

    if end_date:
        query += " AND activity_date <= ?"
        params.append(end_date + " 23:59:59")  # End of day

    query += " ORDER BY activity_date DESC"

    with db.get_connection() as conn:
        cursor = conn.execute(query, tuple(params))
        tracks = [dict(row) for row in cursor.fetchall()]

    return [TrackResponse(**track) for track in tracks]
```

---

### Step 5: Clear Selection on Filter Change

**Update App.tsx to watch for filter changes:**
```typescript
import { useEffect } from 'react'
import { useFilters } from './context/FilterContext'
import { useSelection } from './context/SelectionContext'

function AppContent() {
  const { filters } = useFilters()
  const { clearSelection } = useSelection()

  // Clear selection when filters change
  useEffect(() => {
    clearSelection()
  }, [filters.activityType, filters.startDate, filters.endDate])

  // ... rest of component
}
```

**Note**: This avoids circular dependencies between FilterContext and SelectionContext by handling the integration at the App level.

---

## Testing

- [ ] Select activity type - verify filtered tracks display
- [ ] Set date range - verify only tracks in range display
- [ ] Combine filters - verify AND logic works
- [ ] Clear filters - verify all tracks return
- [ ] Verify selection cleared on filter change

---

**Prompt Version**: 1.0
