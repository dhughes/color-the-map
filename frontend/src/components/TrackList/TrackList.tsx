import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useMemo } from "react";
import { updateTrack, deleteTracks } from "../../api/client";
import { TrackListItem } from "./TrackListItem";
import { TrackDetailsPanel } from "./TrackDetailsPanel";
import { BulkOperationsPanel } from "./BulkOperationsPanel";
import { TrackStatusBar } from "./TrackStatusBar";
import { ConfirmDialog } from "../ConfirmDialog";
import type { Track } from "../../types/track";
import type { SelectionSource } from "../../hooks/useSelection";
import { geometryCache } from "../../utils/geometryCache";

interface TrackListProps {
  tracks: Track[];
  selectedTrackIds: Set<number>;
  anchorTrackId: number | null;
  onSelect: (trackId: number, isMultiSelect: boolean) => void;
  onSelectRange: (trackIds: number[], startId: number, endId: number) => void;
  onZoomToTrack: (track: Track) => void;
  lastSelectedTrackId: number | null;
  selectionSource: SelectionSource | null;
}

export function TrackList({
  tracks,
  selectedTrackIds,
  anchorTrackId,
  onSelect,
  onSelectRange,
  onZoomToTrack,
  lastSelectedTrackId,
  selectionSource,
}: TrackListProps) {
  const queryClient = useQueryClient();
  const listRef = useRef<HTMLDivElement>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    trackIds: number[];
    count: number;
  } | null>(null);

  const toggleVisibility = useMutation({
    mutationFn: ({ trackId, visible }: { trackId: number; visible: boolean }) =>
      updateTrack(trackId, { visible }),
    onMutate: async ({ trackId, visible }) => {
      await queryClient.cancelQueries({ queryKey: ["tracks"] });

      const previousTracks = queryClient.getQueryData(["tracks"]);

      queryClient.setQueryData(["tracks"], (old: Track[] | undefined) =>
        old?.map((track) =>
          track.id === trackId ? { ...track, visible } : track,
        ),
      );

      return { previousTracks };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTracks) {
        queryClient.setQueryData(["tracks"], context.previousTracks);
      }
    },
  });

  const deleteTracksMutation = useMutation({
    mutationFn: (trackIds: number[]) => deleteTracks(trackIds),
    onMutate: (trackIdsToDelete) => {
      queryClient.cancelQueries({ queryKey: ["tracks"] });

      const previousTracks = queryClient.getQueryData<Track[]>(["tracks"]);
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

      queryClient.setQueryData(["tracks"], (old: Track[] | undefined) =>
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
        queryClient.setQueryData(["tracks"], context.previousTracks);
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

  const selectedCount = selectedTrackIds.size;

  const selectedTrack = useMemo(() => {
    if (selectedTrackIds.size === 1) {
      const selectedId = Array.from(selectedTrackIds)[0];
      return tracks.find((t) => t.id === selectedId) || null;
    }
    return null;
  }, [selectedTrackIds, tracks]);

  const selectedTracks = useMemo(() => {
    if (selectedTrackIds.size >= 2) {
      return tracks.filter((t) => selectedTrackIds.has(t.id));
    }
    return [];
  }, [selectedTrackIds, tracks]);

  const allActivityTypes = useMemo(() => {
    const types = new Set(
      tracks
        .map((t) => t.activity_type)
        .filter((type): type is string => type !== null && type !== ""),
    );
    return Array.from(types).sort();
  }, [tracks]);

  return (
    <div className="track-list">
      <div className="track-list-header">
        <h2>Tracks</h2>
      </div>

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

      <TrackStatusBar
        totalTracks={tracks.length}
        selectedCount={selectedCount}
      />

      {selectedTrack && (
        <TrackDetailsPanel
          key={selectedTrack.id}
          track={selectedTrack}
          allActivityTypes={allActivityTypes}
          onDelete={() => handleDeleteTrack(selectedTrack.id)}
        />
      )}

      {selectedTracks.length >= 2 && (
        <BulkOperationsPanel
          tracks={selectedTracks}
          allActivityTypes={allActivityTypes}
          onDelete={handleBulkDelete}
        />
      )}

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
