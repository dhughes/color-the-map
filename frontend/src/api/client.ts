import type { Track, TrackGeometry, UploadResult } from "../types/track";

const API_BASE = "";

export async function uploadTracks(files: File[]): Promise<UploadResult> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await fetch(`${API_BASE}api/v1/tracks`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || "Upload failed");
  }

  return response.json();
}

export async function uploadTracksWithProgress(
  files: File[],
  onProgress: (current: number, total: number) => void,
): Promise<UploadResult> {
  const total = files.length;
  let uploaded = 0;
  let failed = 0;
  const trackIds: number[] = [];
  const errors: string[] = [];

  for (let i = 0; i < files.length; i++) {
    onProgress(i + 1, total);

    try {
      const formData = new FormData();
      formData.append("files", files[i]);

      const response = await fetch(`${API_BASE}api/v1/tracks`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ detail: response.statusText }));
        failed++;
        errors.push(`${files[i].name}: ${error.detail || "Upload failed"}`);
      } else {
        const result: UploadResult = await response.json();
        uploaded += result.uploaded;
        trackIds.push(...result.track_ids);
      }
    } catch (error) {
      failed++;
      errors.push(
        `${files[i].name}: ${error instanceof Error ? error.message : "Upload failed"}`,
      );
    }
  }

  onProgress(total, total);

  return {
    uploaded,
    failed,
    track_ids: trackIds,
    errors,
  };
}

export async function listTracks(): Promise<Track[]> {
  const response = await fetch(`${API_BASE}api/v1/tracks`);

  if (!response.ok) {
    throw new Error("Failed to load tracks");
  }

  return response.json();
}

export async function getTrackGeometries(
  trackIds: number[],
): Promise<TrackGeometry[]> {
  const response = await fetch(`${API_BASE}api/v1/tracks/geometry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ track_ids: trackIds }),
  });

  if (!response.ok) {
    throw new Error("Failed to load track geometries");
  }

  return response.json();
}

export async function updateTrack(
  trackId: number,
  updates: {
    visible?: boolean;
    name?: string;
    activity_type?: string;
    description?: string;
  },
): Promise<Track> {
  const response = await fetch(`${API_BASE}api/v1/tracks/${trackId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error("Failed to update track");
  }

  return response.json();
}
