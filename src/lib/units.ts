export function celsiusToFahrenheit(value: number): number {
  return value * 1.8 + 32;
}

export function metersPerSecondToMph(value: number): number {
  return value * 2.236936;
}

export function metersPerSecondToKnots(value: number): number {
  return value * 1.943844;
}

export function roundMeasurement(value: number): number {
  return Math.round(value);
}
