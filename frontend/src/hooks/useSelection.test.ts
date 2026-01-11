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
});
