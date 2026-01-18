import { useState, useEffect, useCallback } from "react";

interface UploadZoneProps {
  onFilesDropped: (files: File[]) => void;
  isUploading: boolean;
  uploadProgress?: { current: number; total: number } | null;
}

export function UploadZone({
  onFilesDropped,
  isUploading,
  uploadProgress,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [, setDragCounter] = useState(0);

  const processFileDrop = useCallback(
    (dataTransfer: DataTransfer) => {
      const files = Array.from(dataTransfer.files).filter((f) =>
        f.name.endsWith(".gpx"),
      );
      if (files.length > 0) {
        onFilesDropped(files);
      }
    },
    [onFilesDropped],
  );

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
        processFileDrop(e.dataTransfer);
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
  }, [processFileDrop]);

  if (!isDragging && !isUploading) {
    return null;
  }

  const handleOverlayDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);
    processFileDrop(e.dataTransfer);
  };

  const handleOverlayDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const percentage =
    uploadProgress && uploadProgress.total > 0
      ? Math.round((uploadProgress.current / uploadProgress.total) * 100)
      : 0;

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
          <>
            {uploadProgress && (
              <div className="upload-progress-container">
                <div className="upload-progress-text">
                  Uploading {uploadProgress.current} of {uploadProgress.total}{" "}
                  files ({percentage}%)
                </div>
                <div className="upload-progress-bar">
                  <div
                    className="upload-progress-fill"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>
              </div>
            )}
            <div className="upload-spinner">
              <div className="spinner" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
