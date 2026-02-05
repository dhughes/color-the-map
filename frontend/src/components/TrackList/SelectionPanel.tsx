import { Focus } from "lucide-react";
import { SidebarPanel } from "../SidebarPanel";
import { TrackDetailsPanel } from "./TrackDetailsPanel";
import { BulkOperationsPanel } from "./BulkOperationsPanel";
import type { Track } from "../../types/track";

interface SelectionPanelProps {
  totalTracks: number;
  selectedTracks: Track[];
  allActivityTypes: string[];
  onDelete: () => void;
  onZoomToSelectedTracks?: () => void;
}

export function SelectionPanel({
  totalTracks,
  selectedTracks,
  allActivityTypes,
  onDelete,
  onZoomToSelectedTracks,
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

  const zoomAction =
    selectionCount > 0 && onZoomToSelectedTracks ? (
      <button
        onClick={onZoomToSelectedTracks}
        aria-label="Zoom to selected tracks"
        title="Zoom to selected tracks"
      >
        <Focus size={16} />
      </button>
    ) : undefined;

  return (
    <SidebarPanel title={headerText} action={zoomAction}>
      {content}
    </SidebarPanel>
  );
}
