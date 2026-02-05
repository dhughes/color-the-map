import { describe, it, expect, beforeEach, vi } from "vitest";
import { mapViewStorage, type MapViewState } from "./mapViewStorage";

describe("mapViewStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("getMapView", () => {
    it("returns null when no view is saved", () => {
      expect(mapViewStorage.getMapView()).toBeNull();
    });

    it("returns saved view when valid", () => {
      const view: MapViewState = {
        center: [-84.4801, 42.7325],
        zoom: 13,
      };
      localStorage.setItem("map_view_state", JSON.stringify(view));

      expect(mapViewStorage.getMapView()).toEqual(view);
    });

    it("returns null for invalid JSON", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      localStorage.setItem("map_view_state", "invalid json");

      expect(mapViewStorage.getMapView()).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it("returns null for invalid center format (not array)", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      localStorage.setItem(
        "map_view_state",
        JSON.stringify({ center: "invalid", zoom: 13 }),
      );

      expect(mapViewStorage.getMapView()).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it("returns null for invalid center format (wrong length)", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      localStorage.setItem(
        "map_view_state",
        JSON.stringify({ center: [-84], zoom: 13 }),
      );

      expect(mapViewStorage.getMapView()).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it("returns null for invalid center format (non-numeric)", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      localStorage.setItem(
        "map_view_state",
        JSON.stringify({ center: ["a", "b"], zoom: 13 }),
      );

      expect(mapViewStorage.getMapView()).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it("returns null for invalid zoom type", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      localStorage.setItem(
        "map_view_state",
        JSON.stringify({ center: [-84, 42], zoom: "13" }),
      );

      expect(mapViewStorage.getMapView()).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it("returns null for missing center", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      localStorage.setItem("map_view_state", JSON.stringify({ zoom: 13 }));

      expect(mapViewStorage.getMapView()).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it("returns null for missing zoom", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      localStorage.setItem(
        "map_view_state",
        JSON.stringify({ center: [-84, 42] }),
      );

      expect(mapViewStorage.getMapView()).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("setMapView", () => {
    it("saves view to localStorage", () => {
      const view: MapViewState = {
        center: [-84.4801, 42.7325],
        zoom: 15,
      };

      mapViewStorage.setMapView(view);

      expect(localStorage.getItem("map_view_state")).toBe(JSON.stringify(view));
    });

    it("handles storage errors gracefully", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("Storage full");
      });

      expect(() => {
        mapViewStorage.setMapView({ center: [-84, 42], zoom: 13 });
      }).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("clearMapView", () => {
    it("removes saved view from localStorage", () => {
      localStorage.setItem(
        "map_view_state",
        JSON.stringify({ center: [-84, 42], zoom: 13 }),
      );

      mapViewStorage.clearMapView();

      expect(localStorage.getItem("map_view_state")).toBeNull();
    });

    it("does not throw when no view is saved", () => {
      expect(() => {
        mapViewStorage.clearMapView();
      }).not.toThrow();
    });

    it("handles storage errors gracefully", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new Error("Storage error");
      });

      expect(() => {
        mapViewStorage.clearMapView();
      }).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
