import { useState } from "react";

export function useSelection() {
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<number>>(
    new Set(),
  );
  const [anchorTrackId, setAnchorTrackId] = useState<number | null>(null);

  const toggleSelection = (trackId: number, isMultiSelect: boolean) => {
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
    } else {
      setSelectedTrackIds(new Set([trackId]));
      setAnchorTrackId(trackId);
    }
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
  };
}
