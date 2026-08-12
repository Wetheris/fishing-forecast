"use client";

import type {
  AstronomySourceData,
  MarineHour,
  MarineSourceData,
  TideSourceData,
} from "@/types/source-data";
import type { TideStationOption } from "@/types/tide-stations";
import type { WeatherSourceData } from "@/types/weather";
import type { SessionConditionSnapshot } from "@/types/sessions";
import {
  celsiusToFahrenheit,
  metersPerSecondToMph,
  metersToFeet,
  roundToTenth,
} from "@/lib/units";

export async function collectSessionConditions({
  latitude,
  longitude,
  eventTime = new Date().toISOString(),
}: {
  latitude: number;
  longitude: number;
  eventTime?: string;
}): Promise<SessionConditionSnapshot> {
  const unavailable: string[] = [];

  const [weather, marine, station] = await Promise.all([
    fetchJson<WeatherSourceData>(
      `/api/weather?latitude=${latitude}&longitude=${longitude}`,
    ).catch(() => {
      unavailable.push("weather");
      return null;
    }),
    fetchJson<MarineSourceData>(
      `/api/marine?latitude=${latitude}&longitude=${longitude}`,
    ).catch(() => {
      unavailable.push("marine");
      return null;
    }),
    fetchNearestTideStation(latitude, longitude).catch(() => {
      unavailable.push("tide");
      return null;
    }),
  ]);

  const timezone =
    weather?.timezone ??
    marine?.timezone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone ??
    "UTC";

  const localEventTime = formatLocalKey(
    new Date(eventTime),
    timezone,
  );
  const dateKey = localEventTime.slice(0, 10);

  const [tide, moon] = await Promise.all([
    station
      ? fetchJson<TideSourceData>(
          `/api/tides?station=${encodeURIComponent(
            station.id,
          )}&timezone=${encodeURIComponent(
            timezone,
          )}&datum=MLLW&distanceMiles=${
            station.distanceMiles ?? ""
          }`,
        ).catch(() => null)
      : Promise.resolve(null),
    fetchJson<AstronomySourceData>(
      `/api/astronomy?latitude=${latitude}&longitude=${longitude}&timezone=${encodeURIComponent(
        timezone,
      )}&date=${dateKey}`,
    ).catch(() => {
      unavailable.push("moon");
      return null;
    }),
  ]);

  if (station && !tide && !unavailable.includes("tide")) {
    unavailable.push("tide");
  }

  const weatherPoint = weather
    ? nearestWeatherPoint(weather, localEventTime)
    : null;
  const marinePoint = marine
    ? nearestMarinePoint(marine.hourly, localEventTime)
    : null;
  const tidePoint = tide
    ? nearestTidePoint(tide, localEventTime)
    : null;

  return {
    capturedAt: new Date().toISOString(),
    eventTime,
    latitude,
    longitude,
    timezone,
    weather:
      weatherPoint
        ? {
            condition: weatherPoint.condition,
            temperatureF: roundToTenth(
              celsiusToFahrenheit(
                weatherPoint.temperatureC,
              ),
            ),
            feelsLikeF: roundToTenth(
              celsiusToFahrenheit(
                weatherPoint.apparentTemperatureC,
              ),
            ),
            rainChancePercent:
              weatherPoint.rainChancePercent,
            windMph: roundToTenth(
              metersPerSecondToMph(
                weatherPoint.windSpeedMps,
              ),
            ),
            windGustMph: roundToTenth(
              metersPerSecondToMph(
                weatherPoint.windGustMps,
              ),
            ),
            windDirection:
              weatherPoint.windDirectionLabel,
            windDirectionDegrees:
              weatherPoint.windDirectionDegrees,
          }
        : undefined,
    marine:
      marinePoint
        ? {
            waterTemperatureF:
              marinePoint.seaSurfaceTemperatureC === null
                ? null
                : roundToTenth(
                    celsiusToFahrenheit(
                      marinePoint.seaSurfaceTemperatureC,
                    ),
                  ),
            waveHeightFt: roundToTenth(
              metersToFeet(
                marinePoint.waveHeightM,
              ),
            ),
            wavePeriodSeconds: roundToTenth(
              marinePoint.wavePeriodSeconds,
            ),
            waveDirection:
              marinePoint.waveDirectionLabel,
            swellHeightFt:
              marinePoint.swellHeightM === null
                ? null
                : roundToTenth(
                    metersToFeet(
                      marinePoint.swellHeightM,
                    ),
                  ),
            swellPeriodSeconds:
              marinePoint.swellPeriodSeconds === null
                ? null
                : roundToTenth(
                    marinePoint.swellPeriodSeconds,
                  ),
          }
        : undefined,
    tide:
      tide && station && tidePoint
        ? {
            stationId: tide.station.id,
            stationName: tide.station.name,
            stationDistanceMiles:
              tide.station.distanceMiles ??
              station.distanceMiles,
            heightFt: tidePoint.heightFt,
            trend: tidePoint.trend,
            nextHighTime:
              tidePoint.nextHigh?.localTime ?? null,
            nextHighHeightFt:
              tidePoint.nextHigh?.heightFt ?? null,
            nextLowTime:
              tidePoint.nextLow?.localTime ?? null,
            nextLowHeightFt:
              tidePoint.nextLow?.heightFt ?? null,
          }
        : undefined,
    moon:
      moon
        ? {
            phaseName: moon.phaseName,
            illuminationPercent:
              roundToTenth(
                moon.illuminationPercent,
              ),
          }
        : undefined,
    unavailable,
  };
}

