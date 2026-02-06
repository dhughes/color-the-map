import { Focus, Gauge, Layers } from "lucide-react";
import { SidebarPanel } from "../SidebarPanel";
import { TrackDetailsPanel } from "./TrackDetailsPanel";
import { BulkOperationsPanel } from "./BulkOperationsPanel";
import type { Track } from "../../types/track";

export type SpeedColorRelative = "each" | "all";

interface SelectionPanelProps {
  totalTracks: number;
  selectedTracks: Track[];
  allActivityTypes: string[];
  onDelete: () => void;
  onZoomToSelectedTracks?: () => void;
  speedColorEnabled?: boolean;
  onToggleSpeedColor?: () => void;
  speedColorRelative?: SpeedColorRelative;
  onToggleSpeedColorRelative?: () => void;
}

export function SelectionPanel({
  totalTracks,
  selectedTracks,
  allActivityTypes,
  onDelete,
  onZoomToSelectedTracks,
  speedColorEnabled = false,
  onToggleSpeedColor,
  speedColorRelative = "each",
  onToggleSpeedColorRelative,
}: SelectionPanelProps) {
  const selectionCount = selectedTracks.length;

  const headerText =
    selectionCount > 0
      ? `${selectionCount} Track${selectionCount !== 1 ? "s" : ""} Selected`
      : `${totalTracks} Track${totalTracks !== 1 ? "s" : ""}`;

  const content =
    selectionCount === 1 ? (
      <TrackDetailsPanel
        key={selectedTracks[0].id}
        track={selectedTracks[0]}
        allActivityTypes={allActivityTypes}
        onDelete={onDelete}
      />
    ) : selectionCount >= 2 ? (
      <BulkOperationsPanel
        tracks={selectedTracks}
        allActivityTypes={allActivityTypes}
        onDelete={onDelete}
      />
    ) : null;

  const actions = (
    <>
      {onToggleSpeedColor && (
        <button
          onClick={onToggleSpeedColor}
          className={`panel-icon-button${speedColorEnabled ? " active" : ""}`}
          aria-label="Speed coloring"
          title={
            speedColorEnabled
              ? "Disable speed coloring"
              : "Enable speed coloring"
          }
        >
          <Gauge size={16} />
        </button>
      )}
      {onToggleSpeedColorRelative && (
        <button
          onClick={onToggleSpeedColorRelative}
          className={`panel-icon-button${speedColorRelative === "all" && speedColorEnabled ? " active" : ""}${!speedColorEnabled ? " disabled" : ""}`}
          disabled={!speedColorEnabled}
          aria-label="Compare across all tracks"
          title={
            !speedColorEnabled
              ? "Enable speed coloring to compare across tracks"
              : speedColorRelative === "each"
                ? "Comparing within each track"
                : "Comparing across all tracks"
          }
        >
          <Layers size={16} />
        </button>
      )}
      {selectionCount > 0 && onZoomToSelectedTracks && (
        <button
          onClick={onZoomToSelectedTracks}
          aria-label="Zoom to selected tracks"
          title="Zoom to selected tracks"
        >
          <Focus size={16} />
        </button>
      )}
    </>
  );

  return (
    <SidebarPanel title={headerText} action={actions}>
      {content}
    </SidebarPanel>
  );
}
