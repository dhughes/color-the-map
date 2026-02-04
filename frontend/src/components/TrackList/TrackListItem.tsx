import { Eye, EyeOff, X } from "lucide-react";
import type { Track } from "../../types/track";
import { formatDateShort, formatDistance } from "../../utils/formatters";

interface TrackListItemProps {
  track: Track;
  isSelected: boolean;
  onSelect: (event: React.MouseEvent) => void;
  onToggleVisibility: (event: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onDelete: (event: React.MouseEvent) => void;
}

export function TrackListItem({
  track,
  isSelected,
  onSelect,
  onToggleVisibility,
  onDoubleClick,
  onDelete,
}: TrackListItemProps) {
  const handleEyeClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onToggleVisibility(event);
  };

  const handleDeleteClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onDelete(event);
  };

  const handleClick = (event: React.MouseEvent) => {
    if (event.detail === 2) return;
    onSelect(event);
  };

  return (
    <div
      className={`track-item ${isSelected ? "selected" : ""}`}
      onClick={handleClick}
      onDoubleClick={onDoubleClick}
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
            {formatDateShort(track.activity_date)}
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

      <button
        className="track-item-delete"
        onClick={handleDeleteClick}
        aria-label="Delete track"
        title="Delete track"
      >
        <X size={14} />
      </button>
    </div>
  );
}
