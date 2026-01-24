import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { geometryCache } from "./geometryCache";
import type { TrackGeometry } from "../types/track";

const mockGeometry1: TrackGeometry = {
  track_id: 1,
  coordinates: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
};

const mockGeometry2: TrackGeometry = {
  track_id: 2,
  coordinates: [
    [10, 10],
    [11, 11],
    [12, 12],
  ],
};

const mockGeometry3: TrackGeometry = {
  track_id: 3,
  coordinates: [
    [20, 20],
    [21, 21],
  ],
};

beforeEach(async () => {
  await geometryCache.clearCache();
});

describe("geometryCache", () => {
  describe("setGeometry and getGeometry", () => {
    it("stores and retrieves a single geometry", async () => {
      await geometryCache.setGeometry(mockGeometry1);
      const result = await geometryCache.getGeometry(1);

      expect(result).toEqual(mockGeometry1);
    });

    it("returns null for non-existent geometry", async () => {
      const result = await geometryCache.getGeometry(999);

      expect(result).toBeNull();
    });

    it("overwrites existing geometry with same track_id", async () => {
      await geometryCache.setGeometry(mockGeometry1);

      const updated: TrackGeometry = {
        track_id: 1,
        coordinates: [[5, 5]],
      };

      await geometryCache.setGeometry(updated);
      const result = await geometryCache.getGeometry(1);

      expect(result).toEqual(updated);
    });
  });

  describe("setGeometries and getGeometries", () => {
    it("stores and retrieves multiple geometries", async () => {
      await geometryCache.setGeometries([
        mockGeometry1,
        mockGeometry2,
        mockGeometry3,
      ]);

      const result = await geometryCache.getGeometries([1, 2, 3]);

      expect(result).toHaveLength(3);
      expect(result).toEqual(
        expect.arrayContaining([mockGeometry1, mockGeometry2, mockGeometry3]),
      );
    });

    it("returns only existing geometries when some are missing", async () => {
      await geometryCache.setGeometries([mockGeometry1, mockGeometry3]);

      const result = await geometryCache.getGeometries([1, 2, 3]);

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([mockGeometry1, mockGeometry3]),
      );
    });

    it("returns empty array when no geometries exist", async () => {
      const result = await geometryCache.getGeometries([1, 2, 3]);

      expect(result).toEqual([]);
    });

    it("returns empty array for empty input", async () => {
      await geometryCache.setGeometries([mockGeometry1, mockGeometry2]);

      const result = await geometryCache.getGeometries([]);

      expect(result).toEqual([]);
    });

    it("handles empty geometries array in setGeometries", async () => {
      await geometryCache.setGeometries([]);

      const result = await geometryCache.getGeometries([1, 2, 3]);
      expect(result).toEqual([]);
    });
  });

  describe("clearCache", () => {
    it("removes all geometries from cache", async () => {
      await geometryCache.setGeometries([
        mockGeometry1,
        mockGeometry2,
        mockGeometry3,
      ]);

      await geometryCache.clearCache();

      const result = await geometryCache.getGeometries([1, 2, 3]);
      expect(result).toEqual([]);
    });

    it("works on empty cache", async () => {
      await geometryCache.clearCache();

      const result = await geometryCache.getGeometries([1, 2, 3]);
      expect(result).toEqual([]);
    });
  });

  describe("cache persistence", () => {
    it("preserves data after multiple operations", async () => {
      await geometryCache.setGeometry(mockGeometry1);
      await geometryCache.setGeometry(mockGeometry2);

      const result1 = await geometryCache.getGeometry(1);
      expect(result1).toEqual(mockGeometry1);

      await geometryCache.setGeometry(mockGeometry3);

      const result2 = await geometryCache.getGeometries([1, 2, 3]);
      expect(result2).toHaveLength(3);
    });
  });
});
