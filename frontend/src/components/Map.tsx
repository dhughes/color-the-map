import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import maplibregl from "maplibre-gl";
import { config } from "../config";
import type { TrackGeometry } from "../types/track";
import type { ViewportBounds } from "../utils/viewport";
import { useMapView } from "../hooks/useMapView";

interface MapProps {
  geometries: TrackGeometry[];
  selectedTrackIds: Set<number>;
  speedColorMode: boolean;
  speedColorTrackIds: Set<number> | null;
  maxSpeedMs: number | null;
  onSelect: (trackId: number, isMultiSelect: boolean) => void;
  onClearSelection: () => void;
  onViewportChange?: (bounds: ViewportBounds) => void;
}

function speedToColor(speed: number, maxSpeed: number): string {
  if (maxSpeed <= 0) return config.trackColor;
  const linearRatio = Math.min(speed / maxSpeed, 1);

  const ratio =
    linearRatio < 0.5
      ? 0.5 * Math.pow(2 * linearRatio, 2.5)
      : 1 - 0.5 * Math.pow(2 * (1 - linearRatio), 2.5);

  const slowColor = { r: 200, g: 50, b: 70 };
  const fastColor = { r: 66, g: 255, b: 140 };

  const r = Math.round(slowColor.r + (fastColor.r - slowColor.r) * ratio);
  const g = Math.round(slowColor.g + (fastColor.g - slowColor.g) * ratio);
  const b = Math.round(slowColor.b + (fastColor.b - slowColor.b) * ratio);

  return `rgb(${r}, ${g}, ${b})`;
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
    speedColorMode,
    speedColorTrackIds,
    maxSpeedMs,
    onSelect,
    onClearSelection,
    onViewportChange,
  },
  ref,
) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
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
      }
    };
  }, [isLoadingMapView, initialView]);

  const updateTracks = useCallback(
    (mapInstance: maplibregl.Map, geometries: TrackGeometry[]) => {
      if (!mapInstance) return;

      const features = geometries.map((geometry) => ({
        type: "Feature" as const,
        id: geometry.track_id,
        properties: {
          id: geometry.track_id,
        },
        geometry: {
          type: "LineString" as const,
          coordinates: geometry.coordinates,
        },
      }));

      const source = mapInstance.getSource(
        "tracks",
      ) as maplibregl.GeoJSONSource;

      if (source) {
        source.setData({
          type: "FeatureCollection",
          features,
        });
      } else {
        mapInstance.addSource("tracks", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features,
          },
        });

        mapInstance.addLayer({
          id: "deselected-tracks",
          type: "line",
          source: "tracks",
          paint: {
            "line-color": config.trackColor,
            "line-width": 3,
            "line-opacity": 0.85,
          },
        });

        mapInstance.addLayer({
          id: "selected-track-outlines",
          type: "line",
          source: "tracks",
          paint: {
            "line-color": "#444",
            "line-width": 10,
            "line-opacity": 1,
          },
          filter: ["==", ["get", "id"], -1],
        });

        mapInstance.addLayer({
          id: "selected-tracks",
          type: "line",
          source: "tracks",
          paint: {
            "line-color": "#FF66FF",
            "line-width": 6,
            "line-opacity": 0.85,
          },
          filter: ["==", ["get", "id"], -1],
        });

        const clickableLayers = [
          "deselected-tracks",
          "selected-tracks",
          "selected-track-outlines",
        ];

        for (const layerId of clickableLayers) {
          mapInstance.on("click", layerId, (e) => {
            if (e.features && e.features.length > 0) {
              const trackId = e.features[0].properties?.id;
              if (trackId) {
                const isMultiSelect =
                  e.originalEvent.metaKey || e.originalEvent.ctrlKey;
                onSelect(trackId, isMultiSelect);
              }
            }
          });

          mapInstance.on("mouseenter", layerId, () => {
            mapInstance.getCanvas().style.cursor = "pointer";
          });

          mapInstance.on("mouseleave", layerId, () => {
            mapInstance.getCanvas().style.cursor = "";
          });
        }

        mapInstance.on("click", (e) => {
          const features = mapInstance.queryRenderedFeatures(e.point, {
            layers: clickableLayers,
          });
          if (features.length === 0) {
            onClearSelection();
          }
        });
      }
    },
    [onSelect, onClearSelection],
  );

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    updateTracks(map.current, geometries);
  }, [geometries, mapLoaded, updateTracks]);

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

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const mapInstance = map.current;
    const selectedIds = Array.from(selectedTrackIds);
    const speedColorIds = speedColorTrackIds
      ? Array.from(speedColorTrackIds)
      : [];

    const selectedIdsWithSpeedColor = selectedIds.filter((id) =>
      speedColorIds.includes(id),
    );
    const selectedIdsWithoutSpeedColor = selectedIds.filter(
      (id) => !speedColorIds.includes(id),
    );

    if (mapInstance.getLayer("deselected-tracks")) {
      mapInstance.setFilter("deselected-tracks", [
        "!",
        ["in", ["get", "id"], ["literal", selectedIds]],
      ]);
    }

    if (mapInstance.getLayer("selected-track-outlines")) {
      mapInstance.setFilter(
        "selected-track-outlines",
        selectedIds.length > 0
          ? ["in", ["get", "id"], ["literal", selectedIds]]
          : ["==", ["get", "id"], -1],
      );
    }

    if (mapInstance.getLayer("selected-tracks")) {
      mapInstance.setFilter(
        "selected-tracks",
        selectedIdsWithoutSpeedColor.length > 0
          ? ["in", ["get", "id"], ["literal", selectedIdsWithoutSpeedColor]]
          : ["==", ["get", "id"], -1],
      );
    }

    for (const trackId of selectedIdsWithSpeedColor) {
      const layerId = `speed-track-${trackId}`;
      if (mapInstance.getLayer(layerId)) {
        mapInstance.moveLayer(layerId);
      }
    }
  }, [selectedTrackIds, speedColorTrackIds, mapLoaded]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const mapInstance = map.current;

    const existingLayers = geometries
      .map((g) => `speed-track-${g.track_id}`)
      .filter((id) => mapInstance.getLayer(id));

    for (const layerId of existingLayers) {
      mapInstance.removeLayer(layerId);
    }

    const existingSources = geometries
      .map((g) => `speed-track-${g.track_id}`)
      .filter((id) => mapInstance.getSource(id));

    for (const sourceId of existingSources) {
      mapInstance.removeSource(sourceId);
    }

    if (
      !speedColorMode ||
      !speedColorTrackIds ||
      !maxSpeedMs ||
      maxSpeedMs <= 0
    ) {
      return;
    }

    for (const geometry of geometries) {
      if (!speedColorTrackIds.has(geometry.track_id)) continue;
      if (!geometry.segment_speeds || geometry.segment_speeds.length === 0)
        continue;

      const sourceId = `speed-track-${geometry.track_id}`;
      const layerId = `speed-track-${geometry.track_id}`;

      const gradientStops: (number | string)[] = [];
      const numCoords = geometry.coordinates.length;

      for (let i = 0; i < numCoords; i++) {
        const progress = i / (numCoords - 1);
        const speed =
          i < geometry.segment_speeds.length
            ? geometry.segment_speeds[i]
            : (geometry.segment_speeds[geometry.segment_speeds.length - 1] ??
              0);
        const color = speedToColor(speed, maxSpeedMs);
        gradientStops.push(progress, color);
      }

      mapInstance.addSource(sourceId, {
        type: "geojson",
        lineMetrics: true,
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: geometry.coordinates,
          },
        },
      });

      mapInstance.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "red",
          "line-width": 4,
          "line-opacity": 0.9,
          "line-gradient": [
            "interpolate",
            ["linear"],
            ["line-progress"],
            ...gradientStops,
          ],
        },
      });
    }
  }, [speedColorMode, speedColorTrackIds, maxSpeedMs, geometries, mapLoaded]);

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
