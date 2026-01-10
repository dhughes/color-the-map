import { useState, useMemo, useRef, useEffect } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Map } from "./components/Map";
import { UploadZone } from "./components/UploadZone";
import { StatusMessage } from "./components/StatusMessage";
import { TrackList } from "./components/TrackList/TrackList";
import { uploadTracks, listTracks, getTrackGeometries } from "./api/client";
import type { Track, TrackGeometry } from "./types/track";

const queryClient = new QueryClient();

function AppContent() {
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<{
    message: string;
    type: "info" | "success" | "error";
  } | null>(null);
  const queryClient = useQueryClient();
  const statusTimeoutRef = useRef<number | undefined>(undefined);

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

  const trackIds = useMemo(() => tracks.map((track) => track.id), [tracks]);

  const { data: allGeometries = [] } = useQuery<TrackGeometry[]>({
    queryKey: ["geometries", trackIds],
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

  const handleFilesDropped = async (files: File[]) => {
    setIsUploading(true);
    setStatus({
      message: `Uploading ${files.length} file${
        files.length > 1 ? "s" : ""
      }...`,
      type: "info",
    });

    try {
      const result = await uploadTracks(files);

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
    }
  };

  return (
    <div className="app-container">
      <div className="app-main">
        <Map geometries={visibleGeometries} />
        <UploadZone
          onFilesDropped={handleFilesDropped}
          isUploading={isUploading}
        />
        {status && (
          <StatusMessage message={status.message} type={status.type} />
        )}
      </div>
      <TrackList />
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
