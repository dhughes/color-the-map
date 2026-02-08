import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Upload } from "lucide-react";
import { updateTrack, bulkUpdateTracks, deleteTracks } from "../../api/client";
import { SidebarPanel } from "../SidebarPanel";
import { MapSelector } from "../MapSelector";
import { TrackListItem } from "./TrackListItem";
import { SelectionPanel } from "./SelectionPanel";
import { ConfirmDialog } from "../ConfirmDialog";
import type { Track } from "../../types/track";
import type { MapData } from "../../types/map";
import type { SelectionSource } from "../../hooks/useSelection";
import type { SpeedColorRelative, TrackVisibility } from "../../types/track";
import { geometryCache } from "../../utils/geometryCache";

interface TrackListProps {
  tracks: Track[];
  mapId: number | null;
  maps: MapData[];
  onSelectMap: (mapId: number) => void;
  onCreateMap: (name: string) => void;
  onRenameMap: (mapId: number, name: string) => void;
  onDeleteMap: (mapId: number) => void;
  selectedTrackIds: Set<number>;
  anchorTrackId: number | null;
  onSelect: (trackId: number, isMultiSelect: boolean) => void;
  onSelectRange: (trackIds: number[], startId: number, endId: number) => void;
  onZoomToTrack: (track: Track) => void;
  onZoomToSelectedTracks: () => void;
  onUploadFiles: (files: File[]) => void;
  lastSelectedTrackId: number | null;
  selectionSource: SelectionSource | null;
  speedColorEnabled: boolean;
  onToggleSpeedColor: () => void;
  speedColorRelative: SpeedColorRelative;
  onToggleSpeedColorRelative: () => void;
}

