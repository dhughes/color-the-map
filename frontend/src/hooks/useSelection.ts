import { useState } from "react";

export type SelectionSource = "map" | "sidebar" | "keyboard";

export function useSelection() {
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<number>>(
    new Set(),
  );
  const [anchorTrackId, setAnchorTrackId] = useState<number | null>(null);
  const [lastSelectedTrackId, setLastSelectedTrackId] = useState<number | null>(
    null,
  );
  const [selectionSource, setSelectionSource] =
    useState<SelectionSource | null>(null);

  const toggleSelection = (
    trackId: number,
    isMultiSelect: boolean,
    source: SelectionSource = "sidebar",
  ) => {
    if (isMultiSelect) {
      setSelectedTrackIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(trackId)) {
          newSet.delete(trackId);
        } else {
          newSet.add(trackId);
        }
        return newSet;
      });
      setAnchorTrackId(trackId);
    } else {
      setSelectedTrackIds(new Set([trackId]));
      setAnchorTrackId(trackId);
    }
    setLastSelectedTrackId(trackId);
    setSelectionSource(source);
  };

  const selectRange = (trackIds: number[], startId: number, endId: number) => {
    const startIndex = trackIds.indexOf(startId);
    const endIndex = trackIds.indexOf(endId);

    if (startIndex === -1 || endIndex === -1) return;

    const [from, to] =
      startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
    const rangeIds = trackIds.slice(from, to + 1);

    setSelectedTrackIds(new Set(rangeIds));
    setAnchorTrackId(endId);
  };

  const selectAll = (trackIds: number[]) => {
    setSelectedTrackIds(new Set(trackIds));
  };

  const clearSelection = () => {
    setSelectedTrackIds(new Set());
    setAnchorTrackId(null);
  };

  return {
    selectedTrackIds,
    anchorTrackId,
    toggleSelection,
    selectRange,
    selectAll,
    clearSelection,
    lastSelectedTrackId,
    selectionSource,
  };
}
