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
const ELEVATION_URL =
  "https://api.open-meteo.com/v1/elevation";

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
    0.5,
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

  /*
   * Tide/current requests use Open-Meteo's sea-cell preference,
   * which intentionally resolves even a land coordinate to a
   * nearby ocean model cell. That is useful for getting the flow
   * value, but it also means we need a separate high-resolution
   * land/water mask before putting the arrow back on our requested
   * visualization point.
   */
  const [response, waterMask] = await Promise.all([
    fetch(url, {
      headers: {
        Accept: "application/json",
      },
      next: {
        revalidate: 900,
      },
    }),
    mode === "current"
      ? fetchWaterMask(requestedPoints)
      : Promise.resolve<boolean[] | null>(null),
  ]);

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

  return rawPoints
    .map((raw, index) => {
      if (
        mode === "current" &&
        waterMask?.[index] === false
      ) {
        return null;
      }

      return normalizePoint(
        raw,
        requestedPoints[index] ??
          requestedPoints[0],
        mode,
      );
    })
    .filter(
      (point): point is FlowPoint =>
        point !== null,
    );
}

async function fetchWaterMask(
  requestedPoints: RequestedPoint[],
): Promise<boolean[]> {
  const url = new URL(ELEVATION_URL);

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

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: 86400,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Open-Meteo elevation returned ${response.status} ${response.statusText}.`,
    );
  }

  const payload =
    (await response.json()) as {
      elevation?: unknown;
    };

  if (!Array.isArray(payload.elevation)) {
    throw new Error(
      "Open-Meteo elevation did not return a usable land mask.",
    );
  }

  /*
   * Copernicus DEM reports open water at about sea level.
   * A small +0.5 m tolerance keeps tiny interpolation noise from
   * punching holes in the water while still removing ordinary
   * beaches, roads, dunes, marsh islands, and inland terrain.
   */
  return requestedPoints.map((_, index) => {
    const elevation =
      payload.elevation?.[index];

    return (
      typeof elevation === "number" &&
      Number.isFinite(elevation) &&
      elevation <= 0.5
    );
  });
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
    /*
     * Keep visualization arrows on the requested sampling grid.
     * Open-Meteo may resolve nearby marine requests to the same
     * coarse ocean-model cell; using raw.latitude/raw.longitude
     * here caused arrows to jump several miles away and disappear
     * from close zoom levels.
     *
     * Repeated values at high zoom are expected and honestly show
     * the model's true spatial resolution better than hiding them.
     */
    latitude: requested.latitude,
    longitude: requested.longitude,
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

  /*
   * Use a staggered hex lattice rather than a rectangular NxN
   * matrix. Hex spacing is visually uniform in every direction,
   * and clipping it to a circular footprint prevents the arrows
   * from visibly tracing a square around the selected area.
   */
  const horizontalSpacing =
    2 / Math.max(1, density - 1);
  const verticalSpacing =
    horizontalSpacing *
    (Math.sqrt(3) / 2);
  const maximumRow =
    Math.ceil(
      1 / verticalSpacing,
    );
  const maximumColumn =
    Math.ceil(
      1 / horizontalSpacing,
    ) + 1;
  const footprintRadiusSquared =
    1.05 ** 2;

  const points: RequestedPoint[] = [];

  for (
    let row = -maximumRow;
    row <= maximumRow;
    row += 1
  ) {
    const y =
      row * verticalSpacing;
    const rowOffset =
      Math.abs(row) % 2 === 1
        ? horizontalSpacing / 2
        : 0;

    for (
      let column = -maximumColumn;
      column <= maximumColumn;
      column += 1
    ) {
      const x =
        column *
          horizontalSpacing +
        rowOffset;

      if (
        x * x + y * y >
        footprintRadiusSquared
      ) {
        continue;
      }

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
