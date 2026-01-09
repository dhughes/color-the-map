import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listTracks, updateTrack } from "../../api/client";
import { TrackListItem } from "./TrackListItem";

export function TrackList() {
  const queryClient = useQueryClient();

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ["tracks"],
    queryFn: listTracks,
  });

  const toggleVisibility = useMutation({
    mutationFn: ({ trackId, visible }: { trackId: number; visible: boolean }) =>
      updateTrack(trackId, { visible }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "geometries",
      });
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
