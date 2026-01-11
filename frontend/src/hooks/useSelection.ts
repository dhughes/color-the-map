import { useState } from "react";

export function useSelection() {
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<number>>(
    new Set(),
  );

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
    }
  };

  const clearSelection = () => {
    setSelectedTrackIds(new Set());
  };

  return { selectedTrackIds, toggleSelection, clearSelection };
}
