import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSelection } from "./useSelection";

describe("useSelection", () => {
  it("initializes with empty selection", () => {
    const { result } = renderHook(() => useSelection());
    expect(result.current.selectedTrackIds.size).toBe(0);
  });

  it("selects single track on regular click", () => {
    const { result } = renderHook(() => useSelection());

    act(() => {
      result.current.toggleSelection(1, false);
    });

    expect(result.current.selectedTrackIds.has(1)).toBe(true);
    expect(result.current.selectedTrackIds.size).toBe(1);
  });

  it("replaces selection on regular click when tracks already selected", () => {
    const { result } = renderHook(() => useSelection());

    act(() => {
      result.current.toggleSelection(1, false);
      result.current.toggleSelection(2, false);
    });

    expect(result.current.selectedTrackIds.has(1)).toBe(false);
    expect(result.current.selectedTrackIds.has(2)).toBe(true);
    expect(result.current.selectedTrackIds.size).toBe(1);
  });

  it("adds track to selection on multi-select click", () => {
    const { result } = renderHook(() => useSelection());

    act(() => {
      result.current.toggleSelection(1, false);
      result.current.toggleSelection(2, true);
    });

    expect(result.current.selectedTrackIds.has(1)).toBe(true);
    expect(result.current.selectedTrackIds.has(2)).toBe(true);
    expect(result.current.selectedTrackIds.size).toBe(2);
  });

  it("removes track from selection on multi-select click if already selected", () => {
    const { result } = renderHook(() => useSelection());

    act(() => {
      result.current.toggleSelection(1, true);
      result.current.toggleSelection(2, true);
      result.current.toggleSelection(1, true);
    });

    expect(result.current.selectedTrackIds.has(1)).toBe(false);
    expect(result.current.selectedTrackIds.has(2)).toBe(true);
    expect(result.current.selectedTrackIds.size).toBe(1);
  });

  it("clears all selection", () => {
    const { result } = renderHook(() => useSelection());

    act(() => {
      result.current.toggleSelection(1, true);
      result.current.toggleSelection(2, true);
      result.current.clearSelection();
    });

    expect(result.current.selectedTrackIds.size).toBe(0);
  });

  it("selects all tracks", () => {
    const { result } = renderHook(() => useSelection());

    act(() => {
      result.current.selectAll([1, 2, 3, 4, 5]);
    });

    expect(result.current.selectedTrackIds.size).toBe(5);
    expect(result.current.selectedTrackIds.has(1)).toBe(true);
    expect(result.current.selectedTrackIds.has(5)).toBe(true);
  });

  it("selects range from anchor to clicked", () => {
    const { result } = renderHook(() => useSelection());
    const trackIds = [10, 20, 30, 40, 50];

    act(() => {
      result.current.toggleSelection(20, false);
      result.current.selectRange(trackIds, 20, 40);
    });

    expect(result.current.selectedTrackIds.has(20)).toBe(true);
    expect(result.current.selectedTrackIds.has(30)).toBe(true);
    expect(result.current.selectedTrackIds.has(40)).toBe(true);
    expect(result.current.selectedTrackIds.has(10)).toBe(false);
    expect(result.current.selectedTrackIds.has(50)).toBe(false);
    expect(result.current.selectedTrackIds.size).toBe(3);
  });

  it("selects range in reverse order", () => {
    const { result } = renderHook(() => useSelection());
    const trackIds = [10, 20, 30, 40, 50];

    act(() => {
      result.current.selectRange(trackIds, 40, 20);
    });

    expect(result.current.selectedTrackIds.size).toBe(3);
    expect(result.current.selectedTrackIds.has(20)).toBe(true);
    expect(result.current.selectedTrackIds.has(30)).toBe(true);
    expect(result.current.selectedTrackIds.has(40)).toBe(true);
  });

  describe("selection source tracking", () => {
    it("tracks selection source when provided", () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.toggleSelection(1, false, "map");
      });

      expect(result.current.selectionSource).toBe("map");
      expect(result.current.lastSelectedTrackId).toBe(1);
    });

    it("defaults to sidebar source when not provided", () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.toggleSelection(1, false);
      });

      expect(result.current.selectionSource).toBe("sidebar");
      expect(result.current.lastSelectedTrackId).toBe(1);
    });

    it("updates lastSelectedTrackId on each selection", () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.toggleSelection(1, false, "map");
      });

      expect(result.current.lastSelectedTrackId).toBe(1);

      act(() => {
        result.current.toggleSelection(2, true, "map");
      });

      expect(result.current.lastSelectedTrackId).toBe(2);
    });

    it("tracks different selection sources", () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.toggleSelection(1, false, "map");
      });

      expect(result.current.selectionSource).toBe("map");

      act(() => {
        result.current.toggleSelection(2, false, "sidebar");
      });

      expect(result.current.selectionSource).toBe("sidebar");

      act(() => {
        result.current.toggleSelection(3, false, "keyboard");
      });

      expect(result.current.selectionSource).toBe("keyboard");
    });

    it("initializes with null values", () => {
      const { result } = renderHook(() => useSelection());

      expect(result.current.lastSelectedTrackId).toBe(null);
      expect(result.current.selectionSource).toBe(null);
    });
  });
});
