# Feature 3: Activity Inference, Deduplication & Enhanced Upload UX

**Status**: Not Started
**Dependencies**: Features 1-2
**Estimated Time**: 2-3 days
**Priority**: High

---

## Goal

**Note:** Drag-and-drop and multi-file upload were implemented in Feature 1. This feature focuses on enhancing the upload experience with activity type inference, smart duplicate handling with viewport centering, and detailed progress reporting.

Add intelligent activity type detection from filenames, implement deduplication that centers the viewport on existing tracks, and create an enhanced progress dialog with detailed statistics.

---

## Context

See [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) Section "Activity Type Inference" and "Content-Addressable Storage".

**Already Implemented in Feature 1:**
- Drag-and-drop upload interface (entire map is drop zone)
- Multi-file upload support (POST /api/v1/tracks accepts array)
- Content-addressable storage (SHA256 hash-based filenames)
- Simple upload status messages

**You're Adding:**
- Activity type inference from filename patterns
- Duplicate detection with viewport centering on existing tracks
- Enhanced progress dialog with detailed statistics
- Better error reporting (show which files failed and why)

---

## Acceptance Criteria

- [ ] Activity type inferred from filename patterns (Cycling, Walking, Running, etc.)
- [ ] Activity type stored in both `activity_type` and `activity_type_inferred` fields
- [ ] Duplicate files detected (hash match) and skipped silently
- [ ] After upload with duplicates, viewport centers on all affected tracks (new + existing)
- [ ] Enhanced progress dialog replaces simple status message
- [ ] Progress dialog shows: % complete, file count, activity type breakdown, errors list
- [ ] Failed files shown with specific error messages
- [ ] Upload of 50+ files performs well with progress updates

---

## Implementation Sequence

### Step 1: Create Activity Inference Service

**Create `backend/services/activity_inference.py`:**
```python
import re
from typing import Optional

class ActivityInferenceService:
    PATTERNS = [
        r'^(Cycling|Walking|Running|Swimming|Hiking|Downhill Skiing|Multisport)\s+\d{4}',
    ]

    def infer(self, filename: str) -> str:
        """Infer activity type from filename"""
        for pattern in self.PATTERNS:
            match = re.match(pattern, filename, re.IGNORECASE)
            if match:
                return match.group(1).title()

        return "Unknown"
```

**Integrate into track service:**
```python
# In backend/services/track_service.py
def __init__(self, db, storage, parser, activity_inference):
    self.activity_inference = activity_inference
    # ...

# In upload_track:
activity_type = self.activity_inference.infer(filename)

# Save with inferred type
conn.execute("""
    INSERT INTO tracks (..., activity_type, activity_type_inferred, ...)
    VALUES (..., ?, ?, ...)
""", (..., activity_type, activity_type, ...))
```

---

### Step 2: Create Bulk Upload Endpoint

**Add to `backend/api/routes.py`:**
```python
from typing import List

@router.post("/tracks/bulk")
async def bulk_upload(files: List[UploadFile] = File(...)):
    """Upload multiple GPX files"""
    results = []

    for file in files:
        try:
            if not file.filename.endswith('.gpx'):
                results.append({
                    'filename': file.filename,
                    'success': False,
                    'error': 'Not a GPX file'
                })
                continue

            content = await file.read()

            if len(content) > config.MAX_FILE_SIZE:
                results.append({
                    'filename': file.filename,
                    'success': False,
                    'error': 'File too large'
                })
                continue

            result = track_service.upload_track(file.filename, content)

            results.append({
                'filename': file.filename,
                'success': True,
                'duplicate': result['duplicate'],
                'track_id': result['track']['id'] if result['track'] else None
            })

        except Exception as e:
            results.append({
                'filename': file.filename,
                'success': False,
                'error': str(e)
            })

    # Calculate summary
    successful = [r for r in results if r['success'] and not r.get('duplicate')]
    duplicates = [r for r in results if r.get('duplicate')]
    failed = [r for r in results if not r['success']]

    return {
        'total': len(files),
        'successful': len(successful),
        'duplicates': len(duplicates),
        'failed': len(failed),
        'results': results
    }
```

---

### Step 3: Create Drag-Drop Upload Component

