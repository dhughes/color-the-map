import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { config } from "../config";
import type { TrackGeometry } from "../types/track";

interface MapProps {
  geometries: TrackGeometry[];
}

export function Map({ geometries }: MapProps) {
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

  const updateTracks = (
    mapInstance: maplibregl.Map,
    geometries: TrackGeometry[],
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!mapInstance || !(mapInstance as any)._loaded) return;

    if (mapInstance.getLayer("track-lines")) {
      mapInstance.removeLayer("track-lines");
    }
    if (mapInstance.getSource("tracks")) {
      mapInstance.removeSource("tracks");
    }

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

    mapInstance.addSource("tracks", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features,
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
  };

  useEffect(() => {
    if (!map.current || !mapLoaded || geometries.length === 0) return;

    updateTracks(map.current, geometries);
  }, [geometries, mapLoaded]);

  return <div ref={mapContainer} className="map-container" />;
}
