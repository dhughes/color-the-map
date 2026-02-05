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
        console.log(
          `[MapView] Using saved view: [${savedView.center[0].toFixed(4)}, ${savedView.center[1].toFixed(4)}] zoom ${savedView.zoom}`,
        );
        setInitialView(savedView);
        setIsLoading(false);
        return;
      }

      const location = await getUserLocation();

      if (location) {
        const view: MapViewState = {
          center: [location.longitude, location.latitude],
          zoom: config.mapZoom,
        };
        console.log(
          `[MapView] Using ${location.source} location: [${view.center[0].toFixed(4)}, ${view.center[1].toFixed(4)}] zoom ${view.zoom}`,
        );
        setInitialView(view);
      } else {
        const view: MapViewState = {
          center: config.mapCenter,
          zoom: config.mapZoom,
        };
        console.log(
          `[MapView] Using config default: [${view.center[0].toFixed(4)}, ${view.center[1].toFixed(4)}] zoom ${view.zoom}`,
        );
        setInitialView(view);
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
