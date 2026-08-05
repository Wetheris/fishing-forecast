import type {
  MarineHour,
  MarineSourceData,
} from "@/types/source-data";

const OPEN_METEO_MARINE_URL =
  "https://marine-api.open-meteo.com/v1/marine";

type MarineValue = number | null;

type OpenMeteoMarineResponse = {
  latitude: number;
  longitude: number;
  timezone: string;

  current?: {
    time?: string;
    wave_height?: MarineValue;
    wave_direction?: MarineValue;
    wave_period?: MarineValue;
    swell_wave_height?: MarineValue;
    swell_wave_direction?: MarineValue;
    swell_wave_period?: MarineValue;
  };

  hourly: {
    time: string[];
    wave_height: MarineValue[];
    wave_direction: MarineValue[];
    wave_period: MarineValue[];
    swell_wave_height: MarineValue[];
    swell_wave_direction: MarineValue[];
    swell_wave_period: MarineValue[];
  };
};

export async function fetchOpenMeteoMarine(
  latitude: number,
  longitude: number,
): Promise<MarineSourceData> {
  const url = new URL(OPEN_METEO_MARINE_URL);

  url.searchParams.set("latitude", latitude.toString());
  url.searchParams.set(
    "longitude",
    longitude.toString(),
  );

  const variables = [
    "wave_height",
    "wave_direction",
    "wave_period",
    "swell_wave_height",
    "swell_wave_direction",
    "swell_wave_period",
  ].join(",");

  url.searchParams.set("current", variables);
  url.searchParams.set("hourly", variables);
  url.searchParams.set("cell_selection", "sea");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("length_unit", "metric");
  url.searchParams.set("forecast_days", "7");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: 1800,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Open-Meteo Marine returned ${response.status} ${response.statusText}.`,
    );
  }

  const raw =
    (await response.json()) as OpenMeteoMarineResponse;

  return normalizeMarineResponse(
    raw,
    latitude,
    longitude,
  );
}

function normalizeMarineResponse(
  raw: OpenMeteoMarineResponse,
  requestedLatitude: number,
  requestedLongitude: number,
): MarineSourceData {
  assertFinite(raw.latitude, "latitude");
  assertFinite(raw.longitude, "longitude");

  const hourly = raw.hourly.time
    .map((time, index) =>
      normalizeHour({
        time,
        waveHeight:
          raw.hourly.wave_height[index],
        waveDirection:
          raw.hourly.wave_direction[index],
        wavePeriod:
          raw.hourly.wave_period[index],
        swellHeight:
          raw.hourly.swell_wave_height[index],
        swellDirection:
          raw.hourly.swell_wave_direction[index],
        swellPeriod:
          raw.hourly.swell_wave_period[index],
      }),
    )
    .filter(
      (hour): hour is MarineHour => hour !== null,
    );

  if (hourly.length === 0) {
    throw new Error(
      "Open-Meteo Marine returned no usable wave forecast.",
    );
  }

  const currentFromApi = normalizeHour({
    time: raw.current?.time ?? hourly[0].time,
    waveHeight: raw.current?.wave_height,
    waveDirection: raw.current?.wave_direction,
    wavePeriod: raw.current?.wave_period,
    swellHeight: raw.current?.swell_wave_height,
    swellDirection:
      raw.current?.swell_wave_direction,
    swellPeriod: raw.current?.swell_wave_period,
  });

  const current =
    currentFromApi ??
    findCurrentHour(hourly, raw.current?.time) ??
    hourly[0];

  return {
    provider: "open-meteo-marine",
    fetchedAt: new Date().toISOString(),
    timezone: raw.timezone,
    requestedLocation: {
      latitude: requestedLatitude,
      longitude: requestedLongitude,
    },
    resolvedGrid: {
      latitude: raw.latitude,
      longitude: raw.longitude,
      distanceMiles: haversineMiles(
        requestedLatitude,
        requestedLongitude,
        raw.latitude,
        raw.longitude,
      ),
    },
    current,
    hourly: hourly.slice(0, 72),
  };
}

function normalizeHour({
  time,
  waveHeight,
  waveDirection,
  wavePeriod,
  swellHeight,
  swellDirection,
  swellPeriod,
}: {
  time: string;
  waveHeight: MarineValue | undefined;
  waveDirection: MarineValue | undefined;
  wavePeriod: MarineValue | undefined;
  swellHeight: MarineValue | undefined;
  swellDirection: MarineValue | undefined;
  swellPeriod: MarineValue | undefined;
}): MarineHour | null {
  if (
    !isFiniteNumber(waveHeight) ||
    !isFiniteNumber(waveDirection) ||
    !isFiniteNumber(wavePeriod)
  ) {
    return null;
  }

  return {
    time,
    waveHeightM: waveHeight,
    waveDirectionDegrees: waveDirection,
    waveDirectionLabel:
      degreesToCardinalDirection(waveDirection),
    wavePeriodSeconds: wavePeriod,
    swellHeightM: finiteOrNull(swellHeight),
    swellDirectionDegrees:
      finiteOrNull(swellDirection),
    swellDirectionLabel: isFiniteNumber(
      swellDirection,
    )
      ? degreesToCardinalDirection(swellDirection)
      : null,
    swellPeriodSeconds:
      finiteOrNull(swellPeriod),
  };
}

function findCurrentHour(
  hourly: MarineHour[],
  currentTime: string | undefined,
): MarineHour | null {
  if (!currentTime) {
    return null;
  }

  return (
    hourly.find((hour) => hour.time >= currentTime) ??
    null
  );
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

  const normalized =
    ((degrees % 360) + 360) % 360;
  const index =
    Math.round(normalized / 22.5) % labels.length;

  return labels[index];
}

function haversineMiles(
  firstLatitude: number,
  firstLongitude: number,
  secondLatitude: number,
  secondLongitude: number,
): number {
  const earthRadiusMiles = 3958.8;
  const radians = (degrees: number) =>
    degrees * (Math.PI / 180);

  const latitudeDifference = radians(
    secondLatitude - firstLatitude,
  );
  const longitudeDifference = radians(
    secondLongitude - firstLongitude,
  );

  const firstLatRadians = radians(firstLatitude);
  const secondLatRadians = radians(secondLatitude);

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(firstLatRadians) *
      Math.cos(secondLatRadians) *
      Math.sin(longitudeDifference / 2) ** 2;

  return (
    earthRadiusMiles *
    2 *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}

function assertFinite(
  value: unknown,
  field: string,
): asserts value is number {
  if (!isFiniteNumber(value)) {
    throw new Error(
      `Open-Meteo Marine returned an invalid ${field}.`,
    );
  }
}

function isFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function finiteOrNull(
  value: unknown,
): number | null {
  return isFiniteNumber(value) ? value : null;
}
