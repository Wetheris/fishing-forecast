import { NextRequest, NextResponse } from "next/server";

export const revalidate = 900;

type FlowMode = "wind" | "current";

type RequestedPoint = {
  latitude: number;
  longitude: number;
};

type OpenMeteoPoint = {
  latitude?: number;
  longitude?: number;
  current?: {
    wind_speed_10m?: number | null;
    wind_direction_10m?: number | null;
    ocean_current_velocity?: number | null;
    ocean_current_direction?: number | null;
  };
};

type FlowPoint = {
  latitude: number;
  longitude: number;
  speedMph: number;
  directionDegrees: number;
};

const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast";
const MARINE_URL =
  "https://marine-api.open-meteo.com/v1/marine";

export async function GET(request: NextRequest) {
  const latitude = parseNumber(
    request.nextUrl.searchParams.get("latitude"),
  );
  const longitude = parseNumber(
    request.nextUrl.searchParams.get("longitude"),
  );
  const requestedMode =
    request.nextUrl.searchParams.get("mode");
  const mode: FlowMode =
    requestedMode === "current"
      ? "current"
      : "wind";
  const radiusMiles = clamp(
    parseNumber(
      request.nextUrl.searchParams.get("radiusMiles"),
    ) ?? 20,
    5,
    60,
  );
  const density = normalizeDensity(
    parseNumber(
      request.nextUrl.searchParams.get("density"),
    ) ?? 5,
  );

  if (
    latitude === null ||
    latitude < -90 ||
    latitude > 90
  ) {
    return NextResponse.json(
      {
        error:
          "A valid latitude between -90 and 90 is required.",
      },
      { status: 400 },
    );
  }

  if (
    longitude === null ||
    longitude < -180 ||
    longitude > 180
  ) {
    return NextResponse.json(
      {
        error:
          "A valid longitude between -180 and 180 is required.",
      },
      { status: 400 },
    );
  }

  const grid = buildGrid(
    latitude,
    longitude,
    radiusMiles,
    density,
  );

  try {
    const points = await fetchFlowPoints(
      grid,
      mode,
    );

    if (points.length === 0) {
      throw new Error(
        mode === "current"
          ? "No modeled current data is available around this point."
          : "No wind data is available around this point.",
      );
    }

    const speeds = points.map(
      (point) => point.speedMph,
    );

    return NextResponse.json(
      {
        mode,
        fetchedAt: new Date().toISOString(),
        center: {
          latitude,
          longitude,
        },
        radiusMiles,
        density,
        speedRangeMph: {
          minimum: Math.min(...speeds),
          maximum: Math.max(...speeds),
        },
        points,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=900, stale-while-revalidate=1800",
        },
      },
    );
  } catch (error) {
    console.error(
      "Unable to load flow visualization data",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Flow visualization data is temporarily unavailable.",
      },
      { status: 502 },
    );
  }
}

async function fetchFlowPoints(
  requestedPoints: RequestedPoint[],
  mode: FlowMode,
): Promise<FlowPoint[]> {
  const url = new URL(
    mode === "current"
      ? MARINE_URL
      : WEATHER_URL,
  );

  url.searchParams.set(
    "latitude",
    requestedPoints
      .map((point) => point.latitude.toFixed(5))
      .join(","),
  );
  url.searchParams.set(
    "longitude",
    requestedPoints
      .map((point) => point.longitude.toFixed(5))
      .join(","),
  );

  if (mode === "current") {
    url.searchParams.set(
      "current",
      "ocean_current_velocity,ocean_current_direction",
    );
    url.searchParams.set(
      "cell_selection",
      "sea",
    );
  } else {
    url.searchParams.set(
      "current",
      "wind_speed_10m,wind_direction_10m",
    );
  }

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
      `Open-Meteo returned ${response.status} ${response.statusText}.`,
    );
  }

  const payload =
    (await response.json()) as
      | OpenMeteoPoint
      | OpenMeteoPoint[];
  const rawPoints = Array.isArray(payload)
    ? payload
    : [payload];

  const normalized = rawPoints
    .map((raw, index) =>
      normalizePoint(
        raw,
        requestedPoints[index] ??
          requestedPoints[0],
        mode,
      ),
    )
    .filter(
      (point): point is FlowPoint =>
        point !== null,
    );

  if (mode === "current") {
    return deduplicateResolvedSeaPoints(
      normalized,
    );
  }

  return normalized;
}

