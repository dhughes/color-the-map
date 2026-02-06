import { describe, it, expect, vi, beforeEach } from "vitest";
import { config } from "../config";
import {
  sourceId,
  deselectedLayerId,
  selectedBgLayerId,
  selectedFgLayerId,
  parseTrackIdFromLayerId,
  addTrackSource,
  removeTrackSource,
  addDeselectedLayer,
  addSelectedLayers,
  removeTrackLayers,
  syncTrackSources,
  syncSelection,
} from "./trackLayerManager";

function createMockMap() {
  const sources = new Map<string, unknown>();
  const layers = new Map<string, { id: string; source: string }>();

  return {
    addSource: vi.fn((id: string, spec: unknown) => {
      if (sources.has(id)) {
        throw new Error(`Source '${id}' already exists`);
      }
      sources.set(id, spec);
    }),
    removeSource: vi.fn((id: string) => {
      if (!sources.has(id)) {
        throw new Error(`Source '${id}' does not exist`);
      }
      sources.delete(id);
    }),
    getSource: vi.fn((id: string) => sources.get(id) ?? null),
    addLayer: vi.fn((spec: { id: string; source: string }) => {
      if (layers.has(spec.id)) {
        throw new Error(`Layer '${spec.id}' already exists`);
      }
      if (!sources.has(spec.source)) {
        throw new Error(
          `Source '${spec.source}' does not exist for layer '${spec.id}'`,
        );
      }
      layers.set(spec.id, spec);
    }),
    removeLayer: vi.fn((id: string) => {
      if (!layers.has(id)) {
        throw new Error(`Layer '${id}' does not exist`);
      }
      layers.delete(id);
    }),
    getLayer: vi.fn((id: string) => layers.get(id) ?? null),
    _sources: sources,
    _layers: layers,
  };
}

type MockMap = ReturnType<typeof createMockMap>;

