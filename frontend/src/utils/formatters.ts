export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateLong(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDistance(meters: number | null): string | null {
  if (meters === null || meters === 0) return null;
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
}

export function formatDuration(seconds: number | null): string | null {
  if (seconds === null || seconds === 0) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function formatSpeed(metersPerSecond: number | null): string | null {
  if (metersPerSecond === null || metersPerSecond === 0) return null;
  const kmh = metersPerSecond * 3.6;
  return `${kmh.toFixed(1)} km/h`;
}

export function formatElevation(meters: number | null): string | null {
  if (meters === null) return null;
  return `${Math.round(meters)} m`;
}
