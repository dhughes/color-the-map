import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { geometryCache, type CachedGeometry } from "./geometryCache";

const mockGeometry1: CachedGeometry = {
  track_id: 1,
  hash: "hash1",
  coordinates: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
};

const mockGeometry2: CachedGeometry = {
  track_id: 2,
  hash: "hash2",
  coordinates: [
    [10, 10],
    [11, 11],
    [12, 12],
  ],
};

const mockGeometry3: CachedGeometry = {
  track_id: 3,
  hash: "hash3",
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
      const result = await geometryCache.getGeometry("hash1");

      expect(result).toEqual(mockGeometry1);
    });

    it("returns null for non-existent geometry", async () => {
      const result = await geometryCache.getGeometry("nonexistent");

      expect(result).toBeNull();
    });

    it("overwrites existing geometry with same hash", async () => {
      await geometryCache.setGeometry(mockGeometry1);

      const updated: CachedGeometry = {
        track_id: 1,
        hash: "hash1",
        coordinates: [[5, 5]],
      };

      await geometryCache.setGeometry(updated);
      const result = await geometryCache.getGeometry("hash1");

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

      const result = await geometryCache.getGeometries([
        "hash1",
        "hash2",
        "hash3",
      ]);

      expect(result).toHaveLength(3);
      expect(result).toEqual(
        expect.arrayContaining([mockGeometry1, mockGeometry2, mockGeometry3]),
      );
    });

    it("returns only existing geometries when some are missing", async () => {
      await geometryCache.setGeometries([mockGeometry1, mockGeometry3]);

      const result = await geometryCache.getGeometries([
        "hash1",
        "hash2",
        "hash3",
      ]);

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([mockGeometry1, mockGeometry3]),
      );
    });

    it("returns empty array when no geometries exist", async () => {
      const result = await geometryCache.getGeometries([
        "hash1",
        "hash2",
        "hash3",
      ]);

      expect(result).toEqual([]);
    });

    it("returns empty array for empty input", async () => {
      await geometryCache.setGeometries([mockGeometry1, mockGeometry2]);

      const result = await geometryCache.getGeometries([]);

      expect(result).toEqual([]);
    });

    it("handles empty geometries array in setGeometries", async () => {
      await geometryCache.setGeometries([]);

      const result = await geometryCache.getGeometries([
        "hash1",
        "hash2",
        "hash3",
      ]);
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

      const result = await geometryCache.getGeometries([
        "hash1",
        "hash2",
        "hash3",
      ]);
      expect(result).toEqual([]);
    });

    it("works on empty cache", async () => {
      await geometryCache.clearCache();

      const result = await geometryCache.getGeometries([
        "hash1",
        "hash2",
        "hash3",
      ]);
      expect(result).toEqual([]);
    });
  });

  describe("deleteGeometries", () => {
    it("deletes specified geometries from cache", async () => {
      await geometryCache.setGeometries([
        mockGeometry1,
        mockGeometry2,
        mockGeometry3,
      ]);

      await geometryCache.deleteGeometries(["hash1", "hash3"]);

      const result = await geometryCache.getGeometries([
        "hash1",
        "hash2",
        "hash3",
      ]);
      expect(result).toHaveLength(1);
      expect(result).toEqual([mockGeometry2]);
    });

    it("handles deleting non-existent geometries", async () => {
      await geometryCache.setGeometries([mockGeometry1]);

      await geometryCache.deleteGeometries(["nonexistent", "hash2"]);

      const result = await geometryCache.getGeometries(["hash1"]);
      expect(result).toEqual([mockGeometry1]);
    });

    it("handles empty array input", async () => {
      await geometryCache.setGeometries([mockGeometry1, mockGeometry2]);

      await geometryCache.deleteGeometries([]);

      const result = await geometryCache.getGeometries(["hash1", "hash2"]);
      expect(result).toHaveLength(2);
    });
  });

  describe("cache persistence", () => {
    it("preserves data after multiple operations", async () => {
      await geometryCache.setGeometry(mockGeometry1);
      await geometryCache.setGeometry(mockGeometry2);

      const result1 = await geometryCache.getGeometry("hash1");
      expect(result1).toEqual(mockGeometry1);

      await geometryCache.setGeometry(mockGeometry3);

      const result2 = await geometryCache.getGeometries([
        "hash1",
        "hash2",
        "hash3",
      ]);
      expect(result2).toHaveLength(3);
    });
  });
});