function normalizePoint(
  raw: OpenMeteoPoint,
  requested: RequestedPoint | undefined,
  mode: FlowMode,
): FlowPoint | null {
  if (!requested) {
    return null;
  }

  const speedKmh =
    mode === "current"
      ? raw.current?.ocean_current_velocity
      : raw.current?.wind_speed_10m;
  const sourceDirection =
    mode === "current"
      ? raw.current?.ocean_current_direction
      : raw.current?.wind_direction_10m;

  if (
    !isFiniteNumber(speedKmh) ||
    !isFiniteNumber(sourceDirection)
  ) {
    return null;
  }

  /*
   * Open-Meteo wind direction is meteorological:
   * it reports where the wind comes FROM.
   * The visualizer arrows show where the flow is
   * moving TO, so wind is rotated 180 degrees.
   *
   * Ocean-current direction already reports where
   * the current is heading.
   */
  const directionDegrees =
    mode === "wind"
      ? normalizeDegrees(
          sourceDirection + 180,
        )
      : normalizeDegrees(sourceDirection);

  return {
    latitude:
      mode === "current" &&
      isFiniteNumber(raw.latitude)
        ? raw.latitude
        : requested.latitude,
    longitude:
      mode === "current" &&
      isFiniteNumber(raw.longitude)
        ? raw.longitude
        : requested.longitude,
    speedMph: speedKmh * 0.621371,
    directionDegrees,
  };
}

function buildGrid(
  latitude: number,
  longitude: number,
  radiusMiles: number,
  density: number,
): RequestedPoint[] {
  const latitudeRadius =
    radiusMiles / 69;
  const longitudeMilesPerDegree =
    Math.max(
      12,
      69 *
        Math.cos(
          latitude * (Math.PI / 180),
        ),
    );
  const longitudeRadius =
    radiusMiles /
    longitudeMilesPerDegree;
  const half = (density - 1) / 2;

  const points: RequestedPoint[] = [];

  for (
    let row = 0;
    row < density;
    row += 1
  ) {
    for (
      let column = 0;
      column < density;
      column += 1
    ) {
      const y =
        half === 0
          ? 0
          : (row - half) / half;
      const x =
        half === 0
          ? 0
          : (column - half) / half;

      points.push({
        latitude: clamp(
          latitude +
            y * latitudeRadius,
          -89.9,
          89.9,
        ),
        longitude: wrapLongitude(
          longitude +
            x * longitudeRadius,
        ),
      });
    }
  }

  return points;
}

function deduplicateResolvedSeaPoints(
  points: FlowPoint[],
): FlowPoint[] {
  const seen = new Set<string>();

  return points.filter((point) => {
    const key = [
      point.latitude.toFixed(3),
      point.longitude.toFixed(3),
    ].join(":");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeDensity(
  value: number,
): number {
  const rounded = Math.round(
    clamp(value, 3, 7),
  );

  if (rounded % 2 === 1) {
    return rounded;
  }

  return rounded >= 6
    ? 7
    : rounded <= 4
      ? 3
      : 5;
}

function parseNumber(
  value: string | null,
): number | null {
  if (
    value === null ||
    value.trim() === ""
  ) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function normalizeDegrees(
  value: number,
): number {
  return ((value % 360) + 360) % 360;
}

function wrapLongitude(
  value: number,
): number {
  return (
    ((value + 180) % 360 + 360) %
      360 -
    180
  );
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}

function isFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}
