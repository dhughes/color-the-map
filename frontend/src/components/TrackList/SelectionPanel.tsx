import {
  Blocks,
  Eye,
  EyeOff,
  Focus,
  Gauge,
  LayoutGrid,
  Layers,
} from "lucide-react";
import { SidebarPanel } from "../SidebarPanel";
import { TrackDetailsPanel } from "./TrackDetailsPanel";
import { BulkOperationsPanel } from "./BulkOperationsPanel";
import type {
  Track,
  SpeedColorRelative,
  TrackVisibility,
} from "../../types/track";

interface SelectionPanelProps {
  totalTracks: number;
  selectedTracks: Track[];
  mapId: number | null;
  allActivityTypes: string[];
  onDelete: () => void;
  onZoomToSelectedTracks?: () => void;
  speedColorEnabled?: boolean;
  onToggleSpeedColor?: () => void;
  speedColorRelative?: SpeedColorRelative;
  onToggleSpeedColorRelative?: () => void;
  selectedTracksVisibility?: TrackVisibility;
  onToggleSelectedTracksVisibility?: () => void;
  isolationActive?: boolean;
  hasVisibleUnselectedTracks?: boolean;
  onToggleIsolation?: () => void;
}

export function SelectionPanel({
  totalTracks,
  selectedTracks,
  mapId,
  allActivityTypes,
  onDelete,
  onZoomToSelectedTracks,
  speedColorEnabled = false,
  onToggleSpeedColor,
  speedColorRelative = "each",
  onToggleSpeedColorRelative,
  selectedTracksVisibility,
  onToggleSelectedTracksVisibility,
  isolationActive = false,
  hasVisibleUnselectedTracks = false,
  onToggleIsolation,
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
        mapId={mapId!}
        allActivityTypes={allActivityTypes}
        onDelete={onDelete}
      />
    ) : selectionCount >= 2 ? (
      <BulkOperationsPanel
        tracks={selectedTracks}
        mapId={mapId!}
        allActivityTypes={allActivityTypes}
        onDelete={onDelete}
      />
    ) : null;

  const actions = (
    <>
      {onToggleSpeedColor && (
        <button
          onClick={onToggleSpeedColor}
          className={["panel-icon-button", speedColorEnabled && "active"]
            .filter(Boolean)
            .join(" ")}
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
          className={[
            "panel-icon-button",
            speedColorRelative === "all" && speedColorEnabled && "active",
            !speedColorEnabled && "disabled",
          ]
            .filter(Boolean)
            .join(" ")}
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
      {selectionCount > 0 && onToggleSelectedTracksVisibility && (
        <button
          onClick={onToggleSelectedTracksVisibility}
          className="panel-icon-button visibility-toggle"
          aria-label={
            selectedTracksVisibility === "all"
              ? "Hide selected tracks"
              : "Show selected tracks"
          }
          title={
            selectedTracksVisibility === "all"
              ? "Hide selected tracks"
              : selectedTracksVisibility === "mixed"
                ? "Show selected tracks (mixed visibility)"
                : "Show selected tracks"
          }
        >
          {selectedTracksVisibility === "all" ? (
            <Eye size={16} />
          ) : (
            <EyeOff size={16} />
          )}
          {selectedTracksVisibility === "mixed" && (
            <span className="visibility-mixed-indicator">*</span>
          )}
        </button>
      )}
      {selectionCount > 0 && onToggleIsolation && (
        <button
          onClick={onToggleIsolation}
          className={[
            "panel-icon-button",
            isolationActive && "active",
            !isolationActive && !hasVisibleUnselectedTracks && "disabled",
          ]
            .filter(Boolean)
            .join(" ")}
          disabled={!isolationActive && !hasVisibleUnselectedTracks}
          aria-label={
            isolationActive ? "Unisolate tracks" : "Isolate selected tracks"
          }
          title={
            isolationActive
              ? "Unisolate tracks"
              : hasVisibleUnselectedTracks
                ? "Isolate selected tracks"
                : "No visible unselected tracks to hide"
          }
        >
          {isolationActive ? <LayoutGrid size={16} /> : <Blocks size={16} />}
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
