/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  uploadTracks,
  uploadTracksWithProgress,
  listTracks,
  getTrackGeometries,
  updateTrack,
  deleteTracks,
} from "./client";

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

      expect(globalThis.fetch).toHaveBeenCalledWith("api/v1/tracks", {});
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

  describe("updateTrack", () => {
    it("updates track with PATCH request", async () => {
      const mockTrack = { id: 1, name: "Updated Track", visible: false };

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrack,
      });

      const result = await updateTrack(1, {
        visible: false,
        name: "Updated Track",
      });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "api/v1/tracks/1",
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visible: false, name: "Updated Track" }),
        }),
      );

      expect(result).toEqual(mockTrack);
    });

    it("throws error on failed update", async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
      });

      await expect(updateTrack(999, { visible: false })).rejects.toThrow(
        "Failed to update track",
      );
    });
  });

  describe("uploadTracksWithProgress", () => {
    it("uploads files sequentially and calls progress callback", async () => {
      const mockResults = [
        { uploaded: 1, failed: 0, track_ids: [1], errors: [] },
        { uploaded: 1, failed: 0, track_ids: [2], errors: [] },
        { uploaded: 1, failed: 0, track_ids: [3], errors: [] },
      ];

      (globalThis.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResults[0],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResults[1],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResults[2],
        });

      const file1 = new File(["content1"], "track1.gpx");
      const file2 = new File(["content2"], "track2.gpx");
      const file3 = new File(["content3"], "track3.gpx");

      const progressCallback = vi.fn();

      const result = await uploadTracksWithProgress(
        [file1, file2, file3],
        progressCallback,
      );

      expect(globalThis.fetch).toHaveBeenCalledTimes(3);
      expect(progressCallback).toHaveBeenCalledTimes(4);
      expect(progressCallback).toHaveBeenNthCalledWith(1, 1, 3);
      expect(progressCallback).toHaveBeenNthCalledWith(2, 2, 3);
      expect(progressCallback).toHaveBeenNthCalledWith(3, 3, 3);
      expect(progressCallback).toHaveBeenNthCalledWith(4, 3, 3);

      expect(result).toEqual({
        uploaded: 3,
        failed: 0,
        track_ids: [1, 2, 3],
        errors: [],
      });
    });

    it("continues uploading after failures", async () => {
      (globalThis.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            uploaded: 1,
            failed: 0,
            track_ids: [1],
            errors: [],
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          statusText: "Bad Request",
          json: async () => ({ detail: "Invalid GPX" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            uploaded: 1,
            failed: 0,
            track_ids: [3],
            errors: [],
          }),
        });

      const file1 = new File(["content1"], "track1.gpx");
      const file2 = new File(["content2"], "bad.gpx");
      const file3 = new File(["content3"], "track3.gpx");

      const progressCallback = vi.fn();

      const result = await uploadTracksWithProgress(
        [file1, file2, file3],
        progressCallback,
      );

      expect(result.uploaded).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.track_ids).toEqual([1, 3]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("bad.gpx");
    });
  });

  describe("deleteTracks", () => {
    it("deletes tracks with DELETE request", async () => {
      const mockResult = {
        deleted: 2,
        failed: 0,
        errors: [],
      };

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await deleteTracks([1, 2]);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "api/v1/tracks",
        expect.objectContaining({
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ track_ids: [1, 2] }),
        }),
      );

      expect(result).toEqual(mockResult);
    });

    it("throws error on failed delete", async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
        json: async () => ({ detail: "Delete failed" }),
      });

      await expect(deleteTracks([1])).rejects.toThrow("Delete failed");
    });
  });
});
