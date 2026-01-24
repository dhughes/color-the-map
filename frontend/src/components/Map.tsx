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
import { getUserLocation, type GeolocationResult } from "../utils/geolocation";
import type { ViewportBounds } from "../utils/viewport";

interface MapProps {
  geometries: TrackGeometry[];
  selectedTrackIds: Set<number>;
  onSelect: (trackId: number, isMultiSelect: boolean) => void;
  onClearSelection: () => void;
  onViewportChange?: (bounds: ViewportBounds) => void;
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
  },
  ref,
) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<GeolocationResult | null>(
    null,
  );
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  useEffect(() => {
    getUserLocation()
      .then((location) => {
        setUserLocation(location);
        if (location) {
          console.log(
            `[Map] Using ${location.source} location: [${location.longitude.toFixed(4)}, ${location.latitude.toFixed(4)}]`,
          );
        } else {
          console.log(
            `[Map] All location methods failed, using config default: [${config.mapCenter[0]}, ${config.mapCenter[1]}]`,
          );
        }
      })
      .finally(() => setIsLoadingLocation(false));
  }, []);

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
    if (!mapContainer.current || map.current || isLoadingLocation) return;

    const center = userLocation
      ? ([userLocation.longitude, userLocation.latitude] as [number, number])
      : config.mapCenter;

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
      center,
      zoom: config.mapZoom,
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
  }, [isLoadingLocation, userLocation]);

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
          id: "track-outlines",
          type: "line",
          source: "tracks",
          paint: {
            "line-color": "#444",
            "line-width": 10,
            "line-opacity": 0,
          },
        });

        mapInstance.addLayer({
          id: "track-lines",
          type: "line",
          source: "tracks",
          paint: {
            "line-color": config.trackColor,
            "line-width": 3,
            "line-opacity": 0.85,
          },
        });

        mapInstance.on("click", "track-lines", (e) => {
          if (e.features && e.features.length > 0) {
            const trackId = e.features[0].properties?.id;
            if (trackId) {
              const isMultiSelect =
                e.originalEvent.metaKey || e.originalEvent.ctrlKey;
              onSelect(trackId, isMultiSelect);
            }
          }
        });

        mapInstance.on("click", (e) => {
          const features = mapInstance.queryRenderedFeatures(e.point, {
            layers: ["track-lines"],
          });
          if (features.length === 0) {
            onClearSelection();
          }
        });

        mapInstance.on("mouseenter", "track-lines", () => {
          mapInstance.getCanvas().style.cursor = "pointer";
        });

        mapInstance.on("mouseleave", "track-lines", () => {
          mapInstance.getCanvas().style.cursor = "";
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
    if (!map.current || !mapLoaded || !onViewportChange) return;

    const handleMoveEnd = () => {
      if (!map.current) return;
      const bounds = map.current.getBounds();
      onViewportChange({
        minLat: bounds.getSouth(),
        maxLat: bounds.getNorth(),
        minLon: bounds.getWest(),
        maxLon: bounds.getEast(),
      });
    };

    map.current.on("moveend", handleMoveEnd);
    handleMoveEnd();

    return () => {
      map.current?.off("moveend", handleMoveEnd);
    };
  }, [mapLoaded, onViewportChange]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const mapInstance = map.current;
    const selectedIds = Array.from(selectedTrackIds);

    if (mapInstance.getLayer("track-outlines")) {
      mapInstance.setPaintProperty("track-outlines", "line-opacity", [
        "case",
        ["in", ["get", "id"], ["literal", selectedIds]],
        1,
        0,
      ]);
    }

    if (mapInstance.getLayer("track-lines")) {
      mapInstance.setPaintProperty("track-lines", "line-color", [
        "case",
        ["in", ["get", "id"], ["literal", selectedIds]],
        "#FF66FF",
        config.trackColor,
      ]);

      mapInstance.setPaintProperty("track-lines", "line-width", [
        "case",
        ["in", ["get", "id"], ["literal", selectedIds]],
        6,
        3,
      ]);
    }
  }, [selectedTrackIds, mapLoaded]);

  if (isLoadingLocation) {
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
