import { useState, useEffect, useCallback, useRef } from "react";
import { mapViewStorage, type MapViewState } from "../utils/mapViewStorage";
import { getUserLocation } from "../utils/geolocation";
import { config } from "../config";

const DEBOUNCE_MS = 150;

export function useMapView() {
  const [initialView, setInitialView] = useState<MapViewState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    const loadInitialView = async () => {
      const savedView = mapViewStorage.getMapView();

      if (savedView) {
        setInitialView(savedView);
        setIsLoading(false);
        return;
      }

      const location = await getUserLocation();

      if (location) {
        setInitialView({
          center: [location.longitude, location.latitude],
          zoom: config.mapZoom,
        });
      } else {
        setInitialView({
          center: config.mapCenter,
          zoom: config.mapZoom,
        });
      }

      setIsLoading(false);
    };

    loadInitialView();

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const saveMapView = useCallback((center: [number, number], zoom: number) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      mapViewStorage.setMapView({ center, zoom });
    }, DEBOUNCE_MS);
  }, []);

  return {
    initialView,
    isLoading,
    saveMapView,
  };
}
