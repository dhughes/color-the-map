import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { config } from "../config";
import type { TrackGeometry } from "../types/track";

interface MapProps {
  geometries: TrackGeometry[];
  selectedTrackIds: Set<number>;
  onSelect: (trackId: number, isMultiSelect: boolean) => void;
  onClearSelection: () => void;
}

export function Map({
  geometries,
  selectedTrackIds,
  onSelect,
  onClearSelection,
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

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

  const updateTracks = useCallback(
    (mapInstance: maplibregl.Map, geometries: TrackGeometry[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!mapInstance || !(mapInstance as any)._loaded) return;

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
            "line-width": 1,
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
        1,
      ]);
    }
  }, [selectedTrackIds, mapLoaded]);

  return <div ref={mapContainer} className="map-container" />;
}