describe("trackLayerManager", () => {
  describe("naming functions", () => {
    it("generates source IDs", () => {
      expect(sourceId(42)).toBe("track-42");
    });

    it("generates deselected layer IDs", () => {
      expect(deselectedLayerId(42)).toBe("deselected-42");
    });

    it("generates selected background layer IDs", () => {
      expect(selectedBgLayerId(42)).toBe("selected-bg-42");
    });

    it("generates selected foreground layer IDs", () => {
      expect(selectedFgLayerId(42)).toBe("selected-fg-42");
    });
  });

  describe("parseTrackIdFromLayerId", () => {
    it("parses deselected layer IDs", () => {
      expect(parseTrackIdFromLayerId("deselected-7")).toBe(7);
    });

    it("parses selected-bg layer IDs", () => {
      expect(parseTrackIdFromLayerId("selected-bg-99")).toBe(99);
    });

    it("parses selected-fg layer IDs", () => {
      expect(parseTrackIdFromLayerId("selected-fg-1")).toBe(1);
    });

    it("returns null for unrecognized prefixes", () => {
      expect(parseTrackIdFromLayerId("osm")).toBeNull();
      expect(parseTrackIdFromLayerId("track-5")).toBeNull();
      expect(parseTrackIdFromLayerId("random-layer")).toBeNull();
    });

    it("returns null for non-numeric suffixes", () => {
      expect(parseTrackIdFromLayerId("deselected-abc")).toBeNull();
    });
  });

  describe("addTrackSource", () => {
    let mockMap: MockMap;

    beforeEach(() => {
      mockMap = createMockMap();
    });

    it("adds a GeoJSON source for a track", () => {
      const coords: [number, number][] = [
        [-79, 35],
        [-79.1, 35.1],
      ];
      addTrackSource(mockMap as never, 1, coords);

      expect(mockMap.addSource).toHaveBeenCalledWith("track-1", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: { id: 1 },
          geometry: {
            type: "LineString",
            coordinates: coords,
          },
        },
      });
    });

    it("does not add a duplicate source", () => {
      const coords: [number, number][] = [
        [-79, 35],
        [-79.1, 35.1],
      ];
      addTrackSource(mockMap as never, 1, coords);
      addTrackSource(mockMap as never, 1, coords);

      expect(mockMap.addSource).toHaveBeenCalledTimes(1);
    });

    it("handles empty coordinate arrays", () => {
      addTrackSource(mockMap as never, 1, []);
      expect(mockMap._sources.has("track-1")).toBe(true);
    });
  });

  describe("removeTrackSource", () => {
    let mockMap: MockMap;

    beforeEach(() => {
      mockMap = createMockMap();
    });

    it("removes the source and all associated layers", () => {
      const coords: [number, number][] = [
        [-79, 35],
        [-79.1, 35.1],
      ];
      addTrackSource(mockMap as never, 1, coords);
      addDeselectedLayer(mockMap as never, 1);

      removeTrackSource(mockMap as never, 1);

      expect(mockMap._sources.has("track-1")).toBe(false);
      expect(mockMap._layers.has("deselected-1")).toBe(false);
    });

    it("is a no-op if source does not exist", () => {
      removeTrackSource(mockMap as never, 999);
      expect(mockMap.removeSource).not.toHaveBeenCalled();
    });
  });

  describe("addDeselectedLayer", () => {
    let mockMap: MockMap;

    beforeEach(() => {
      mockMap = createMockMap();
      addTrackSource(mockMap as never, 1, [
        [-79, 35],
        [-79.1, 35.1],
      ]);
    });

    it("adds a deselected layer with correct paint properties", () => {
      addDeselectedLayer(mockMap as never, 1);

      expect(mockMap.addLayer).toHaveBeenCalledWith({
        id: "deselected-1",
        type: "line",
        source: "track-1",
        paint: {
          "line-color": config.trackColor,
          "line-width": config.trackLineWidth,
          "line-opacity": config.trackOpacity,
        },
      });
    });

    it("does not add a duplicate layer", () => {
      addDeselectedLayer(mockMap as never, 1);
      addDeselectedLayer(mockMap as never, 1);

      expect(mockMap.addLayer).toHaveBeenCalledTimes(1);
    });
  });

  describe("addSelectedLayers", () => {
    let mockMap: MockMap;

    beforeEach(() => {
      mockMap = createMockMap();
      addTrackSource(mockMap as never, 1, [
        [-79, 35],
        [-79.1, 35.1],
      ]);
    });

    it("adds background and foreground layers", () => {
      addSelectedLayers(mockMap as never, 1);

      expect(mockMap.addLayer).toHaveBeenCalledTimes(2);
      expect(mockMap._layers.has("selected-bg-1")).toBe(true);
      expect(mockMap._layers.has("selected-fg-1")).toBe(true);
    });

    it("uses correct paint for background layer", () => {
      addSelectedLayers(mockMap as never, 1);

      expect(mockMap.addLayer).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "selected-bg-1",
          paint: {
            "line-color": config.trackSelectedBorderColor,
            "line-width": config.trackSelectedBorderWidth,
            "line-opacity": 1,
          },
        }),
      );
    });

    it("uses correct paint for foreground layer", () => {
      addSelectedLayers(mockMap as never, 1);

      expect(mockMap.addLayer).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "selected-fg-1",
          paint: {
            "line-color": config.trackSelectedColor,
            "line-width": config.trackSelectedLineWidth,
            "line-opacity": config.trackOpacity,
          },
        }),
      );
    });
  });

  describe("removeTrackLayers", () => {
    let mockMap: MockMap;

    beforeEach(() => {
      mockMap = createMockMap();
      addTrackSource(mockMap as never, 1, [
        [-79, 35],
        [-79.1, 35.1],
      ]);
    });

    it("removes a deselected layer", () => {
      addDeselectedLayer(mockMap as never, 1);
      removeTrackLayers(mockMap as never, 1);

      expect(mockMap._layers.has("deselected-1")).toBe(false);
    });

    it("removes selected layers", () => {
      addSelectedLayers(mockMap as never, 1);
      removeTrackLayers(mockMap as never, 1);

      expect(mockMap._layers.has("selected-bg-1")).toBe(false);
      expect(mockMap._layers.has("selected-fg-1")).toBe(false);
    });
  });

  describe("syncTrackSources", () => {
    let mockMap: MockMap;

    beforeEach(() => {
      mockMap = createMockMap();
    });

    it("adds sources and deselected layers for new tracks", () => {
      const geometries = [
        { track_id: 1, coordinates: [[-79, 35]] as [number, number][] },
        { track_id: 2, coordinates: [[-78, 34]] as [number, number][] },
      ];

      const result = syncTrackSources(
        mockMap as never,
        geometries,
        new Set(),
        new Set(),
      );

      expect(result).toEqual(new Set([1, 2]));
      expect(mockMap._sources.has("track-1")).toBe(true);
      expect(mockMap._sources.has("track-2")).toBe(true);
      expect(mockMap._layers.has("deselected-1")).toBe(true);
      expect(mockMap._layers.has("deselected-2")).toBe(true);
    });

    it("adds selected layers for tracks that are already selected", () => {
      const geometries = [
        { track_id: 1, coordinates: [[-79, 35]] as [number, number][] },
      ];

      syncTrackSources(mockMap as never, geometries, new Set(), new Set([1]));

      expect(mockMap._layers.has("selected-bg-1")).toBe(true);
      expect(mockMap._layers.has("selected-fg-1")).toBe(true);
      expect(mockMap._layers.has("deselected-1")).toBe(false);
    });

    it("removes sources for tracks no longer in viewport", () => {
      const initial = [
        { track_id: 1, coordinates: [[-79, 35]] as [number, number][] },
        { track_id: 2, coordinates: [[-78, 34]] as [number, number][] },
      ];
      const currentIds = syncTrackSources(
        mockMap as never,
        initial,
        new Set(),
        new Set(),
      );

      const updated = [
        { track_id: 2, coordinates: [[-78, 34]] as [number, number][] },
      ];
      const result = syncTrackSources(
        mockMap as never,
        updated,
        currentIds,
        new Set(),
      );

      expect(result).toEqual(new Set([2]));
      expect(mockMap._sources.has("track-1")).toBe(false);
      expect(mockMap._layers.has("deselected-1")).toBe(false);
      expect(mockMap._sources.has("track-2")).toBe(true);
    });

    it("preserves existing tracks that are still in viewport", () => {
      const geometries = [
        { track_id: 1, coordinates: [[-79, 35]] as [number, number][] },
      ];
      const currentIds = syncTrackSources(
        mockMap as never,
        geometries,
        new Set(),
        new Set(),
      );

      mockMap.addSource.mockClear();
      mockMap.addLayer.mockClear();

      syncTrackSources(mockMap as never, geometries, currentIds, new Set());

      expect(mockMap.addSource).not.toHaveBeenCalled();
      expect(mockMap.addLayer).not.toHaveBeenCalled();
    });

    it("handles duplicate track IDs in geometries", () => {
      const geometries = [
        { track_id: 1, coordinates: [[-79, 35]] as [number, number][] },
        { track_id: 1, coordinates: [[-78, 34]] as [number, number][] },
      ];
      const result = syncTrackSources(
        mockMap as never,
        geometries,
        new Set(),
        new Set(),
      );

      expect(result).toEqual(new Set([1]));
      expect(mockMap.addSource).toHaveBeenCalledTimes(1);
    });

    it("excludes failed tracks from returned set", () => {
      mockMap.addSource.mockImplementationOnce(() => {
        throw new Error("WebGL error");
      });

      const geometries = [
        { track_id: 1, coordinates: [[-79, 35]] as [number, number][] },
        { track_id: 2, coordinates: [[-78, 34]] as [number, number][] },
      ];

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const result = syncTrackSources(
        mockMap as never,
        geometries,
        new Set(),
        new Set(),
      );
      consoleSpy.mockRestore();

      expect(result).toEqual(new Set([2]));
      expect(mockMap._sources.has("track-1")).toBe(false);
      expect(mockMap._sources.has("track-2")).toBe(true);
    });

    it("continues removing other tracks when one removal fails", () => {
      const geometries = [
        { track_id: 1, coordinates: [[-79, 35]] as [number, number][] },
        { track_id: 2, coordinates: [[-78, 34]] as [number, number][] },
      ];
      const currentIds = syncTrackSources(
        mockMap as never,
        geometries,
        new Set(),
        new Set(),
      );

      mockMap.removeLayer.mockImplementationOnce(() => {
        throw new Error("WebGL error");
      });

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      syncTrackSources(mockMap as never, [], currentIds, new Set());
      consoleSpy.mockRestore();

      expect(mockMap._sources.has("track-2")).toBe(false);
    });
  });

  describe("syncSelection", () => {
    let mockMap: MockMap;

    beforeEach(() => {
      mockMap = createMockMap();
      const geometries = [
        { track_id: 1, coordinates: [[-79, 35]] as [number, number][] },
        { track_id: 2, coordinates: [[-78, 34]] as [number, number][] },
        { track_id: 3, coordinates: [[-77, 33]] as [number, number][] },
      ];
      syncTrackSources(mockMap as never, geometries, new Set(), new Set());
    });

    it("transitions a track from deselected to selected", () => {
      syncSelection(
        mockMap as never,
        new Set([1]),
        new Set(),
        new Set([1, 2, 3]),
      );

      expect(mockMap._layers.has("deselected-1")).toBe(false);
      expect(mockMap._layers.has("selected-bg-1")).toBe(true);
      expect(mockMap._layers.has("selected-fg-1")).toBe(true);
      expect(mockMap._layers.has("deselected-2")).toBe(true);
      expect(mockMap._layers.has("deselected-3")).toBe(true);
    });

    it("transitions a track from selected to deselected", () => {
      syncSelection(
        mockMap as never,
        new Set([1]),
        new Set(),
        new Set([1, 2, 3]),
      );

      syncSelection(
        mockMap as never,
        new Set(),
        new Set([1]),
        new Set([1, 2, 3]),
      );

      expect(mockMap._layers.has("deselected-1")).toBe(true);
      expect(mockMap._layers.has("selected-bg-1")).toBe(false);
      expect(mockMap._layers.has("selected-fg-1")).toBe(false);
    });

    it("handles multi-select", () => {
      syncSelection(
        mockMap as never,
        new Set([1, 3]),
        new Set(),
        new Set([1, 2, 3]),
      );

      expect(mockMap._layers.has("selected-bg-1")).toBe(true);
      expect(mockMap._layers.has("selected-fg-1")).toBe(true);
      expect(mockMap._layers.has("deselected-2")).toBe(true);
      expect(mockMap._layers.has("selected-bg-3")).toBe(true);
      expect(mockMap._layers.has("selected-fg-3")).toBe(true);
    });

    it("does nothing for tracks whose selection state has not changed", () => {
      syncSelection(
        mockMap as never,
        new Set([1]),
        new Set(),
        new Set([1, 2, 3]),
      );

      mockMap.addLayer.mockClear();
      mockMap.removeLayer.mockClear();

      syncSelection(
        mockMap as never,
        new Set([1]),
        new Set([1]),
        new Set([1, 2, 3]),
      );

      expect(mockMap.addLayer).not.toHaveBeenCalled();
      expect(mockMap.removeLayer).not.toHaveBeenCalled();
    });

    it("continues selecting other tracks when one fails", () => {
      let callCount = 0;
      const originalRemoveLayer = mockMap.removeLayer.getMockImplementation()!;
      mockMap.removeLayer.mockImplementation((id: string) => {
        callCount++;
        if (callCount === 1) {
          throw new Error("WebGL error");
        }
        return originalRemoveLayer(id);
      });

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      syncSelection(
        mockMap as never,
        new Set([1, 3]),
        new Set(),
        new Set([1, 2, 3]),
      );
      consoleSpy.mockRestore();

      expect(mockMap._layers.has("selected-bg-3")).toBe(true);
      expect(mockMap._layers.has("selected-fg-3")).toBe(true);
    });
  });
});
