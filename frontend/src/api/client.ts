import type {
  Track,
  TrackGeometry,
  UploadResult,
  DeleteResult,
  BulkUpdateResult,
} from "../types/track";
import type { MapData } from "../types/map";

const API_BASE = "";

let currentAccessToken: string | null = null;

export function setAccessToken(token: string | null) {
  currentAccessToken = token;
}

async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  if (currentAccessToken) {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${currentAccessToken}`,
    };
  }

  return fetch(url, options);
}

export async function listMaps(): Promise<MapData[]> {
  const response = await fetchWithAuth(`${API_BASE}api/v1/maps`);

  if (!response.ok) {
    throw new Error("Failed to load maps");
  }

  return response.json();
}

export async function createMap(name: string): Promise<MapData> {
  const response = await fetchWithAuth(`${API_BASE}api/v1/maps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || "Failed to create map");
  }

  return response.json();
}

export async function updateMap(
  mapId: number,
  updates: { name?: string },
): Promise<MapData> {
  const response = await fetchWithAuth(`${API_BASE}api/v1/maps/${mapId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error("Failed to update map");
  }

  return response.json();
}

export async function deleteMap(mapId: number): Promise<{ deleted: boolean }> {
  const response = await fetchWithAuth(`${API_BASE}api/v1/maps/${mapId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || "Failed to delete map");
  }

  return response.json();
}

export async function uploadTracks(
  mapId: number,
  files: File[],
): Promise<UploadResult> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await fetchWithAuth(
    `${API_BASE}api/v1/maps/${mapId}/tracks`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || "Upload failed");
  }

  return response.json();
}

export async function uploadTracksWithProgress(
  mapId: number,
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

      const response = await fetchWithAuth(
        `${API_BASE}api/v1/maps/${mapId}/tracks`,
        {
          method: "POST",
          body: formData,
        },
      );

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

export async function listTracks(mapId: number): Promise<Track[]> {
  const response = await fetchWithAuth(
    `${API_BASE}api/v1/maps/${mapId}/tracks`,
  );

  if (!response.ok) {
    throw new Error("Failed to load tracks");
  }

  return response.json();
}

export async function getTrackGeometries(
  mapId: number,
  trackIds: number[],
  signal?: AbortSignal,
): Promise<TrackGeometry[]> {
  const response = await fetchWithAuth(
    `${API_BASE}api/v1/maps/${mapId}/tracks/geometry`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ track_ids: trackIds }),
      signal,
    },
  );

  if (!response.ok) {
    throw new Error("Failed to load track geometries");
  }

  return response.json();
}

export async function updateTrack(
  mapId: number,
  trackId: number,
  updates: {
    visible?: boolean;
    name?: string;
    activity_type?: string;
  },
): Promise<Track> {
  const response = await fetchWithAuth(
    `${API_BASE}api/v1/maps/${mapId}/tracks/${trackId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to update track");
  }

  return response.json();
}

export async function deleteTracks(
  mapId: number,
  trackIds: number[],
): Promise<DeleteResult> {
  const response = await fetchWithAuth(
    `${API_BASE}api/v1/maps/${mapId}/tracks`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ track_ids: trackIds }),
    },
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || "Failed to delete tracks");
  }

  return response.json();
}

export async function bulkUpdateTracks(
  mapId: number,
  trackIds: number[],
  updates: {
    visible?: boolean;
    name?: string;
    activity_type?: string;
  },
): Promise<BulkUpdateResult> {
  const response = await fetchWithAuth(
    `${API_BASE}api/v1/maps/${mapId}/tracks/bulk`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ track_ids: trackIds, updates }),
    },
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || "Failed to update tracks");
  }

  return response.json();
}
