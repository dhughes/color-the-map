import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Track, TrackGeometry } from "../types/track";
import { getTracksInViewport, type ViewportBounds } from "../utils/viewport";
import { geometryCache, type CachedGeometry } from "../utils/geometryCache";
import { getTrackGeometries } from "../api/client";

const DEBOUNCE_MS = 300;

export interface UseViewportGeometriesResult {
  geometries: TrackGeometry[];
  isLoading: boolean;
  loadingCount: number;
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
  const [loadingCount, setLoadingCount] = useState(0);
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
        setLoadingCount(0);
        setError(null);
        return;
      }

      try {
        const trackIdToHash = new Map<number, string>();
        visibleTracks.forEach((track) => {
          trackIdToHash.set(track.id, track.hash);
        });

        const visibleHashes = Array.from(trackIdToHash.values());
        const cached = await geometryCache.getGeometries(visibleHashes);
        const cachedIds = new Set(cached.map((g) => g.track_id));
        const missingIds = visibleTrackIds.filter((id) => !cachedIds.has(id));

        if (cancelled) return;

        if (missingIds.length > 0) {
          setIsLoading(true);
          setLoadingCount(missingIds.length);
          setError(null);

          const fetched = await getTrackGeometries(
            missingIds,
            abortController.signal,
          );

          if (cancelled) return;

          const fetchedWithHash: CachedGeometry[] = fetched
            .map((geometry) => {
              const hash = trackIdToHash.get(geometry.track_id);
              if (!hash) {
                console.error(
                  `No hash found for track_id ${geometry.track_id}`,
                );
                return null;
              }
              return { ...geometry, hash };
            })
            .filter((g): g is CachedGeometry => g !== null);

          await geometryCache.setGeometries(fetchedWithHash);

          const combined = [...cached, ...fetchedWithHash];
          setGeometries(combined);

          setIsLoading(false);
          setLoadingCount(0);
        } else {
          setGeometries(cached);
        }
      } catch (err) {
        if (cancelled) return;

        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setError(err instanceof Error ? err.message : "Failed to load tracks");
        setIsLoading(false);
        setLoadingCount(0);
      }
    };

    loadGeometries();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [visibleTrackIdsKey, visibleTracks]);

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
    loadingCount,
    error,
    onViewportChange,
    retryFetch,
  };
}
