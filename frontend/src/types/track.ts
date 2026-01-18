export interface Track {
  id: number;
  hash: string;
  name: string;
  filename: string;
  activity_type: string | null;
  activity_type_inferred: string | null;
  activity_date: string;
  uploaded_at: string;

  distance_meters: number | null;
  duration_seconds: number | null;
  avg_speed_ms: number | null;
  max_speed_ms: number | null;
  min_speed_ms: number | null;
  elevation_gain_meters: number | null;
  elevation_loss_meters: number | null;

  bounds_min_lat: number | null;
  bounds_max_lat: number | null;
  bounds_min_lon: number | null;
  bounds_max_lon: number | null;

  visible: boolean;
  description: string | null;

  created_at: string;
  updated_at: string;
}

export interface TrackGeometry {
  track_id: number;
  coordinates: [number, number][];
}

export interface UploadResult {
  uploaded: number;
  failed: number;
  track_ids: number[];
  errors: string[];
}

export interface DeleteResult {
  deleted: number;
  failed: number;
  errors: string[];
}
