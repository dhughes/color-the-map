const SLOW_COLOR = { r: 200, g: 50, b: 70 };
const FAST_COLOR = { r: 66, g: 255, b: 140 };
const S_CURVE_POWER = 2.5;

export function speedToColor(
  speed: number,
  maxSpeed: number,
  minSpeed: number = 0,
): string {
  if (maxSpeed <= minSpeed) {
    return `rgb(${SLOW_COLOR.r}, ${SLOW_COLOR.g}, ${SLOW_COLOR.b})`;
  }

  const linearRatio = Math.min(
    Math.max((speed - minSpeed) / (maxSpeed - minSpeed), 0),
    1,
  );

  const ratio =
    linearRatio < 0.5
      ? 0.5 * Math.pow(2 * linearRatio, S_CURVE_POWER)
      : 1 - 0.5 * Math.pow(2 * (1 - linearRatio), S_CURVE_POWER);

  const r = Math.round(SLOW_COLOR.r + (FAST_COLOR.r - SLOW_COLOR.r) * ratio);
  const g = Math.round(SLOW_COLOR.g + (FAST_COLOR.g - SLOW_COLOR.g) * ratio);
  const b = Math.round(SLOW_COLOR.b + (FAST_COLOR.b - SLOW_COLOR.b) * ratio);

  return `rgb(${r}, ${g}, ${b})`;
}

export function buildLineGradientStops(
  segmentSpeeds: number[],
  maxSpeed: number,
  minSpeed: number = 0,
): unknown[] {
  const fallbackColor = `rgb(${SLOW_COLOR.r}, ${SLOW_COLOR.g}, ${SLOW_COLOR.b})`;

  if (segmentSpeeds.length === 0 || maxSpeed <= 0) {
    return [
      "interpolate",
      ["linear"],
      ["line-progress"],
      0,
      fallbackColor,
      1,
      fallbackColor,
    ];
  }

  const stops: unknown[] = ["interpolate", ["linear"], ["line-progress"]];

  for (let i = 0; i < segmentSpeeds.length; i++) {
    const progress = i / (segmentSpeeds.length - 1 || 1);
    const color = speedToColor(segmentSpeeds[i], maxSpeed, minSpeed);
    stops.push(progress, color);
  }

  return stops;
}