**Create `frontend/src/components/Upload/DragDropZone.tsx`:**
```typescript
import { useState, useRef } from 'react'
import { bulkUploadGPX } from '../../api/client'
import { UploadProgress } from './UploadProgress'

export function DragDropZone({ onUploadComplete }) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.name.endsWith('.gpx')
    )

    if (files.length === 0) return

    await uploadFiles(files)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      await uploadFiles(files)
    }
  }

  const uploadFiles = async (files: File[]) => {
    setUploading(true)
    setProgress({ current: 0, total: files.length })

    try {
      const result = await bulkUploadGPX(files, (current) => {
        setProgress({ current, total: files.length })
      })

      alert(`Uploaded: ${result.successful} new, ${result.duplicates} existing, ${result.failed} failed`)
      onUploadComplete(result)
    } catch (error) {
      alert('Upload failed: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          padding: '20px',
          backgroundColor: isDragging ? '#e3f2fd' : '#fff',
          border: '2px dashed ' + (isDragging ? '#1976d2' : '#ccc'),
          borderRadius: '8px',
          cursor: 'pointer',
          zIndex: 1000
        }}
      >
        <div>📁 Drop GPX files here or click to select</div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".gpx"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {uploading && (
        <UploadProgress current={progress.current} total={progress.total} />
      )}
    </>
  )
}
```

**Create `frontend/src/components/Upload/UploadProgress.tsx`:**
```typescript
export function UploadProgress({ current, total }) {
  const percent = Math.round((current / total) * 100)

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      padding: '30px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      zIndex: 2000,
      minWidth: '300px'
    }}>
      <h3 style={{ marginTop: 0 }}>Uploading Tracks</h3>
      <div style={{
        width: '100%',
        height: '20px',
        backgroundColor: '#e0e0e0',
        borderRadius: '10px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${percent}%`,
          height: '100%',
          backgroundColor: '#4caf50',
          transition: 'width 0.3s'
        }} />
      </div>
      <div style={{ marginTop: '10px', textAlign: 'center' }}>
        {current} / {total} ({percent}%)
      </div>
    </div>
  )
}
```

---

### Step 4: Add Bulk Upload API Function

**Update `frontend/src/api/client.ts`:**
```typescript
export async function bulkUploadGPX(
  files: File[],
  onProgress?: (current: number) => void
): Promise<any> {
  const formData = new FormData()
  files.forEach(file => formData.append('files', file))

  const response = await fetch(`${API_BASE}api/v1/tracks/bulk`, {
    method: 'POST',
    body: formData
  })

  if (onProgress) onProgress(files.length)

  if (!response.ok) throw new Error('Bulk upload failed')

  return response.json()
}
```

---

### Step 5: Center Viewport on Imported Tracks

**Update App.tsx to handle upload completion:**
```typescript
const handleUploadComplete = (result: BulkUploadResult) => {
  queryClient.invalidateQueries(['tracks'])

  // Get all imported/existing track IDs
  const trackIds = result.results
    .filter(r => r.track_id)
    .map(r => r.track_id)

  if (trackIds.length === 0) return

  // Fetch these tracks to get bounds
  Promise.all(trackIds.map(id => getTrack(id))).then(tracks => {
    // Calculate combined bounds
    const bounds = tracks.reduce((acc, track) => {
      if (!track.bounds_min_lat) return acc

      return {
        minLat: Math.min(acc.minLat, track.bounds_min_lat),
        maxLat: Math.max(acc.maxLat, track.bounds_max_lat),
        minLon: Math.min(acc.minLon, track.bounds_min_lon),
        maxLon: Math.max(acc.maxLon, track.bounds_max_lon)
      }
    }, {
      minLat: 90,
      maxLat: -90,
      minLon: 180,
      maxLon: -180
    })

    // Tell map to fit these bounds
    map.fitBounds([
      [bounds.minLon, bounds.minLat],
      [bounds.maxLon, bounds.maxLat]
    ], { padding: 50 })
  })
}
```

---

## Testing

- [ ] Drag 10 files at once
- [ ] Verify progress dialog shows
- [ ] Upload same files again (duplicates detected)
- [ ] Upload mix of valid and invalid files
- [ ] Verify activity types inferred correctly
- [ ] Upload 50+ files (performance test)

---

**Prompt Version**: 1.0
