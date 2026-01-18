import { useState, useMemo, useRef, useEffect } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Map, type MapRef } from "./components/Map";
import { UploadZone } from "./components/UploadZone";
import { StatusMessage } from "./components/StatusMessage";
import { TrackList } from "./components/TrackList/TrackList";
import { useSelection } from "./hooks/useSelection";
import {
  uploadTracksWithProgress,
  listTracks,
  getTrackGeometries,
} from "./api/client";
import type { Track, TrackGeometry } from "./types/track";

const queryClient = new QueryClient();

function AppContent() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [status, setStatus] = useState<{
    message: string;
    type: "info" | "success" | "error";
  } | null>(null);
  const queryClient = useQueryClient();
  const statusTimeoutRef = useRef<number | undefined>(undefined);
  const mapRef = useRef<MapRef>(null);
  const {
    selectedTrackIds,
    anchorTrackId,
    toggleSelection,
    selectRange,
    selectAll,
    clearSelection,
  } = useSelection();

  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);

  const { data: tracks = [] } = useQuery<Track[]>({
    queryKey: ["tracks"],
    queryFn: listTracks,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        e.preventDefault();
        const allTrackIds = tracks.map((track) => track.id);
        selectAll(allTrackIds);
      } else if (e.key === "Escape") {
        clearSelection();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [tracks, selectAll, clearSelection]);

  const trackIds = useMemo(() => tracks.map((track) => track.id), [tracks]);

  const { data: allGeometries = [] } = useQuery<TrackGeometry[]>({
    queryKey: ["geometries"],
    queryFn: () => getTrackGeometries(trackIds),
    enabled: trackIds.length > 0,
  });

  const visibleGeometries = useMemo(() => {
    const visibleIds = new Set(
      tracks.filter((track) => track.visible).map((track) => track.id),
    );
    return allGeometries.filter((geometry) =>
      visibleIds.has(geometry.track_id),
    );
  }, [tracks, allGeometries]);

  const handleZoomToTrack = (track: Track) => {
    if (
      track.bounds_min_lat === null ||
      track.bounds_max_lat === null ||
      track.bounds_min_lon === null ||
      track.bounds_max_lon === null
    ) {
      return;
    }

    toggleSelection(track.id, false);

    mapRef.current?.zoomToBounds({
      minLat: track.bounds_min_lat,
      maxLat: track.bounds_max_lat,
      minLon: track.bounds_min_lon,
      maxLon: track.bounds_max_lon,
    });
  };

  const handleFilesDropped = async (files: File[]) => {
    setIsUploading(true);
    setUploadProgress({ current: 0, total: files.length });

    try {
      const result = await uploadTracksWithProgress(files, (current, total) => {
        setUploadProgress({ current, total });
      });

      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "geometries",
      });

      if (result.failed > 0) {
        setStatus({ message: "Some files failed", type: "error" });
      } else {
        setStatus({ message: "Upload complete", type: "success" });
      }

      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = setTimeout(() => setStatus(null), 3000);
    } catch {
      setStatus({ message: "Upload failed", type: "error" });
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = setTimeout(() => setStatus(null), 3000);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="app-container">
      <div className="app-main">
        <Map
          ref={mapRef}
          geometries={visibleGeometries}
          selectedTrackIds={selectedTrackIds}
          onSelect={toggleSelection}
          onClearSelection={clearSelection}
        />
        <UploadZone
          onFilesDropped={handleFilesDropped}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
        {status && (
          <StatusMessage message={status.message} type={status.type} />
        )}
      </div>
      <TrackList
        selectedTrackIds={selectedTrackIds}
        anchorTrackId={anchorTrackId}
        onSelect={toggleSelection}
        onSelectRange={selectRange}
        onZoomToTrack={handleZoomToTrack}
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
