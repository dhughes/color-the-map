import type { Track } from "../../types/track";

interface TrackListItemProps {
  track: Track;
  onToggleVisibility: () => void;
}

export function TrackListItem({
  track,
  onToggleVisibility,
}: TrackListItemProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDistance = (meters: number | null) => {
    if (!meters) return null;
    const km = meters / 1000;
    return `${km.toFixed(1)} km`;
  };

  return (
    <div className="track-item">
      <button
        className="track-item-visibility"
        onClick={onToggleVisibility}
        aria-label={track.visible ? "Hide track" : "Show track"}
        title={track.visible ? "Hide track" : "Show track"}
      >
        {track.visible ? "👁" : "👁‍🗨"}
      </button>

      <div className="track-item-content">
        <div className="track-item-name">{track.name}</div>
        <div className="track-item-meta">
          <span className="track-item-type">
            {track.activity_type || "Unknown"}
          </span>
          <span className="track-item-separator">•</span>
          <span className="track-item-date">
            {formatDate(track.activity_date)}
          </span>
          {formatDistance(track.distance_meters) && (
            <>
              <span className="track-item-separator">•</span>
              <span className="track-item-distance">
                {formatDistance(track.distance_meters)}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
