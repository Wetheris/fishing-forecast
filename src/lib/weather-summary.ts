import type { WeatherSourceData } from "@/types/weather";
import { weatherHoursForDate } from "@/lib/forecast-selection";

export type WeatherDaySummary = {
  date: string;
  daily: WeatherSourceData["daily"][number] | null;
  hours: WeatherSourceData["hourly"];
  morningRainPercent: number | null;
  afternoonRainPercent: number | null;
  eveningRainPercent: number | null;
  windMinimumMps: number | null;
  windMaximumMps: number | null;
  maximumGustMps: number | null;
  morningWindLabel: string | null;
  afternoonWindLabel: string | null;
  eveningWindLabel: string | null;
  dominantWindLabel: string | null;
};

export function summarizeWeatherDay(
  data: WeatherSourceData,
  date: string,
): WeatherDaySummary {
  const hours = weatherHoursForDate(
    data.hourly,
    date,
  );
  const daily =
    data.daily.find((day) => day.date === date) ??
    null;

  return {
    date,
    daily,
    hours,
    morningRainPercent: maximumRainChance(
      hoursBetween(hours, 5, 12),
    ),
    afternoonRainPercent: maximumRainChance(
      hoursBetween(hours, 12, 18),
    ),
    eveningRainPercent: maximumRainChance(
      hoursBetween(hours, 18, 24),
    ),
    windMinimumMps: minimum(
      hours.map((hour) => hour.windSpeedMps),
    ),
    windMaximumMps: maximum(
      hours.map((hour) => hour.windSpeedMps),
    ),
    maximumGustMps: maximum(
      hours.map((hour) => hour.windGustMps),
    ),
    morningWindLabel: dominantDirection(
      hoursBetween(hours, 5, 12),
    ),
    afternoonWindLabel: dominantDirection(
      hoursBetween(hours, 12, 18),
    ),
    eveningWindLabel: dominantDirection(
      hoursBetween(hours, 18, 24),
    ),
    dominantWindLabel: dominantDirection(hours),
  };
}

export function dominantDirection(
  hours: WeatherSourceData["hourly"],
): string | null {
  if (hours.length === 0) {
    return null;
  }

  const counts = new Map<string, number>();

  for (const hour of hours) {
    counts.set(
      hour.windDirectionLabel,
      (counts.get(hour.windDirectionLabel) ?? 0) + 1,
    );
  }

  return (
    [...counts.entries()].sort(
      (first, second) => second[1] - first[1],
    )[0]?.[0] ?? null
  );
}

export function maximumRainChance(
  hours: WeatherSourceData["hourly"],
): number | null {
  return maximum(
    hours
      .map((hour) => hour.rainChancePercent)
      .filter(
        (value): value is number => value !== null,
      ),
  );
}

function hoursBetween(
  hours: WeatherSourceData["hourly"],
  startHour: number,
  endHour: number,
): WeatherSourceData["hourly"] {
  return hours.filter((hour) => {
    const value = Number(
      hour.time.slice(11, 13),
    );

    return (
      Number.isInteger(value) &&
      value >= startHour &&
      value < endHour
    );
  });
}

function minimum(values: number[]): number | null {
  return values.length > 0
    ? Math.min(...values)
    : null;
}

function maximum(values: number[]): number | null {
  return values.length > 0
    ? Math.max(...values)
    : null;
}