export function TrackList({
  tracks,
  mapId,
  maps,
  onSelectMap,
  onCreateMap,
  onRenameMap,
  onDeleteMap,
  selectedTrackIds,
  anchorTrackId,
  onSelect,
  onSelectRange,
  onZoomToTrack,
  onZoomToSelectedTracks,
  onUploadFiles,
  lastSelectedTrackId,
  selectionSource,
  speedColorEnabled,
  onToggleSpeedColor,
  speedColorRelative,
  onToggleSpeedColorRelative,
}: TrackListProps) {
  const queryClient = useQueryClient();
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    trackIds: number[];
    count: number;
  } | null>(null);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []).filter((f) =>
        f.name.toLowerCase().endsWith(".gpx"),
      );
      if (files.length > 0) {
        onUploadFiles(files);
      }
      e.target.value = "";
    },
    [onUploadFiles],
  );

  const toggleVisibility = useMutation({
    mutationFn: ({
      trackId,
      visible,
    }: {
      trackId: number;
      visible: boolean;
    }) => {
      if (mapId === null) return Promise.reject(new Error("No map selected"));
      return updateTrack(mapId, trackId, { visible });
    },
    onMutate: async ({ trackId, visible }) => {
      await queryClient.cancelQueries({ queryKey: ["tracks", mapId] });

      const previousTracks = queryClient.getQueryData(["tracks", mapId]);

      queryClient.setQueryData(["tracks", mapId], (old: Track[] | undefined) =>
        old?.map((track) =>
          track.id === trackId ? { ...track, visible } : track,
        ),
      );

      return { previousTracks };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTracks) {
        queryClient.setQueryData(["tracks", mapId], context.previousTracks);
      }
    },
  });

  const deleteTracksMutation = useMutation({
    mutationFn: (trackIds: number[]) => {
      if (mapId === null) return Promise.reject(new Error("No map selected"));
      return deleteTracks(mapId, trackIds);
    },
    onMutate: (trackIdsToDelete) => {
      queryClient.cancelQueries({ queryKey: ["tracks", mapId] });

      const previousTracks = queryClient.getQueryData<Track[]>([
        "tracks",
        mapId,
      ]);
      const previousGeometries = queryClient.getQueryData(["geometries"]);

      const hashesToDelete =
        previousTracks
          ?.filter((track) => trackIdsToDelete.includes(track.id))
          .map((track) => track.hash) ?? [];

      if (hashesToDelete.length > 0) {
        geometryCache.deleteGeometries(hashesToDelete).catch((error) => {
          console.error("Failed to delete cached geometries:", error);
        });
      }

      queryClient.setQueryData(["tracks", mapId], (old: Track[] | undefined) =>
        old?.filter((track) => !trackIdsToDelete.includes(track.id)),
      );

      queryClient.setQueryData(
        ["geometries"],
        (
          old:
            | { track_id: number; coordinates: [number, number][] }[]
            | undefined,
        ) => old?.filter((geom) => !trackIdsToDelete.includes(geom.track_id)),
      );

      return { previousTracks, previousGeometries };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTracks) {
        queryClient.setQueryData(["tracks", mapId], context.previousTracks);
      }
      if (context?.previousGeometries) {
        queryClient.setQueryData(["geometries"], context.previousGeometries);
      }
    },
    onSuccess: () => {
      selectedTrackIds.clear();
    },
  });

  const handleDeleteTrack = (trackId: number) => {
    setConfirmDelete({ trackIds: [trackId], count: 1 });
  };

  const handleBulkDelete = () => {
    const count = selectedTrackIds.size;
    setConfirmDelete({
      trackIds: Array.from(selectedTrackIds),
      count,
    });
  };

  const handleConfirmDelete = () => {
    if (confirmDelete) {
      deleteTracksMutation.mutate(confirmDelete.trackIds);
    }
    setConfirmDelete(null);
  };

  const handleCancelDelete = () => {
    setConfirmDelete(null);
  };

  useEffect(() => {
    if (!lastSelectedTrackId || !listRef.current) {
      return;
    }

    const shouldScroll =
      selectionSource === "map" ||
      (selectionSource === "sidebar" && selectedTrackIds.size === 1);

    if (!shouldScroll) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      if (!listRef.current) return;

      const item = listRef.current.querySelector(
        `[data-track-id="${lastSelectedTrackId}"]`,
      );

      if (item) {
        const listRect = listRef.current.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();
        const isVisible =
          itemRect.top >= listRect.top && itemRect.bottom <= listRect.bottom;

        if (!isVisible) {
          item.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [lastSelectedTrackId, selectionSource, selectedTrackIds.size]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      if (!tracks.length) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedTrackIds.size > 0) {
          e.preventDefault();
          const count = selectedTrackIds.size;
          setConfirmDelete({
            trackIds: Array.from(selectedTrackIds),
            count,
          });
        }
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();

        const currentIndex = anchorTrackId
          ? tracks.findIndex((t) => t.id === anchorTrackId)
          : -1;

        let nextIndex: number;
        if (e.key === "ArrowDown") {
          nextIndex =
            currentIndex < tracks.length - 1 ? currentIndex + 1 : currentIndex;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : 0;
        }

        if (nextIndex >= 0 && nextIndex < tracks.length) {
          onSelect(tracks[nextIndex].id, false);

          const item = listRef.current?.querySelector(
            `[data-track-id="${tracks[nextIndex].id}"]`,
          );
          item?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [tracks, anchorTrackId, onSelect, selectedTrackIds]);

  const selectedTracks = useMemo(
    () => tracks.filter((t) => selectedTrackIds.has(t.id)),
    [selectedTrackIds, tracks],
  );

  const selectedTracksVisibility = useMemo((): TrackVisibility => {
    if (selectedTracks.length === 0) return "none";
    const allVisible = selectedTracks.every((t) => t.visible);
    const allHidden = selectedTracks.every((t) => !t.visible);
    if (allVisible) return "all";
    if (allHidden) return "none";
    return "mixed";
  }, [selectedTracks]);

  const toggleSelectedTracksVisibility = useMutation({
    mutationFn: ({
      trackIds,
      visible,
    }: {
      trackIds: number[];
      visible: boolean;
    }) => {
      if (mapId === null) return Promise.reject(new Error("No map selected"));
      return bulkUpdateTracks(mapId, trackIds, { visible });
    },
    onMutate: async ({ trackIds, visible }) => {
      await queryClient.cancelQueries({ queryKey: ["tracks", mapId] });

      const previousTracks = queryClient.getQueryData(["tracks", mapId]);

      const idSet = new Set(trackIds);
      queryClient.setQueryData(["tracks", mapId], (old: Track[] | undefined) =>
        old?.map((track) =>
          idSet.has(track.id) ? { ...track, visible } : track,
        ),
      );

      return { previousTracks };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTracks) {
        queryClient.setQueryData(["tracks", mapId], context.previousTracks);
      }
    },
  });

  const handleToggleSelectedTracksVisibility = () => {
    const trackIds = selectedTracks.map((t) => t.id);
    const visible = selectedTracksVisibility !== "all";
    toggleSelectedTracksVisibility.mutate({ trackIds, visible });
  };

  const [isolationState, setIsolationState] = useState<{
    selectionIds: Set<number>;
    hiddenTrackIds: number[];
  } | null>(null);

  const isolationActive = useMemo(() => {
    if (!isolationState) return false;
    if (isolationState.selectionIds.size !== selectedTrackIds.size)
      return false;
    for (const id of selectedTrackIds) {
      if (!isolationState.selectionIds.has(id)) return false;
    }
    return true;
  }, [selectedTrackIds, isolationState]);

  const handleToggleIsolation = () => {
    if (isolationActive && isolationState) {
      const trackIdsToRestore = isolationState.hiddenTrackIds;
      if (trackIdsToRestore.length > 0) {
        toggleSelectedTracksVisibility.mutate({
          trackIds: trackIdsToRestore,
          visible: true,
        });
      }
      setIsolationState(null);
    } else {
      const unselectedVisibleIds = tracks
        .filter((t) => !selectedTrackIds.has(t.id) && t.visible)
        .map((t) => t.id);
      if (unselectedVisibleIds.length > 0) {
        setIsolationState({
          selectionIds: new Set(selectedTrackIds),
          hiddenTrackIds: unselectedVisibleIds,
        });
        toggleSelectedTracksVisibility.mutate({
          trackIds: unselectedVisibleIds,
          visible: false,
        });
      }
    }
  };

  const hasVisibleUnselectedTracks = useMemo(
    () => tracks.some((t) => !selectedTrackIds.has(t.id) && t.visible),
    [tracks, selectedTrackIds],
  );

  const allActivityTypes = useMemo(() => {
    const types = new Set(
      tracks
        .map((t) => t.activity_type)
        .filter((type): type is string => type !== null && type !== ""),
    );
    return Array.from(types).sort();
  }, [tracks]);

  const handleDelete = () => {
    if (selectedTracks.length === 1) {
      handleDeleteTrack(selectedTracks[0].id);
    } else if (selectedTracks.length >= 2) {
      handleBulkDelete();
    }
  };

  return (
    <div className="track-list">
      <input
        ref={fileInputRef}
        type="file"
        accept=".gpx"
        multiple
        onChange={handleFileChange}
        hidden
      />
      {maps.length > 0 && mapId !== null && (
        <MapSelector
          maps={maps}
          currentMapId={mapId}
          onSelectMap={onSelectMap}
          onCreateMap={onCreateMap}
          onRenameMap={onRenameMap}
          onDeleteMap={onDeleteMap}
        />
      )}
      <SidebarPanel
        title="Tracks"
        action={
          <button
            onClick={handleUploadClick}
            aria-label="Upload GPX files"
            title="Upload GPX files"
          >
            <Upload size={16} />
          </button>
        }
      >
        <div className="track-list-items" ref={listRef}>
          {tracks.map((track) => (
            <TrackListItem
              key={track.id}
              track={track}
              isSelected={selectedTrackIds.has(track.id)}
              onSelect={(event) => {
                const isMultiSelect = event.metaKey || event.ctrlKey;
                const isRangeSelect = event.shiftKey;

                if (isRangeSelect && anchorTrackId !== null) {
                  const trackIds = tracks.map((t) => t.id);
                  onSelectRange(trackIds, anchorTrackId, track.id);
                } else {
                  onSelect(track.id, isMultiSelect);
                }
              }}
              onToggleVisibility={(event) => {
                event.stopPropagation();
                toggleVisibility.mutate({
                  trackId: track.id,
                  visible: !track.visible,
                });
              }}
              onDoubleClick={() => onZoomToTrack(track)}
            />
          ))}
        </div>
      </SidebarPanel>

      <SelectionPanel
        totalTracks={tracks.length}
        selectedTracks={selectedTracks}
        mapId={mapId}
        allActivityTypes={allActivityTypes}
        onDelete={handleDelete}
        onZoomToSelectedTracks={onZoomToSelectedTracks}
        speedColorEnabled={speedColorEnabled}
        onToggleSpeedColor={onToggleSpeedColor}
        speedColorRelative={speedColorRelative}
        onToggleSpeedColorRelative={onToggleSpeedColorRelative}
        selectedTracksVisibility={selectedTracksVisibility}
        onToggleSelectedTracksVisibility={handleToggleSelectedTracksVisibility}
        isolationActive={isolationActive}
        hasVisibleUnselectedTracks={hasVisibleUnselectedTracks}
        onToggleIsolation={handleToggleIsolation}
      />

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        title="Delete Tracks"
        message={
          confirmDelete
            ? `Delete ${confirmDelete.count} track${confirmDelete.count > 1 ? "s" : ""}?`
            : ""
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