async function fetchNearestTideStation(
  latitude: number,
  longitude: number,
): Promise<TideStationOption | null> {
  const response = await fetchJson<{
    results: TideStationOption[];
  }>(
    `/api/tide-stations?latitude=${latitude}&longitude=${longitude}&limit=1`,
  );

  return response.results[0] ?? null;
}

async function fetchJson<T>(
  url: string,
): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Request failed with ${response.status}`,
    );
  }

  return (await response.json()) as T;
}

function nearestWeatherPoint(
  weather: WeatherSourceData,
  localEventTime: string,
) {
  return (
    nearestTimedItem(
      weather.hourly,
      localEventTime,
    ) ?? weather.current
  );
}

function nearestMarinePoint(
  hours: MarineHour[],
  localEventTime: string,
): MarineHour | null {
  return nearestTimedItem(hours, localEventTime);
}

function nearestTimedItem<
  T extends { time: string },
>(
  items: T[],
  target: string,
): T | null {
  if (items.length === 0) {
    return null;
  }

  const targetNumber = localKeyNumber(target);

  return items.reduce((closest, item) => {
    const closestDistance = Math.abs(
      localKeyNumber(closest.time) -
        targetNumber,
    );
    const itemDistance = Math.abs(
      localKeyNumber(item.time) -
        targetNumber,
    );

    return itemDistance < closestDistance
      ? item
      : closest;
  });
}

function nearestTidePoint(
  tide: TideSourceData,
  localEventTime: string,
): {
  heightFt: number | null;
  trend:
    | "rising"
    | "falling"
    | "steady"
    | "unknown";
  nextHigh: TideSourceData["nextHigh"];
  nextLow: TideSourceData["nextLow"];
} {
  const timeline = tide.timeline;
  const targetNumber =
    localKeyNumber(localEventTime);

  let index = -1;
  let bestDistance =
    Number.POSITIVE_INFINITY;

  timeline.forEach((point, pointIndex) => {
    const distance = Math.abs(
      localKeyNumber(point.localTime) -
        targetNumber,
    );

    if (distance < bestDistance) {
      bestDistance = distance;
      index = pointIndex;
    }
  });

  const heightFt =
    index >= 0
      ? timeline[index].heightFt
      : tide.currentHeightFt;

  let trend:
    | "rising"
    | "falling"
    | "steady"
    | "unknown" =
    tide.currentTrend;

  if (index >= 0) {
    const previous =
      timeline[Math.max(0, index - 1)];
    const next =
      timeline[
        Math.min(
          timeline.length - 1,
          index + 1,
        )
      ];

    if (previous && next) {
      const delta =
        next.heightFt - previous.heightFt;
      trend =
        Math.abs(delta) < 0.01
          ? "steady"
          : delta > 0
            ? "rising"
            : "falling";
    }
  }

  const nextHigh =
    tide.events.find(
      (event) =>
        event.type === "high" &&
        localKeyNumber(event.localTime) >=
          targetNumber,
    ) ?? null;
  const nextLow =
    tide.events.find(
      (event) =>
        event.type === "low" &&
        localKeyNumber(event.localTime) >=
          targetNumber,
    ) ?? null;

  return {
    heightFt,
    trend,
    nextHigh,
    nextLow,
  };
}

function localKeyNumber(value: string): number {
  const normalized =
    value.length === 16
      ? `${value}:00`
      : value;

  const timestamp = Date.parse(
    `${normalized}Z`,
  );

  return Number.isFinite(timestamp)
    ? timestamp
    : 0;
}

function formatLocalKey(
  date: Date,
  timezone: string,
): string {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      },
    ).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [
      part.type,
      part.value,
    ]),
  );

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`;
}
