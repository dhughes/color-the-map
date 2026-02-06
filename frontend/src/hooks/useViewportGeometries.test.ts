import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useViewportGeometries } from "./useViewportGeometries";
import type { Track, TrackGeometry } from "../types/track";
import type { ViewportBounds } from "../utils/viewport";
import * as geometryCacheModule from "../utils/geometryCache";
import * as apiClient from "../api/client";

vi.mock("../utils/geometryCache");
vi.mock("../api/client");

const createTrack = (
  id: number,
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  },
): Track => ({
  id,
  hash: `hash${id}`,
  name: `Track ${id}`,
  filename: `track${id}.gpx`,
  activity_type: null,
  activity_date: "2024-01-01T00:00:00Z",
  uploaded_at: "2024-01-01T00:00:00Z",
  distance_meters: null,
  duration_seconds: null,
  avg_speed_ms: null,
  max_speed_ms: null,
  min_speed_ms: null,
  elevation_gain_meters: null,
  elevation_loss_meters: null,
  bounds_min_lat: bounds.minLat,
  bounds_max_lat: bounds.maxLat,
  bounds_min_lon: bounds.minLon,
  bounds_max_lon: bounds.maxLon,
  visible: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useViewportGeometries", () => {
  it("returns empty geometries with empty tracks", () => {
    const tracks: Track[] = [];
    const { result } = renderHook(() => useViewportGeometries(tracks));

    expect(result.current.geometries).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("fetches geometries when viewport changes", async () => {
    const tracks = [
      createTrack(1, { minLat: 10, maxLat: 20, minLon: 30, maxLon: 40 }),
    ];
    const geometry: TrackGeometry = { track_id: 1, coordinates: [[0, 0]] };

    vi.mocked(
      geometryCacheModule.geometryCache.getGeometries,
    ).mockResolvedValue([]);
    vi.mocked(
      geometryCacheModule.geometryCache.setGeometries,
    ).mockResolvedValue();
    vi.mocked(apiClient.getTrackGeometries).mockResolvedValue([geometry]);

    const { result } = renderHook(() => useViewportGeometries(tracks));

    const viewport: ViewportBounds = {
      minLat: 5,
      maxLat: 25,
      minLon: 25,
      maxLon: 45,
    };

    act(() => {
      result.current.onViewportChange(viewport);
    });

    await waitFor(
      () => {
        expect(result.current.geometries).toHaveLength(1);
      },
      { timeout: 1000 },
    );

    expect(vi.mocked(apiClient.getTrackGeometries)).toHaveBeenCalled();
    const callArgs = vi.mocked(apiClient.getTrackGeometries).mock.calls[0];
    expect(callArgs[0]).toEqual([1]);
    expect(callArgs[1]).toBeInstanceOf(AbortSignal);
  });

  it("uses cached geometries", async () => {
    const tracks = [
      createTrack(1, { minLat: 10, maxLat: 20, minLon: 30, maxLon: 40 }),
    ];
    const geometry: TrackGeometry = { track_id: 1, coordinates: [[0, 0]] };

    vi.mocked(
      geometryCacheModule.geometryCache.getGeometries,
    ).mockResolvedValue([geometry]);

    const { result } = renderHook(() => useViewportGeometries(tracks));

    const viewport: ViewportBounds = {
      minLat: 5,
      maxLat: 25,
      minLon: 25,
      maxLon: 45,
    };

    act(() => {
      result.current.onViewportChange(viewport);
    });

    await waitFor(
      () => {
        expect(result.current.geometries).toEqual([geometry]);
      },
      { timeout: 1000 },
    );

    expect(vi.mocked(apiClient.getTrackGeometries)).not.toHaveBeenCalled();
  });

  it("handles API errors", async () => {
    const tracks = [
      createTrack(1, { minLat: 10, maxLat: 20, minLon: 30, maxLon: 40 }),
    ];

    vi.mocked(
      geometryCacheModule.geometryCache.getGeometries,
    ).mockResolvedValue([]);
    vi.mocked(apiClient.getTrackGeometries).mockRejectedValue(
      new Error("Network error"),
    );

    const { result } = renderHook(() => useViewportGeometries(tracks));

    const viewport: ViewportBounds = {
      minLat: 5,
      maxLat: 25,
      minLon: 25,
      maxLon: 45,
    };

    act(() => {
      result.current.onViewportChange(viewport);
    });

    await waitFor(
      () => {
        expect(result.current.error).toBe("Network error");
      },
      { timeout: 1000 },
    );

    expect(result.current.isLoading).toBe(false);
  });

  it("filters tracks outside viewport", async () => {
    const tracks = [
      createTrack(1, { minLat: 50, maxLat: 60, minLon: 70, maxLon: 80 }),
    ];

    const { result } = renderHook(() => useViewportGeometries(tracks));

    const viewport: ViewportBounds = {
      minLat: 0,
      maxLat: 10,
      minLon: 0,
      maxLon: 10,
    };

    act(() => {
      result.current.onViewportChange(viewport);
    });

    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(result.current.geometries).toEqual([]);
    expect(vi.mocked(apiClient.getTrackGeometries)).not.toHaveBeenCalled();
  });

  it("passes AbortSignal to API calls", async () => {
    const tracks = [
      createTrack(1, { minLat: 10, maxLat: 20, minLon: 30, maxLon: 40 }),
    ];
    const geometry: TrackGeometry = { track_id: 1, coordinates: [[0, 0]] };

    vi.mocked(
      geometryCacheModule.geometryCache.getGeometries,
    ).mockResolvedValue([]);
    vi.mocked(
      geometryCacheModule.geometryCache.setGeometries,
    ).mockResolvedValue();
    vi.mocked(apiClient.getTrackGeometries).mockResolvedValue([geometry]);

    const { result } = renderHook(() => useViewportGeometries(tracks));

    const viewport: ViewportBounds = {
      minLat: 5,
      maxLat: 25,
      minLon: 25,
      maxLon: 45,
    };

    act(() => {
      result.current.onViewportChange(viewport);
    });

    await waitFor(
      () => {
        expect(result.current.geometries).toHaveLength(1);
      },
      { timeout: 1000 },
    );

    const callArgs = vi.mocked(apiClient.getTrackGeometries).mock.calls[0];
    expect(callArgs[1]).toBeInstanceOf(AbortSignal);
  });
});
