import type { WeatherSourceData } from "@/types/weather";

const OPEN_METEO_FORECAST_URL =
  "https://api.open-meteo.com/v1/forecast";

type OpenMeteoResponse = {
  latitude: number;
  longitude: number;
  timezone: string;
  utc_offset_seconds: number;

  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
  };

  hourly: {
    time: string[];
    temperature_2m: Array<number | null>;
    apparent_temperature: Array<number | null>;
    precipitation_probability: Array<number | null>;
    weather_code: Array<number | null>;
    wind_speed_10m: Array<number | null>;
    wind_direction_10m: Array<number | null>;
    wind_gusts_10m: Array<number | null>;
  };

  daily: {
    time: string[];
    weather_code: Array<number | null>;
    temperature_2m_max: Array<number | null>;
    temperature_2m_min: Array<number | null>;
    precipitation_probability_max: Array<number | null>;
  };
};

export async function fetchOpenMeteoWeather(
  latitude: number,
  longitude: number,
): Promise<WeatherSourceData> {
  const url = new URL(OPEN_METEO_FORECAST_URL);

  url.searchParams.set("latitude", latitude.toString());
  url.searchParams.set("longitude", longitude.toString());

  url.searchParams.set(
    "current",
    [
      "temperature_2m",
      "apparent_temperature",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
    ].join(","),
  );

  url.searchParams.set(
    "hourly",
    [
      "temperature_2m",
      "apparent_temperature",
      "precipitation_probability",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
    ].join(","),
  );

  url.searchParams.set(
    "daily",
    [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
    ].join(","),
  );

  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("wind_speed_unit", "ms");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: 900,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Open-Meteo returned ${response.status} ${response.statusText}`,
    );
  }

  const raw = (await response.json()) as OpenMeteoResponse;

  return normalizeOpenMeteoResponse(raw);
}

function normalizeOpenMeteoResponse(
  raw: OpenMeteoResponse,
): WeatherSourceData {
  assertFiniteNumber(raw.latitude, "latitude");
  assertFiniteNumber(raw.longitude, "longitude");
  assertFiniteNumber(raw.utc_offset_seconds, "utc_offset_seconds");

  const currentHourIndex = findCurrentHourIndex(
    raw.current.time,
    raw.hourly.time,
  );

  const hourly = raw.hourly.time
    .map((time, index) => ({ time, index }))
    .map(({ time, index }) => {
      const temperatureC = raw.hourly.temperature_2m[index];
      const apparentTemperatureC =
        raw.hourly.apparent_temperature[index];
      const weatherCode = raw.hourly.weather_code[index];
      const windSpeedMps = raw.hourly.wind_speed_10m[index];
      const windDirectionDegrees =
        raw.hourly.wind_direction_10m[index];
      const windGustMps = raw.hourly.wind_gusts_10m[index];

      if (
        !isFiniteNumber(temperatureC) ||
        !isFiniteNumber(apparentTemperatureC) ||
        !isFiniteNumber(weatherCode) ||
        !isFiniteNumber(windSpeedMps) ||
        !isFiniteNumber(windDirectionDegrees) ||
        !isFiniteNumber(windGustMps)
      ) {
        return null;
      }

      return {
        time,
        temperatureC,
        apparentTemperatureC,
        weatherCode,
        condition: weatherCodeToCondition(weatherCode),
        rainChancePercent:
          toFiniteNumberOrNull(
            raw.hourly.precipitation_probability[index],
          ),
        windSpeedMps,
        windGustMps,
        windDirectionDegrees,
        windDirectionLabel:
          degreesToCardinalDirection(windDirectionDegrees),
      };
    })
    .filter(
      (
        value,
      ): value is WeatherSourceData["hourly"][number] =>
        value !== null,
    );

  const daily = raw.daily.time
    .map((date, index) => {
      const weatherCode = raw.daily.weather_code[index];
      const temperatureMaxC =
        raw.daily.temperature_2m_max[index];
      const temperatureMinC =
        raw.daily.temperature_2m_min[index];

      if (
        !isFiniteNumber(weatherCode) ||
        !isFiniteNumber(temperatureMaxC) ||
        !isFiniteNumber(temperatureMinC)
      ) {
        return null;
      }

      return {
        date,
        weatherCode,
        condition: weatherCodeToCondition(weatherCode),
        temperatureMaxC,
        temperatureMinC,
        rainChancePercent:
          toFiniteNumberOrNull(
            raw.daily.precipitation_probability_max[index],
          ),
      };
    })
    .filter(
      (
        value,
      ): value is WeatherSourceData["daily"][number] =>
        value !== null,
    );

  assertFiniteNumber(
    raw.current.temperature_2m,
    "current.temperature_2m",
  );
  assertFiniteNumber(
    raw.current.apparent_temperature,
    "current.apparent_temperature",
  );
  assertFiniteNumber(
    raw.current.weather_code,
    "current.weather_code",
  );
  assertFiniteNumber(
    raw.current.wind_speed_10m,
    "current.wind_speed_10m",
  );
  assertFiniteNumber(
    raw.current.wind_direction_10m,
    "current.wind_direction_10m",
  );
  assertFiniteNumber(
    raw.current.wind_gusts_10m,
    "current.wind_gusts_10m",
  );

  return {
    provider: "open-meteo",
    fetchedAt: new Date().toISOString(),
    latitude: raw.latitude,
    longitude: raw.longitude,
    timezone: raw.timezone,
    utcOffsetSeconds: raw.utc_offset_seconds,

    current: {
      time: raw.current.time,
      temperatureC: raw.current.temperature_2m,
      apparentTemperatureC:
        raw.current.apparent_temperature,
      weatherCode: raw.current.weather_code,
      condition:
        weatherCodeToCondition(raw.current.weather_code),
      rainChancePercent:
        toFiniteNumberOrNull(
          raw.hourly.precipitation_probability[
            currentHourIndex
          ],
        ),
      windSpeedMps: raw.current.wind_speed_10m,
      windGustMps: raw.current.wind_gusts_10m,
      windDirectionDegrees:
        raw.current.wind_direction_10m,
      windDirectionLabel:
        degreesToCardinalDirection(
          raw.current.wind_direction_10m,
        ),
    },

    hourly,
    daily,
  };
}

function findCurrentHourIndex(
  currentTime: string,
  hourlyTimes: string[],
): number {
  const currentHour = currentTime.slice(0, 13);
  const index = hourlyTimes.findIndex(
    (time) => time.slice(0, 13) >= currentHour,
  );

  return index >= 0 ? index : 0;
}

function degreesToCardinalDirection(
  degrees: number,
): string {
  const labels = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];

  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % labels.length;

  return labels[index];
}

function weatherCodeToCondition(code: number): string {
  if (code === 0) return "Clear";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if ([51, 53, 55].includes(code)) return "Drizzle";
  if ([56, 57].includes(code)) return "Freezing drizzle";
  if ([61, 63, 65].includes(code)) return "Rain";
  if ([66, 67].includes(code)) return "Freezing rain";
  if ([71, 73, 75, 77].includes(code)) return "Snow";
  if ([80, 81, 82].includes(code)) return "Rain showers";
  if ([85, 86].includes(code)) return "Snow showers";
  if ([95, 96, 99].includes(code)) return "Thunderstorms";

  return "Unknown";
}

function assertFiniteNumber(
  value: unknown,
  fieldName: string,
): asserts value is number {
  if (!isFiniteNumber(value)) {
    throw new Error(
      `Open-Meteo response contained an invalid ${fieldName}`,
    );
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function toFiniteNumberOrNull(
  value: unknown,
): number | null {
  return isFiniteNumber(value) ? value : null;
}
