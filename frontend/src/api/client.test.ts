/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadTracks, listTracks, getTrackGeometries } from "./client";

globalThis.fetch = vi.fn() as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("API Client", () => {
  describe("uploadTracks", () => {
    it("uploads files via FormData", async () => {
      const mockResult = {
        uploaded: 2,
        failed: 0,
        track_ids: [1, 2],
        errors: [],
      };

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const file1 = new File(["content1"], "track1.gpx");
      const file2 = new File(["content2"], "track2.gpx");

      const result = await uploadTracks([file1, file2]);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "api/v1/tracks",
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData),
        }),
      );

      expect(result).toEqual(mockResult);
    });

    it("throws error on failed upload", async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: "Bad Request",
        json: async () => ({ detail: "Invalid file" }),
      });

      const file = new File(["content"], "track.gpx");

      await expect(uploadTracks([file])).rejects.toThrow("Invalid file");
    });
  });

  describe("listTracks", () => {
    it("fetches track list", async () => {
      const mockTracks = [
        { id: 1, name: "Track 1", distance_meters: 1000 },
        { id: 2, name: "Track 2", distance_meters: 2000 },
      ];

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTracks,
      });

      const result = await listTracks();

      expect(globalThis.fetch).toHaveBeenCalledWith("api/v1/tracks");
      expect(result).toEqual(mockTracks);
    });

    it("throws error on failed fetch", async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
      });

      await expect(listTracks()).rejects.toThrow("Failed to load tracks");
    });
  });

  describe("getTrackGeometries", () => {
    it("posts track IDs and receives geometries", async () => {
      const mockGeometries = [
        {
          track_id: 1,
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        {
          track_id: 2,
          coordinates: [
            [2, 2],
            [3, 3],
          ],
        },
      ];

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGeometries,
      });

      const result = await getTrackGeometries([1, 2]);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "api/v1/tracks/geometry",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ track_ids: [1, 2] }),
        }),
      );

      expect(result).toEqual(mockGeometries);
    });
  });
});
