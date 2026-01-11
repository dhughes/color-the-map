import { Eye, EyeOff } from "lucide-react";
import type { Track } from "../../types/track";

interface TrackListItemProps {
  track: Track;
  isSelected: boolean;
  onSelect: (event: React.MouseEvent) => void;
  onToggleVisibility: (event: React.MouseEvent) => void;
}

export function TrackListItem({
  track,
  isSelected,
  onSelect,
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

  const handleEyeClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onToggleVisibility(event);
  };

  return (
    <div
      className={`track-item ${isSelected ? "selected" : ""}`}
      onClick={onSelect}
      data-track-id={track.id}
    >
      <button
        className="track-item-visibility"
        onClick={handleEyeClick}
        aria-label={track.visible ? "Hide track" : "Show track"}
        title={track.visible ? "Hide track" : "Show track"}
      >
        {track.visible ? <Eye size={18} /> : <EyeOff size={18} />}
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
