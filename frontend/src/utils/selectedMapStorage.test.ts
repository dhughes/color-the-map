import { describe, it, expect, beforeEach, vi } from "vitest";
import { selectedMapStorage } from "./selectedMapStorage";

describe("selectedMapStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("getSelectedMapId", () => {
    it("returns null when nothing is saved", () => {
      expect(selectedMapStorage.getSelectedMapId()).toBeNull();
    });

    it("returns saved map ID", () => {
      localStorage.setItem("selected_map_id", "5");

      expect(selectedMapStorage.getSelectedMapId()).toBe(5);
    });

    it("returns null for non-numeric value", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      localStorage.setItem("selected_map_id", "abc");

      expect(selectedMapStorage.getSelectedMapId()).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it("returns null for zero", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      localStorage.setItem("selected_map_id", "0");

      expect(selectedMapStorage.getSelectedMapId()).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it("returns null for negative numbers", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      localStorage.setItem("selected_map_id", "-3");

      expect(selectedMapStorage.getSelectedMapId()).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it("returns null for floating point numbers", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      localStorage.setItem("selected_map_id", "2.5");

      expect(selectedMapStorage.getSelectedMapId()).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("setSelectedMapId", () => {
    it("saves map ID to localStorage", () => {
      selectedMapStorage.setSelectedMapId(7);

      expect(localStorage.getItem("selected_map_id")).toBe("7");
    });

    it("handles storage errors gracefully", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("Storage full");
      });

      expect(() => {
        selectedMapStorage.setSelectedMapId(1);
      }).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("clearSelectedMapId", () => {
    it("removes saved map ID from localStorage", () => {
      localStorage.setItem("selected_map_id", "3");

      selectedMapStorage.clearSelectedMapId();

      expect(localStorage.getItem("selected_map_id")).toBeNull();
    });

    it("does not throw when nothing is saved", () => {
      expect(() => {
        selectedMapStorage.clearSelectedMapId();
      }).not.toThrow();
    });

    it("handles storage errors gracefully", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new Error("Storage error");
      });

      expect(() => {
        selectedMapStorage.clearSelectedMapId();
      }).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
