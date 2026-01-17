import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useQuery } from "@tanstack/react-query";
import maplibregl from "maplibre-gl";
import { config } from "../config";
import type { TrackGeometry } from "../types/track";

interface MapProps {
  geometries: TrackGeometry[];
  selectedTrackIds: Set<number>;
  onSelect: (trackId: number, isMultiSelect: boolean) => void;
  onClearSelection: () => void;
}

export interface MapRef {
  zoomToBounds: (bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  }) => void;
}

interface LocationResponse {
  latitude: number;
  longitude: number;
}

export const Map = forwardRef<MapRef, MapProps>(function Map(
  { geometries, selectedTrackIds, onSelect, onClearSelection },
  ref,
) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const { data: userLocation, isLoading } = useQuery<LocationResponse>({
    queryKey: ["userLocation"],
    queryFn: async () => {
      const response = await fetch("api/v1/location");
      if (!response.ok) {
        throw new Error("Location lookup failed");
      }
      return response.json();
    },
    retry: false,
    staleTime: Infinity,
  });

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
    if (!mapContainer.current || map.current) return;

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
      center: config.mapCenter,
      zoom: config.mapZoom,
    });

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
  }, []);

  useEffect(() => {
    if (!map.current || !userLocation || !mapLoaded) return;

    map.current.flyTo({
      center: [userLocation.longitude, userLocation.latitude],
      zoom: config.mapZoom,
      duration: 1000,
    });
  }, [userLocation, mapLoaded]);

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

  return (
    <>
      <div ref={mapContainer} className="map-container" />
      {isLoading && (
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
      )}
    </>
  );
});
