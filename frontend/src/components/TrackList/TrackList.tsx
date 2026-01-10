import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listTracks, updateTrack } from "../../api/client";
import { TrackListItem } from "./TrackListItem";
import type { Track } from "../../types/track";

export function TrackList() {
  const queryClient = useQueryClient();

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

  return (
    <div className="track-list">
      <div className="track-list-header">
        <h2>Tracks</h2>
        <span className="track-count">{tracks.length}</span>
      </div>

      <div className="track-list-items">
        {tracks.map((track) => (
          <TrackListItem
            key={track.id}
            track={track}
            onToggleVisibility={() =>
              toggleVisibility.mutate({
                trackId: track.id,
                visible: !track.visible,
              })
            }
          />
        ))}
      </div>
    </div>
  );
}
