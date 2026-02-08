const STORAGE_KEY = "selected_map_id";

export const selectedMapStorage = {
  getSelectedMapId(): number | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const parsed = Number(stored);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        console.warn("[selectedMapStorage] Invalid stored map ID, ignoring");
        return null;
      }

      return parsed;
    } catch (error) {
      console.warn("[selectedMapStorage] Failed to read map ID:", error);
      return null;
    }
  },

  setSelectedMapId(mapId: number): void {
    try {
      localStorage.setItem(STORAGE_KEY, String(mapId));
    } catch (error) {
      console.warn("[selectedMapStorage] Failed to save map ID:", error);
    }
  },

  clearSelectedMapId(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("[selectedMapStorage] Failed to clear map ID:", error);
    }
  },
};
