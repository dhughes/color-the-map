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
import { LoginModal } from "./components/LoginModal";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useSelection } from "./hooks/useSelection";
import { useViewportGeometries } from "./hooks/useViewportGeometries";
import {
  uploadTracksWithProgress,
  listTracks,
  setAccessToken,
} from "./api/client";
import { geometryCache } from "./utils/geometryCache";
import type { Track } from "./types/track";
import { version } from "../package.json";

const queryClient = new QueryClient();
const EMPTY_TRACKS: Track[] = [];
const VERSION_DISPLAY_STYLES = {
  position: "absolute" as const,
  bottom: "10px",
  left: "10px",
  fontSize: "12px",
  color: "#000",
  fontFamily: "system-ui, sans-serif",
  pointerEvents: "none" as const,
  userSelect: "none" as const,
};

export function AppContent() {
  const { isAuthenticated, isLoading, accessToken, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
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
    lastSelectedTrackId,
    selectionSource,
  } = useSelection();

  const { data: tracksData = [] } = useQuery<Track[]>({
    queryKey: ["tracks"],
    queryFn: listTracks,
    enabled: isAuthenticated,
  });

  const tracks = useMemo(
    () => (isAuthenticated ? tracksData : EMPTY_TRACKS),
    [isAuthenticated, tracksData],
  );

  useEffect(() => {
    setAccessToken(accessToken);
  }, [accessToken]);

  useEffect(() => {
    setShowLoginModal(!isAuthenticated && !isLoading);
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);

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

  const {
    geometries: allGeometries,
    isLoading: isLoadingGeometries,
    loadingCount: geometryLoadingCount,
    error: geometryError,
    onViewportChange,
    retryFetch,
  } = useViewportGeometries(tracks);

  const visibleGeometries = useMemo(() => {
    const visibleIds = new Set(
      tracks.filter((track) => track.visible).map((track) => track.id),
    );
    return allGeometries.filter((geometry) =>
      visibleIds.has(geometry.track_id),
    );
  }, [tracks, allGeometries]);

  const handleLogout = async () => {
    try {
      queryClient.clear();
      await geometryCache.clearCache();
      clearSelection();
      await logout();
    } catch (error) {
      console.error("Logout cleanup failed:", error);
      await logout();
    }
  };

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

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontFamily: "system-ui, sans-serif",
          color: "#666",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <>
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
      <div className="app-container">
        {isAuthenticated && (
          <button
            onClick={handleLogout}
            style={{
              position: "absolute",
              top: "16px",
              left: "16px",
              zIndex: 100,
              padding: "8px 16px",
              background: "var(--color-overlay, #fffef9)",
              color: "var(--color-text, #1a1a1a)",
              border: "1px solid var(--color-border, #e8e8e6)",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: "500",
              letterSpacing: "-0.01em",
              fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
              boxShadow: "var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.06))",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-bg, #fafaf8)";
              e.currentTarget.style.borderColor = "rgba(107, 107, 107, 0.3)";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.08))";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                "var(--color-overlay, #fffef9)";
              e.currentTarget.style.borderColor =
                "var(--color-border, #e8e8e6)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.06))";
            }}
          >
            Logout
          </button>
        )}
        <div className="app-main">
          <Map
            ref={mapRef}
            geometries={visibleGeometries}
            selectedTrackIds={selectedTrackIds}
            onSelect={(trackId, isMultiSelect) =>
              toggleSelection(trackId, isMultiSelect, "map")
            }
            onClearSelection={clearSelection}
            onViewportChange={onViewportChange}
          />
          <div style={VERSION_DISPLAY_STYLES}>v{version}</div>
          {isLoadingGeometries && (
            <div
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "rgba(255, 255, 255, 0.95)",
                padding: "8px 12px",
                borderRadius: "4px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  border: "2px solid #ccc",
                  borderTopColor: "#666",
                  borderRadius: "50%",
                  animation: "spin 0.6s linear infinite",
                }}
              />
              Loading {geometryLoadingCount}{" "}
              {geometryLoadingCount === 1 ? "track" : "tracks"}...
            </div>
          )}
          {geometryError && (
            <div
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "rgba(220, 38, 38, 0.95)",
                color: "white",
                padding: "8px 12px",
                borderRadius: "4px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {geometryError}
              <button
                onClick={retryFetch}
                style={{
                  background: "white",
                  color: "#dc2626",
                  border: "none",
                  padding: "4px 8px",
                  borderRadius: "3px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                Retry
              </button>
            </div>
          )}
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
          tracks={tracks}
          selectedTrackIds={selectedTrackIds}
          anchorTrackId={anchorTrackId}
          onSelect={toggleSelection}
          onSelectRange={selectRange}
          onZoomToTrack={handleZoomToTrack}
          lastSelectedTrackId={lastSelectedTrackId}
          selectionSource={selectionSource}
        />
      </div>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
