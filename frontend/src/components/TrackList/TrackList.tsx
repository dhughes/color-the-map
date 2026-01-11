import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { listTracks, updateTrack } from "../../api/client";
import { TrackListItem } from "./TrackListItem";
import type { Track } from "../../types/track";

interface TrackListProps {
  selectedTrackIds: Set<number>;
  anchorTrackId: number | null;
  onSelect: (trackId: number, isMultiSelect: boolean) => void;
  onSelectRange: (trackIds: number[], startId: number, endId: number) => void;
}

export function TrackList({
  selectedTrackIds,
  anchorTrackId,
  onSelect,
  onSelectRange,
}: TrackListProps) {
  const queryClient = useQueryClient();
  const listRef = useRef<HTMLDivElement>(null);

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ["tracks"],
    queryFn: listTracks,
  });

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      if (!tracks.length) return;

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
  }, [tracks, anchorTrackId, onSelect]);

  if (isLoading) {
    return (
      <div className="track-list">
        <div className="track-list-header">
          <h2>Tracks</h2>
        </div>
        <div className="track-list-loading">Loading tracks...</div>
      </div>
    );
  }

  const selectedCount = selectedTrackIds.size;

  return (
    <div className="track-list">
      <div className="track-list-header">
        <div className="track-list-title">
          <h2>Tracks</h2>
          <span className="track-count">{tracks.length}</span>
        </div>
        {selectedCount > 0 && (
          <span className="track-selected-count">{selectedCount} selected</span>
        )}
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
          />
        ))}
      </div>
    </div>
  );
}
