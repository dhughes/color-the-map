import type { Track } from "../types/track";

export interface ViewportBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export function expandBounds(
  bounds: ViewportBounds,
  bufferFactor: number,
): ViewportBounds {
  const latRange = Math.max(bounds.maxLat - bounds.minLat, 0.001);
  const lonRange = Math.max(bounds.maxLon - bounds.minLon, 0.001);

  return {
    minLat: bounds.minLat - latRange * bufferFactor,
    maxLat: bounds.maxLat + latRange * bufferFactor,
    minLon: bounds.minLon - lonRange * bufferFactor,
    maxLon: bounds.maxLon + lonRange * bufferFactor,
  };
}

export function trackIntersectsViewport(
  track: Track,
  viewportBounds: ViewportBounds,
): boolean {
  if (
    track.bounds_min_lat === null ||
    track.bounds_max_lat === null ||
    track.bounds_min_lon === null ||
    track.bounds_max_lon === null
  ) {
    return false;
  }

  return (
    track.bounds_max_lat >= viewportBounds.minLat &&
    track.bounds_min_lat <= viewportBounds.maxLat &&
    track.bounds_max_lon >= viewportBounds.minLon &&
    track.bounds_min_lon <= viewportBounds.maxLon
  );
}

export function getTracksInViewport(
  tracks: Track[],
  viewportBounds: ViewportBounds,
  bufferFactor: number = 0.5,
): Track[] {
  const expandedBounds = expandBounds(viewportBounds, bufferFactor);
  return tracks.filter((track) =>
    trackIntersectsViewport(track, expandedBounds),
  );
}
