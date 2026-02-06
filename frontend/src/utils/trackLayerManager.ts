import type maplibregl from "maplibre-gl";
import { config } from "../config";

const SOURCE_PREFIX = "track-";
const DESELECTED_PREFIX = "deselected-";
const SELECTED_BG_PREFIX = "selected-bg-";
const SELECTED_FG_PREFIX = "selected-fg-";

const DESELECTED_PAINT = {
  "line-color": config.trackColor,
  "line-width": 3,
  "line-opacity": 0.85,
};

const SELECTED_BG_PAINT = {
  "line-color": "#444",
  "line-width": 10,
  "line-opacity": 1,
};

const SELECTED_FG_PAINT = {
  "line-color": "#FF66FF",
  "line-width": 6,
  "line-opacity": 0.85,
};

export function sourceId(trackId: number): string {
  return `${SOURCE_PREFIX}${trackId}`;
}

export function deselectedLayerId(trackId: number): string {
  return `${DESELECTED_PREFIX}${trackId}`;
}

export function selectedBgLayerId(trackId: number): string {
  return `${SELECTED_BG_PREFIX}${trackId}`;
}

export function selectedFgLayerId(trackId: number): string {
  return `${SELECTED_FG_PREFIX}${trackId}`;
}

export function parseTrackIdFromLayerId(layerId: string): number | null {
  for (const prefix of [
    DESELECTED_PREFIX,
    SELECTED_BG_PREFIX,
    SELECTED_FG_PREFIX,
  ]) {
    if (layerId.startsWith(prefix)) {
      const id = Number(layerId.slice(prefix.length));
      return Number.isNaN(id) ? null : id;
    }
  }
  return null;
}

export function isTrackLayer(layerId: string): boolean {
  return (
    layerId.startsWith(DESELECTED_PREFIX) ||
    layerId.startsWith(SELECTED_BG_PREFIX) ||
    layerId.startsWith(SELECTED_FG_PREFIX)
  );
}

export function addTrackSource(
  map: maplibregl.Map,
  trackId: number,
  coordinates: [number, number][],
): void {
  const id = sourceId(trackId);
  if (map.getSource(id)) return;

  map.addSource(id, {
    type: "geojson",
    data: {
      type: "Feature",
      properties: { id: trackId },
      geometry: {
        type: "LineString",
        coordinates,
      },
    },
  });
}

export function removeTrackSource(map: maplibregl.Map, trackId: number): void {
  const id = sourceId(trackId);
  if (!map.getSource(id)) return;

  removeTrackLayers(map, trackId);
  map.removeSource(id);
}

export function addDeselectedLayer(map: maplibregl.Map, trackId: number): void {
  const layerId = deselectedLayerId(trackId);
  if (map.getLayer(layerId)) return;

  map.addLayer({
    id: layerId,
    type: "line",
    source: sourceId(trackId),
    paint: DESELECTED_PAINT,
  });
}

export function addSelectedLayers(map: maplibregl.Map, trackId: number): void {
  const bgId = selectedBgLayerId(trackId);
  const fgId = selectedFgLayerId(trackId);

  if (!map.getLayer(bgId)) {
    map.addLayer({
      id: bgId,
      type: "line",
      source: sourceId(trackId),
      paint: SELECTED_BG_PAINT,
    });
  }

  if (!map.getLayer(fgId)) {
    map.addLayer({
      id: fgId,
      type: "line",
      source: sourceId(trackId),
      paint: SELECTED_FG_PAINT,
    });
  }
}

export function removeTrackLayers(map: maplibregl.Map, trackId: number): void {
  const layers = [
    deselectedLayerId(trackId),
    selectedBgLayerId(trackId),
    selectedFgLayerId(trackId),
  ];

  for (const id of layers) {
    if (map.getLayer(id)) {
      map.removeLayer(id);
    }
  }
}

export function syncTrackSources(
  map: maplibregl.Map,
  geometries: { track_id: number; coordinates: [number, number][] }[],
  currentTrackIds: Set<number>,
  selectedTrackIds: Set<number>,
): Set<number> {
  const incomingIds = new Set(geometries.map((g) => g.track_id));

  const toRemove = [...currentTrackIds].filter((id) => !incomingIds.has(id));
  for (const id of toRemove) {
    removeTrackSource(map, id);
  }

  for (const geometry of geometries) {
    const { track_id, coordinates } = geometry;
    if (!currentTrackIds.has(track_id)) {
      addTrackSource(map, track_id, coordinates);
      if (selectedTrackIds.has(track_id)) {
        addSelectedLayers(map, track_id);
      } else {
        addDeselectedLayer(map, track_id);
      }
    }
  }

  return incomingIds;
}

export function syncSelection(
  map: maplibregl.Map,
  selectedIds: Set<number>,
  previousSelectedIds: Set<number>,
  currentTrackIds: Set<number>,
): void {
  for (const id of currentTrackIds) {
    const wasSelected = previousSelectedIds.has(id);
    const isSelected = selectedIds.has(id);

    if (!wasSelected && isSelected) {
      removeTrackLayers(map, id);
      addSelectedLayers(map, id);
    } else if (wasSelected && !isSelected) {
      removeTrackLayers(map, id);
      addDeselectedLayer(map, id);
    }
  }
}

export function getTrackLayerIds(
  currentTrackIds: Set<number>,
  selectedIds: Set<number>,
): string[] {
  const layerIds: string[] = [];
  for (const id of currentTrackIds) {
    if (selectedIds.has(id)) {
      layerIds.push(selectedBgLayerId(id));
      layerIds.push(selectedFgLayerId(id));
    } else {
      layerIds.push(deselectedLayerId(id));
    }
  }
  return layerIds;
}
