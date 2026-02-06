import { describe, it, expect } from "vitest";
import { speedToColor, buildLineGradientStops } from "./speedColors";

describe("speedToColor", () => {
  it("returns slow color at speed 0", () => {
    expect(speedToColor(0, 10)).toBe("rgb(200, 50, 70)");
  });

  it("returns fast color at max speed", () => {
    expect(speedToColor(10, 10)).toBe("rgb(66, 255, 140)");
  });

  it("returns slow color when maxSpeed is zero", () => {
    expect(speedToColor(5, 0)).toBe("rgb(200, 50, 70)");
  });

  it("clamps speed above maxSpeed to fast color", () => {
    expect(speedToColor(20, 10)).toBe("rgb(66, 255, 140)");
  });

  it("returns an intermediate color at half speed", () => {
    const color = speedToColor(5, 10);
    expect(color).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
    expect(color).not.toBe("rgb(200, 50, 70)");
    expect(color).not.toBe("rgb(66, 255, 140)");
  });

  it("applies S-curve to compress middle tones", () => {
    const colorLow = speedToColor(2.5, 10);
    const colorHigh = speedToColor(7.5, 10);
    const parseLow = colorLow.match(/rgb\((\d+), (\d+), (\d+)\)/)!;
    const parseHigh = colorHigh.match(/rgb\((\d+), (\d+), (\d+)\)/)!;
    const gLow = parseInt(parseLow[2]);
    const gHigh = parseInt(parseHigh[2]);
    const gDiffLowToHigh = gHigh - gLow;
    const gDiffEndpoints = 255 - 50;
    expect(gDiffLowToHigh / gDiffEndpoints).toBeGreaterThan(0.6);
  });
});

describe("buildLineGradientStops", () => {
  it("returns fallback for empty speeds", () => {
    const stops = buildLineGradientStops([], 10);
    expect(stops).toEqual([
      "interpolate",
      ["linear"],
      ["line-progress"],
      0,
      "rgb(200, 50, 70)",
      1,
      "rgb(200, 50, 70)",
    ]);
  });

  it("returns fallback for zero maxSpeed", () => {
    const stops = buildLineGradientStops([5, 10], 0);
    expect(stops).toEqual([
      "interpolate",
      ["linear"],
      ["line-progress"],
      0,
      "rgb(200, 50, 70)",
      1,
      "rgb(200, 50, 70)",
    ]);
  });

  it("builds gradient stops for segment speeds", () => {
    const speeds = [2, 5, 8];
    const stops = buildLineGradientStops(speeds, 10);

    expect(stops[0]).toBe("interpolate");
    expect(stops[1]).toEqual(["linear"]);
    expect(stops[2]).toEqual(["line-progress"]);

    const dataStops = stops.slice(3);
    expect(dataStops.length).toBe(speeds.length * 2);

    for (let i = 0; i < dataStops.length; i += 2) {
      const progress = dataStops[i] as number;
      const color = dataStops[i + 1] as string;
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
      expect(color).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
    }
  });

  it("distributes stops evenly across line progress", () => {
    const speeds = [1, 2, 3, 4];
    const stops = buildLineGradientStops(speeds, 10);
    const dataStops = stops.slice(3);

    const progresses = [];
    for (let i = 0; i < dataStops.length; i += 2) {
      progresses.push(dataStops[i] as number);
    }

    expect(progresses[0]).toBeCloseTo(0, 5);
    expect(progresses[progresses.length - 1]).toBeCloseTo(1, 5);

    for (let i = 1; i < progresses.length; i++) {
      expect(progresses[i]).toBeGreaterThan(progresses[i - 1]);
    }
  });

  it("uses minSpeed parameter for relative scaling", () => {
    const speeds = [5, 8, 10];
    const stopsNoMin = buildLineGradientStops(speeds, 10);
    const stopsWithMin = buildLineGradientStops(speeds, 10, 5);

    expect(stopsNoMin).not.toEqual(stopsWithMin);
  });
});
