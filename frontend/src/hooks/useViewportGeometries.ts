import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Track, TrackGeometry } from "../types/track";
import { getTracksInViewport, type ViewportBounds } from "../utils/viewport";
import { geometryCache } from "../utils/geometryCache";
import { getTrackGeometries } from "../api/client";

const DEBOUNCE_MS = 300;

export interface UseViewportGeometriesResult {
  geometries: TrackGeometry[];
  isLoading: boolean;
  error: string | null;
  onViewportChange: (bounds: ViewportBounds) => void;
  retryFetch: () => void;
}

export function useViewportGeometries(
  tracks: Track[],
): UseViewportGeometriesResult {
  const [viewport, setViewport] = useState<ViewportBounds | null>(null);
  const [geometries, setGeometries] = useState<TrackGeometry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimeoutRef = useRef<number | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);

  const onViewportChange = useCallback((bounds: ViewportBounds) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      debounceTimeoutRef.current = undefined;
      setViewport(bounds);
    }, DEBOUNCE_MS);
  }, []);

  const visibleTracks = useMemo(() => {
    if (!viewport) return [];
    return getTracksInViewport(tracks, viewport);
  }, [tracks, viewport]);

  const visibleTrackIdsKey = useMemo(() => {
    return JSON.stringify(visibleTracks.map((t) => t.id));
  }, [visibleTracks]);

  useEffect(() => {
    const visibleTrackIds = JSON.parse(visibleTrackIdsKey) as number[];

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let cancelled = false;

    const loadGeometries = async () => {
      if (visibleTrackIds.length === 0) {
        setGeometries([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const cached = await geometryCache.getGeometries(visibleTrackIds);
        const cachedIds = new Set(cached.map((g) => g.track_id));
        const missingIds = visibleTrackIds.filter((id) => !cachedIds.has(id));

        if (cancelled) return;

        if (missingIds.length > 0) {
          const fetched = await getTrackGeometries(
            missingIds,
            abortController.signal,
          );

          if (cancelled) return;

          await geometryCache.setGeometries(fetched);

          const combined = [...cached, ...fetched];
          setGeometries(combined);
        } else {
          setGeometries(cached);
        }

        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;

        setError(err instanceof Error ? err.message : "Failed to load tracks");
        setIsLoading(false);
      }
    };

    loadGeometries();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [visibleTrackIdsKey]);

  const retryFetch = useCallback(() => {
    if (!viewport) return;
    setViewport({ ...viewport });
  }, [viewport]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    geometries,
    isLoading,
    error,
    onViewportChange,
    retryFetch,
  };
}
