import { useState } from 'react'

interface UploadZoneProps {
  onFilesDropped: (files: File[]) => void
  isUploading: boolean
}

export function UploadZone({ onFilesDropped, isUploading }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [, setDragCounter] = useState(0)

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    setDragCounter(prev => prev + 1)
    setIsDragging(true)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragCounter(prev => {
      const newCount = prev - 1
      if (newCount === 0) {
        setIsDragging(false)
      }
      return newCount
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    setDragCounter(0)

    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.name.endsWith('.gpx')
    )

    if (files.length > 0) {
      onFilesDropped(files)
    }
  }

  if (!isDragging && !isUploading) {
    return (
      <div
        className="upload-zone-invisible"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
      />
    )
  }

  return (
    <div
      className={`upload-zone ${isDragging ? 'dragging' : 'uploading'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="upload-content">
        {isDragging ? (
          <>
            <div className="upload-icon">📍</div>
            <div className="upload-text">Drop GPX files to map your journey</div>
          </>
        ) : (
          <div className="upload-spinner">
            <div className="spinner" />
          </div>
        )}
      </div>
    </div>
  )
}
