import type { WeatherSourceData } from "@/types/weather";

export const FORECAST_ANCHOR_HOURS = [
  1, 4, 7, 10, 13, 16, 19, 22,
] as const;

export function dateKeyFromLocalTime(
  localDateTime: string,
): string {
  return localDateTime.slice(0, 10);
}

export function hourFromLocalTime(
  localDateTime: string,
): number | null {
  const match = localDateTime.match(/T(\d{2}):/);

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  return Number.isInteger(hour) ? hour : null;
}

export function weatherHoursForDate(
  hourly: WeatherSourceData["hourly"],
  date: string,
): WeatherSourceData["hourly"] {
  return hourly.filter(
    (hour) => dateKeyFromLocalTime(hour.time) === date,
  );
}

export function selectDefaultForecastHours({
  hourly,
  selectedDate,
  todayDate,
  currentLocalTime,
  count = 8,
}: {
  hourly: WeatherSourceData["hourly"];
  selectedDate: string;
  todayDate: string;
  currentLocalTime: string;
  count?: number;
}): WeatherSourceData["hourly"] {
  const anchorSet = new Set<number>(
    FORECAST_ANCHOR_HOURS,
  );

  if (selectedDate === todayDate) {
    return hourly
      .filter((hour) => {
        const hourNumber = hourFromLocalTime(hour.time);

        return (
          hour.time >= currentLocalTime &&
          hourNumber !== null &&
          anchorSet.has(hourNumber)
        );
      })
      .slice(0, count);
  }

  return hourly
    .filter((hour) => {
      const hourNumber = hourFromLocalTime(hour.time);

      return (
        dateKeyFromLocalTime(hour.time) ===
          selectedDate &&
        hourNumber !== null &&
        anchorSet.has(hourNumber)
      );
    })
    .slice(0, count);
}

export function selectExpandedForecastHours({
  hourly,
  selectedDate,
  todayDate,
  currentLocalTime,
}: {
  hourly: WeatherSourceData["hourly"];
  selectedDate: string;
  todayDate: string;
  currentLocalTime: string;
}): WeatherSourceData["hourly"] {
  return hourly.filter((hour) => {
    if (
      dateKeyFromLocalTime(hour.time) !== selectedDate
    ) {
      return false;
    }

    return (
      selectedDate !== todayDate ||
      hour.time >= currentLocalTime
    );
  });
}

export function formatForecastDateLabel({
  date,
  todayDate,
}: {
  date: string;
  todayDate: string;
}): string {
  if (date === todayDate) {
    return "Today";
  }

  const tomorrow = addDays(todayDate, 1);

  if (date === tomorrow) {
    return "Tomorrow";
  }

  return formatDate(date, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function formatCompactForecastDateLabel({
  date,
  todayDate,
}: {
  date: string;
  todayDate: string;
}): string {
  if (date === todayDate) {
    return "Today";
  }

  const tomorrow = addDays(todayDate, 1);

  if (date === tomorrow) {
    return "Tomorrow";
  }

  return formatDate(date, {
    weekday: "short",
  });
}

export function addDays(
  date: string,
  days: number,
): string {
  const parsed = parseDateKey(date);

  if (!parsed) {
    return date;
  }

  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function formatDate(
  date: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const parsed = parseDateKey(date);

  if (!parsed) {
    return date;
  }

  return new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZone: "UTC",
  }).format(parsed);
}

function parseDateKey(date: string): Date | null {
  const parsed = new Date(`${date}T12:00:00Z`);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}
