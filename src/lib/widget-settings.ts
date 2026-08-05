export function stringSetting(
  settings: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const value = settings[key];
  return typeof value === "string" ? value : fallback;
}

export function booleanSetting(
  settings: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  const value = settings[key];
  return typeof value === "boolean" ? value : fallback;
}

export function numberSetting(
  settings: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const value = settings[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}
