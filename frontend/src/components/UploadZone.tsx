import { useState, useEffect } from "react";

interface UploadZoneProps {
  onFilesDropped: (files: File[]) => void;
  isUploading: boolean;
}

export function UploadZone({ onFilesDropped, isUploading }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [, setDragCounter] = useState(0);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes("Files")) {
        setDragCounter((prev) => prev + 1);
        setIsDragging(true);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      setDragCounter((prev) => {
        const newCount = prev - 1;
        if (newCount === 0) {
          setIsDragging(false);
        }
        return newCount;
      });
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      setDragCounter(0);

      if (e.dataTransfer) {
        const files = Array.from(e.dataTransfer.files).filter((f) =>
          f.name.endsWith(".gpx"),
        );

        if (files.length > 0) {
          onFilesDropped(files);
        }
      }
    };

    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDrop);

    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDrop);
    };
  }, [onFilesDropped]);

  if (!isDragging && !isUploading) {
    return null;
  }

  const handleOverlayDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);

    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.endsWith(".gpx"),
    );

    if (files.length > 0) {
      onFilesDropped(files);
    }
  };

  const handleOverlayDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className={`upload-zone ${isDragging ? "dragging" : "uploading"}`}
      onDragOver={handleOverlayDragOver}
      onDrop={handleOverlayDrop}
    >
      <div className="upload-content">
        {isDragging ? (
          <>
            <div className="upload-icon">📍</div>
            <div className="upload-text">
              Drop GPX files to map your journey
            </div>
          </>
        ) : (
          <div className="upload-spinner">
            <div className="spinner" />
          </div>
        )}
      </div>
    </div>
  );
}
