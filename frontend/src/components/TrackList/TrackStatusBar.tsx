interface TrackStatusBarProps {
  totalTracks: number;
  selectedCount: number;
}

export function TrackStatusBar({
  totalTracks,
  selectedCount,
}: TrackStatusBarProps) {
  const hasSelection = selectedCount > 0;

  const statusText =
    selectedCount === 0
      ? `${totalTracks} Track${totalTracks !== 1 ? "s" : ""}`
      : `${selectedCount} Track${selectedCount !== 1 ? "s" : ""} Selected`;

  return (
    <div
      className={`track-status-bar ${hasSelection ? "track-status-bar-selected" : ""}`}
    >
      <span className="track-status-bar-accent" />
      <span className="track-status-bar-text">{statusText}</span>
    </div>
  );
}
