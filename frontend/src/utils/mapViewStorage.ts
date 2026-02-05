export interface MapViewState {
  center: [number, number];
  zoom: number;
}

const STORAGE_KEY = "map_view_state";

function isValidMapView(value: unknown): value is MapViewState {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    Array.isArray(obj.center) &&
    obj.center.length === 2 &&
    typeof obj.center[0] === "number" &&
    typeof obj.center[1] === "number" &&
    typeof obj.zoom === "number"
  );
}

export const mapViewStorage = {
  getMapView(): MapViewState | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const parsed: unknown = JSON.parse(stored);
      if (!isValidMapView(parsed)) {
        console.warn("[mapViewStorage] Invalid stored map view, ignoring");
        return null;
      }

      return parsed;
    } catch (error) {
      console.warn("[mapViewStorage] Failed to read map view:", error);
      return null;
    }
  },

  setMapView(view: MapViewState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(view));
    } catch (error) {
      console.warn("[mapViewStorage] Failed to save map view:", error);
    }
  },

  clearMapView(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("[mapViewStorage] Failed to clear map view:", error);
    }
  },
};
