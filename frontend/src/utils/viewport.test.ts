import { describe, it, expect } from "vitest";
import {
  expandBounds,
  trackIntersectsViewport,
  getTracksInViewport,
  type ViewportBounds,
} from "./viewport";
import type { Track } from "../types/track";

const createMockTrack = (
  id: number,
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  },
): Track => ({
  id,
  hash: `hash-${id}`,
  name: `Track ${id}`,
  filename: `track-${id}.gpx`,
  activity_type: null,
  activity_type_inferred: null,
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
  description: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
});

describe("expandBounds", () => {
  it("expands bounds by buffer factor", () => {
    const bounds: ViewportBounds = {
      minLat: 10,
      maxLat: 20,
      minLon: 30,
      maxLon: 40,
    };

    const expanded = expandBounds(bounds, 0.5);

    expect(expanded.minLat).toBe(5);
    expect(expanded.maxLat).toBe(25);
    expect(expanded.minLon).toBe(25);
    expect(expanded.maxLon).toBe(45);
  });

  it("handles zero buffer factor", () => {
    const bounds: ViewportBounds = {
      minLat: 10,
      maxLat: 20,
      minLon: 30,
      maxLon: 40,
    };

    const expanded = expandBounds(bounds, 0);

    expect(expanded).toEqual(bounds);
  });

  it("handles negative coordinates", () => {
    const bounds: ViewportBounds = {
      minLat: -20,
      maxLat: -10,
      minLon: -40,
      maxLon: -30,
    };

    const expanded = expandBounds(bounds, 0.5);

    expect(expanded.minLat).toBe(-25);
    expect(expanded.maxLat).toBe(-5);
    expect(expanded.minLon).toBe(-45);
    expect(expanded.maxLon).toBe(-25);
  });
});

describe("trackIntersectsViewport", () => {
  const viewport: ViewportBounds = {
    minLat: 10,
    maxLat: 20,
    minLon: 30,
    maxLon: 40,
  };

  it("returns true for track fully inside viewport", () => {
    const track = createMockTrack(1, {
      minLat: 12,
      maxLat: 18,
      minLon: 32,
      maxLon: 38,
    });

    expect(trackIntersectsViewport(track, viewport)).toBe(true);
  });

  it("returns true for track partially overlapping viewport", () => {
    const track = createMockTrack(1, {
      minLat: 5,
      maxLat: 15,
      minLon: 25,
      maxLon: 35,
    });

    expect(trackIntersectsViewport(track, viewport)).toBe(true);
  });

  it("returns true for track containing viewport", () => {
    const track = createMockTrack(1, {
      minLat: 0,
      maxLat: 30,
      minLon: 20,
      maxLon: 50,
    });

    expect(trackIntersectsViewport(track, viewport)).toBe(true);
  });

  it("returns false for track completely outside viewport", () => {
    const track = createMockTrack(1, {
      minLat: 25,
      maxLat: 30,
      minLon: 45,
      maxLon: 50,
    });

    expect(trackIntersectsViewport(track, viewport)).toBe(false);
  });

  it("returns true for track touching viewport edge", () => {
    const track = createMockTrack(1, {
      minLat: 20,
      maxLat: 25,
      minLon: 40,
      maxLon: 45,
    });

    expect(trackIntersectsViewport(track, viewport)).toBe(true);
  });

  it("returns false for track with null bounds", () => {
    const track: Track = {
      ...createMockTrack(1, { minLat: 10, maxLat: 20, minLon: 30, maxLon: 40 }),
      bounds_min_lat: null,
      bounds_max_lat: null,
      bounds_min_lon: null,
      bounds_max_lon: null,
    };

    expect(trackIntersectsViewport(track, viewport)).toBe(false);
  });

  it("returns false for track with partially null bounds", () => {
    const track: Track = {
      ...createMockTrack(1, { minLat: 10, maxLat: 20, minLon: 30, maxLon: 40 }),
      bounds_min_lat: 10,
      bounds_max_lat: null,
      bounds_min_lon: 30,
      bounds_max_lon: 40,
    };

    expect(trackIntersectsViewport(track, viewport)).toBe(false);
  });
});

describe("getTracksInViewport", () => {
  const viewport: ViewportBounds = {
    minLat: 10,
    maxLat: 20,
    minLon: 30,
    maxLon: 40,
  };

  it("returns tracks within viewport bounds", () => {
    const tracks = [
      createMockTrack(1, { minLat: 12, maxLat: 18, minLon: 32, maxLon: 38 }),
      createMockTrack(2, { minLat: 25, maxLat: 30, minLon: 45, maxLon: 50 }),
      createMockTrack(3, { minLat: 5, maxLat: 15, minLon: 25, maxLon: 35 }),
    ];

    const result = getTracksInViewport(tracks, viewport, 0);

    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual([1, 3]);
  });

  it("applies buffer factor correctly", () => {
    const tracks = [
      createMockTrack(1, { minLat: 12, maxLat: 18, minLon: 32, maxLon: 38 }),
      createMockTrack(2, { minLat: 50, maxLat: 60, minLon: 70, maxLon: 80 }),
      createMockTrack(3, { minLat: -5, maxLat: 5, minLon: 30, maxLon: 40 }),
    ];

    const result = getTracksInViewport(tracks, viewport, 0.5);

    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual([1, 3]);
  });

  it("returns empty array when no tracks intersect", () => {
    const tracks = [
      createMockTrack(1, { minLat: 50, maxLat: 60, minLon: 70, maxLon: 80 }),
      createMockTrack(2, {
        minLat: -30,
        maxLat: -20,
        minLon: -40,
        maxLon: -30,
      }),
    ];

    const result = getTracksInViewport(tracks, viewport, 0);

    expect(result).toHaveLength(0);
  });

  it("filters out tracks with null bounds", () => {
    const tracks = [
      createMockTrack(1, { minLat: 12, maxLat: 18, minLon: 32, maxLon: 38 }),
      {
        ...createMockTrack(2, {
          minLat: 15,
          maxLat: 18,
          minLon: 35,
          maxLon: 38,
        }),
        bounds_min_lat: null,
      } as Track,
    ];

    const result = getTracksInViewport(tracks, viewport, 0);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("uses default buffer factor of 0.5", () => {
    const tracks = [
      createMockTrack(1, { minLat: 12, maxLat: 18, minLon: 32, maxLon: 38 }),
      createMockTrack(2, { minLat: 22, maxLat: 24, minLon: 30, maxLon: 40 }),
    ];

    const result = getTracksInViewport(tracks, viewport);

    expect(result).toHaveLength(2);
  });
});
