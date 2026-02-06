import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import maplibregl from "maplibre-gl";
import type { TrackGeometry } from "../types/track";
import type { ViewportBounds } from "../utils/viewport";
import { useMapView } from "../hooks/useMapView";
import {
  syncTrackSources,
  syncSelection,
  syncSpeedColoring,
  parseTrackIdFromLayerId,
  type TrackSpeedData,
} from "../utils/trackLayerManager";
import type { SpeedColorRelative } from "./TrackList/SelectionPanel";

interface MapProps {
  geometries: TrackGeometry[];
  selectedTrackIds: Set<number>;
  onSelect: (trackId: number, isMultiSelect: boolean) => void;
  onClearSelection: () => void;
  onViewportChange?: (bounds: ViewportBounds) => void;
  speedColorEnabled?: boolean;
  speedColorRelative?: SpeedColorRelative;
}

export interface MapRef {
  zoomToBounds: (bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  }) => void;
}

export const Map = forwardRef<MapRef, MapProps>(function Map(
  {
    geometries,
    selectedTrackIds,
    onSelect,
    onClearSelection,
    onViewportChange,
    speedColorEnabled = false,
    speedColorRelative = "each",
  },
  ref,
) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const currentTrackIds = useRef<Set<number>>(new Set());
  const previousSelectedIds = useRef<Set<number>>(new Set());
  const {
    initialView,
    isLoading: isLoadingMapView,
    saveMapView,
  } = useMapView();

  useImperativeHandle(ref, () => ({
    zoomToBounds: (bounds) => {
      if (!map.current) return;

      map.current.fitBounds(
        [
          [bounds.minLon, bounds.minLat],
          [bounds.maxLon, bounds.maxLat],
        ],
        {
          padding: 75,
          maxZoom: 16,
          duration: 800,
        },
      );
    },
  }));

  useEffect(() => {
    if (
      !mapContainer.current ||
      map.current ||
      isLoadingMapView ||
      !initialView
    )
      return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      },
      center: initialView.center,
      zoom: initialView.zoom,
    });

    const geolocateControl = new maplibregl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: false,
      },
      trackUserLocation: false,
      showUserLocation: false,
    });

    map.current.addControl(geolocateControl, "top-right");

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        setMapLoaded(false);
        currentTrackIds.current = new Set();
        previousSelectedIds.current = new Set();
      }
    };
  }, [isLoadingMapView, initialView]);

  const handleClick = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      const mapInstance = map.current;
      if (!mapInstance) return;

      const features = mapInstance.queryRenderedFeatures(e.point);
      for (const feature of features) {
        const trackId = parseTrackIdFromLayerId(feature.layer.id);
        if (trackId !== null) {
          const isMultiSelect =
            e.originalEvent.metaKey || e.originalEvent.ctrlKey;
          onSelect(trackId, isMultiSelect);
          return;
        }
      }

      onClearSelection();
    },
    [onSelect, onClearSelection],
  );

  const handleMouseMove = useCallback((e: maplibregl.MapMouseEvent) => {
    const mapInstance = map.current;
    if (!mapInstance) return;

    const features = mapInstance.queryRenderedFeatures(e.point);
    const isOverTrack = features.some(
      (f) => parseTrackIdFromLayerId(f.layer.id) !== null,
    );
    mapInstance.getCanvas().style.cursor = isOverTrack ? "pointer" : "";
  }, []);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const mapInstance = map.current;
    mapInstance.on("click", handleClick);
    mapInstance.on("mousemove", handleMouseMove);

    return () => {
      mapInstance.off("click", handleClick);
      mapInstance.off("mousemove", handleMouseMove);
    };
  }, [mapLoaded, handleClick, handleMouseMove]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    currentTrackIds.current = syncTrackSources(
      map.current,
      geometries,
      currentTrackIds.current,
      selectedTrackIds,
    );

    syncSelection(
      map.current,
      selectedTrackIds,
      previousSelectedIds.current,
      currentTrackIds.current,
    );
    previousSelectedIds.current = new Set(selectedTrackIds);
  }, [geometries, selectedTrackIds, mapLoaded]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const speedDataMap = new globalThis.Map<number, TrackSpeedData>();

    if (speedColorEnabled) {
      let globalMax = 0;
      const trackMaxSpeeds = new globalThis.Map<number, number>();

      for (const geom of geometries) {
        if (!geom.segment_speeds || geom.segment_speeds.length === 0) continue;
        const trackMax = Math.max(...geom.segment_speeds);
        trackMaxSpeeds.set(geom.track_id, trackMax);
        if (trackMax > globalMax) globalMax = trackMax;
      }

      for (const geom of geometries) {
        if (!geom.segment_speeds || geom.segment_speeds.length === 0) continue;
        const maxSpeed =
          speedColorRelative === "all"
            ? globalMax
            : (trackMaxSpeeds.get(geom.track_id) ?? 0);
        speedDataMap.set(geom.track_id, {
          speeds: geom.segment_speeds,
          maxSpeed,
          minSpeed: 0,
        });
      }
    }

    syncSpeedColoring(
      map.current,
      speedColorEnabled,
      speedDataMap,
      currentTrackIds.current,
      selectedTrackIds,
    );
  }, [
    geometries,
    selectedTrackIds,
    mapLoaded,
    speedColorEnabled,
    speedColorRelative,
  ]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const handleMoveEnd = () => {
      if (!map.current) return;

      const center = map.current.getCenter();
      const zoom = map.current.getZoom();
      saveMapView([center.lng, center.lat], zoom);

      if (onViewportChange) {
        const bounds = map.current.getBounds();
        onViewportChange({
          minLat: bounds.getSouth(),
          maxLat: bounds.getNorth(),
          minLon: bounds.getWest(),
          maxLon: bounds.getEast(),
        });
      }
    };

    map.current.on("moveend", handleMoveEnd);
    handleMoveEnd();

    return () => {
      map.current?.off("moveend", handleMoveEnd);
    };
  }, [mapLoaded, onViewportChange, saveMapView]);

  if (isLoadingMapView) {
    return (
      <div className="map-location-loader">
        <div className="map-location-loader-content">
          <div className="location-pulse">
            <div className="pulse-ring pulse-ring-1"></div>
            <div className="pulse-ring pulse-ring-2"></div>
            <div className="pulse-ring pulse-ring-3"></div>
            <div className="pulse-center"></div>
          </div>
          <p className="location-text">Finding your location...</p>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className="map-container" />;
});
