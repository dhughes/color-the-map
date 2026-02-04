import { describe, it, expect } from "vitest";
import {
  formatDateShort,
  formatDateLong,
  formatDistance,
  formatDuration,
  formatSpeed,
  formatElevation,
} from "./formatters";

describe("formatDateShort", () => {
  it("formats date with month, day, and year", () => {
    const result = formatDateShort("2024-03-15T10:30:00Z");
    expect(result).toContain("Mar");
    expect(result).toContain("15");
    expect(result).toContain("2024");
  });
});

describe("formatDateLong", () => {
  it("formats date with weekday, month, day, and year", () => {
    const result = formatDateLong("2024-03-15T10:30:00Z");
    expect(result).toContain("Fri");
    expect(result).toContain("Mar");
    expect(result).toContain("15");
    expect(result).toContain("2024");
  });
});

describe("formatDistance", () => {
  it("returns null for null input", () => {
    expect(formatDistance(null)).toBeNull();
  });

  it("returns null for zero distance", () => {
    expect(formatDistance(0)).toBeNull();
  });

  it("formats meters to kilometers with 1 decimal place", () => {
    expect(formatDistance(1000)).toBe("1.0 km");
    expect(formatDistance(5500)).toBe("5.5 km");
    expect(formatDistance(12345)).toBe("12.3 km");
  });
});

describe("formatDuration", () => {
  it("returns null for null input", () => {
    expect(formatDuration(null)).toBeNull();
  });

  it("returns null for zero duration", () => {
    expect(formatDuration(0)).toBeNull();
  });

  it("formats seconds under an hour as MM:SS", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(3599)).toBe("59:59");
  });

  it("formats seconds over an hour as H:MM:SS", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3661)).toBe("1:01:01");
    expect(formatDuration(7325)).toBe("2:02:05");
  });
});

describe("formatSpeed", () => {
  it("returns null for null input", () => {
    expect(formatSpeed(null)).toBeNull();
  });

  it("returns null for zero speed", () => {
    expect(formatSpeed(0)).toBeNull();
  });

  it("converts m/s to km/h with 1 decimal place", () => {
    expect(formatSpeed(1)).toBe("3.6 km/h");
    expect(formatSpeed(2.78)).toBe("10.0 km/h");
    expect(formatSpeed(8.33)).toBe("30.0 km/h");
  });
});

describe("formatElevation", () => {
  it("returns null for null input", () => {
    expect(formatElevation(null)).toBeNull();
  });

  it("formats elevation as rounded meters", () => {
    expect(formatElevation(0)).toBe("0 m");
    expect(formatElevation(150.4)).toBe("150 m");
    expect(formatElevation(150.6)).toBe("151 m");
  });
});
