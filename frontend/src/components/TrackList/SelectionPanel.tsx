import { SidebarPanel } from "../SidebarPanel";
import { TrackDetailsPanel } from "./TrackDetailsPanel";
import { BulkOperationsPanel } from "./BulkOperationsPanel";
import type { Track } from "../../types/track";

interface SelectionPanelProps {
  totalTracks: number;
  selectedTrack: Track | null;
  selectedTracks: Track[];
  allActivityTypes: string[];
  onDelete: () => void;
}

export function SelectionPanel({
  totalTracks,
  selectedTrack,
  selectedTracks,
  allActivityTypes,
  onDelete,
}: SelectionPanelProps) {
  const hasSelection = selectedTrack !== null || selectedTracks.length > 0;
  const selectionCount = selectedTrack ? 1 : selectedTracks.length;

  const headerText = hasSelection
    ? `${selectionCount} Track${selectionCount !== 1 ? "s" : ""} Selected`
    : `${totalTracks} Track${totalTracks !== 1 ? "s" : ""}`;

  const content = selectedTrack ? (
    <TrackDetailsPanel
      track={selectedTrack}
      allActivityTypes={allActivityTypes}
      onDelete={onDelete}
    />
  ) : selectedTracks.length >= 2 ? (
    <BulkOperationsPanel
      tracks={selectedTracks}
      allActivityTypes={allActivityTypes}
      onDelete={onDelete}
    />
  ) : null;

  return <SidebarPanel title={headerText}>{content}</SidebarPanel>;
}
