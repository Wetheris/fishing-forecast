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

type FlowSourceInfo = {
  id: "noaa-dbofs" | "open-meteo";
  label: string;
  detail: string;
  resolution: string;
};

type FlowForecastPoint = {
  validAt: string;
  speedMph: number;
  directionDegrees: number;
};

type FlowFetchResult = {
  points: FlowPoint[];
  source: FlowSourceInfo;
  forecast: FlowForecastPoint[];
};

type DbofsGridPoint = {
  eta: number;
  xi: number;
  latitude: number;
  longitude: number;
  distanceMiles: number;
};

type DbofsVector = {
  speedMph: number;
  directionDegrees: number;
};

const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast";
const MARINE_URL =
  "https://marine-api.open-meteo.com/v1/marine";
const ELEVATION_URL =
  "https://api.open-meteo.com/v1/elevation";

/*
 * NOAA publishes a continuously updated FMRC "best" DBOFS time
 * series. It automatically selects data from the most recent model
 * run available for each forecast time, which saves TideHawk from
 * discovering individual cycle/file names.
 */
const DBOFS_DAP_URL =
  "https://opendap.co-ops.nos.noaa.gov/thredds/dodsC/DBOFS/fmrc/Aggregated_7_day_DBOFS_Fields_Forecast_best.ncd";

const DBOFS_ETA_MAX = 731;
const DBOFS_XI_MAX = 118;
const DBOFS_U_XI_MAX = 117;
const DBOFS_V_ETA_MAX = 730;
const DBOFS_SURFACE_LEVEL = 9;
const DBOFS_COARSE_ETA_STRIDE = 24;
const DBOFS_COARSE_XI_STRIDE = 6;
const DBOFS_MAX_GRID_DISTANCE_MILES = 15;

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
    const flow = await fetchFlowData(
      grid,
      mode,
      {
        latitude,
        longitude,
      },
    );
    const points = flow.points;

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
        source: flow.source,
        forecast: flow.forecast,
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

async function fetchFlowData(
  requestedPoints: RequestedPoint[],
  mode: FlowMode,
  center: RequestedPoint,
): Promise<FlowFetchResult> {
  if (
    mode === "current" &&
    isLikelyDbofsLocation(center)
  ) {
    try {
      return await fetchDbofsFlowData(
        requestedPoints,
        center,
      );
    } catch (error) {
      /*
       * DBOFS is the preferred Delaware Bay source, but current
       * guidance should not disappear if NOAA's THREDDS/OPeNDAP
       * service is slow or temporarily unavailable.
       */
      console.warn(
        "NOAA DBOFS unavailable; using Open-Meteo current fallback.",
        error,
      );
    }
  }

  const points = await fetchFlowPoints(
    requestedPoints,
    mode,
  );

  return {
    points,
    source:
      mode === "current"
        ? {
            id: "open-meteo",
            label: "Open-Meteo",
            detail:
              "Global ocean-current fallback",
            resolution: "~8 km",
          }
        : {
            id: "open-meteo",
            label: "Open-Meteo",
            detail: "Weather forecast",
            resolution: "forecast grid",
          },
    forecast: [],
  };
}

async function fetchDbofsFlowData(
  requestedPoints: RequestedPoint[],
  center: RequestedPoint,
): Promise<FlowFetchResult> {
  const [gridPoint, timeInfo] =
    await Promise.all([
      findNearestDbofsWaterPoint(
        center,
      ),
      fetchDbofsTimeInfo(),
    ]);

  if (
    gridPoint.distanceMiles >
    DBOFS_MAX_GRID_DISTANCE_MILES
  ) {
    throw new Error(
      `Nearest DBOFS water cell is ${gridPoint.distanceMiles.toFixed(
        1,
      )} miles away.`,
    );
  }

  const nowIndex =
    findNearestTimeIndex(
      timeInfo.validTimes,
      Date.now(),
    );
  const nowTime =
    timeInfo.validTimes[nowIndex];

  if (
    !nowTime ||
    Math.abs(
      nowTime.getTime() -
        Date.now(),
    ) >
      2.5 * 60 * 60 * 1000
  ) {
    throw new Error(
      "DBOFS best-time-series data is not current enough.",
    );
  }

  /*
   * Pull the current hour plus six forecast hours at the selected
   * model cell. The widget uses the first vector now; the remaining
   * vectors are returned so a direction/speed forecast UI can be
   * added without changing the backend again.
   */
  const endIndex = Math.min(
    nowIndex + 6,
    timeInfo.validTimes.length - 1,
  );
  const vectors =
    await fetchDbofsVectors(
      gridPoint,
      nowIndex,
      endIndex,
    );

  if (vectors.length === 0) {
    throw new Error(
      "DBOFS did not return a usable surface-current vector.",
    );
  }

  const currentVector = vectors[0];
  if (!currentVector) {
    throw new Error(
      "DBOFS current vector is missing.",
    );
  }

  const waterMask =
    await fetchWaterMask(
      requestedPoints,
    );

  const points =
    requestedPoints
      .map((point, index) =>
        waterMask[index]
          ? {
              latitude:
                point.latitude,
              longitude:
                point.longitude,
              speedMph:
                currentVector.speedMph,
              directionDegrees:
                currentVector.directionDegrees,
            }
          : null,
      )
      .filter(
        (
          point,
        ): point is FlowPoint =>
          point !== null,
      );

  const forecast =
    vectors.map(
      (vector, offset) => ({
        validAt:
          timeInfo.validTimes[
            nowIndex + offset
          ]?.toISOString() ??
          new Date().toISOString(),
        speedMph:
          vector.speedMph,
        directionDegrees:
          vector.directionDegrees,
      }),
    );

  return {
    points,
    source: {
      id: "noaa-dbofs",
      label: "NOAA DBOFS",
      detail:
        "Delaware Bay high-resolution hydrodynamic model",
      resolution: "~100 m–3 km",
    },
    forecast,
  };
}

async function fetchDbofsTimeInfo(): Promise<{
  validTimes: Date[];
}> {
  const [timeValues, attributes] =
    await Promise.all([
      fetchDapArray(
        "time",
        [],
        undefined,
        900,
      ),
      fetchDbofsText(
        `${DBOFS_DAP_URL}.das`,
        900,
      ),
    ]);

  const origin =
    parseDbofsTimeOrigin(
      attributes,
    );

  const validTimes =
    timeValues
      .filter(
        (value) =>
          Number.isFinite(value),
      )
      .map(
        (hours) =>
          new Date(
            origin.getTime() +
              hours *
                60 *
                60 *
                1000,
          ),
      );

  if (validTimes.length === 0) {
    throw new Error(
      "DBOFS did not provide forecast times.",
    );
  }

  return {
    validTimes,
  };
}

function parseDbofsTimeOrigin(
  attributes: string,
): Date {
  /*
   * The FMRC origin moves as the seven-day aggregation window
   * advances, so it must be read from the dataset attributes rather
   * than hard-coded.
   */
  const timeBlock =
    attributes.match(
      /\btime\s*\{[\s\S]*?\n\s*\}/,
    )?.[0];

  const units =
    timeBlock?.match(
      /\bunits\s+"hours since\s+([^"]+)"/i,
    )?.[1];

  if (!units) {
    throw new Error(
      "Unable to determine DBOFS forecast time origin.",
    );
  }

  const normalized =
    units
      .trim()
      .replace(
        /\s+UTC$/i,
        "Z",
      )
      .replace(
        /^(\d{4}-\d{2}-\d{2})\s+/,
        "$1T",
      );

  const date = new Date(
    normalized,
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new Error(
      `Invalid DBOFS forecast time origin: ${units}`,
    );
  }

  return date;
}

async function findNearestDbofsWaterPoint(
  target: RequestedPoint,
): Promise<DbofsGridPoint> {
  const etaIndices =
    buildIndexRange(
      0,
      DBOFS_ETA_MAX,
      DBOFS_COARSE_ETA_STRIDE,
    );
  const xiIndices =
    buildIndexRange(
      0,
      DBOFS_XI_MAX,
      DBOFS_COARSE_XI_STRIDE,
    );

  const coarseSlices = [
    [
      0,
      DBOFS_COARSE_ETA_STRIDE,
      etaIndices[
        etaIndices.length - 1
      ] ?? 0,
    ],
    [
      0,
      DBOFS_COARSE_XI_STRIDE,
      xiIndices[
        xiIndices.length - 1
      ] ?? 0,
    ],
  ] as DapSlice[];

  const coarseCount =
    etaIndices.length *
    xiIndices.length;

  const [
    coarseLatitudes,
    coarseLongitudes,
  ] = await Promise.all([
    fetchDapArray(
      "lat_rho",
      coarseSlices,
      coarseCount,
      86400,
    ),
    fetchDapArray(
      "lon_rho",
      coarseSlices,
      coarseCount,
      86400,
    ),
  ]);

  let nearestEta =
    etaIndices[0] ?? 0;
  let nearestXi =
    xiIndices[0] ?? 0;
  let nearestDistance =
    Number.POSITIVE_INFINITY;

  for (
    let etaOffset = 0;
    etaOffset <
    etaIndices.length;
    etaOffset += 1
  ) {
    for (
      let xiOffset = 0;
      xiOffset <
      xiIndices.length;
      xiOffset += 1
    ) {
      const valueIndex =
        etaOffset *
          xiIndices.length +
        xiOffset;
      const latitude =
        coarseLatitudes[
          valueIndex
        ];
      const longitude =
        coarseLongitudes[
          valueIndex
        ];

      if (
        !isFiniteNumber(
          latitude,
        ) ||
        !isFiniteNumber(
          longitude,
        )
      ) {
        continue;
      }

      const distance =
        distanceMiles(
          target.latitude,
          target.longitude,
          latitude,
          longitude,
        );

      if (
        distance <
        nearestDistance
      ) {
        nearestDistance =
          distance;
        nearestEta =
          etaIndices[
            etaOffset
          ] ??
          nearestEta;
        nearestXi =
          xiIndices[
            xiOffset
          ] ??
          nearestXi;
      }
    }
  }

  /*
   * The coarse lookup only locates a small neighborhood. Refine at
   * native DBOFS resolution and require the RHO-cell water mask.
   */
  const etaStart = Math.max(
    0,
    nearestEta -
      DBOFS_COARSE_ETA_STRIDE,
  );
  const etaEnd = Math.min(
    DBOFS_ETA_MAX,
    nearestEta +
      DBOFS_COARSE_ETA_STRIDE,
  );
  const xiStart = Math.max(
    0,
    nearestXi -
      DBOFS_COARSE_XI_STRIDE,
  );
  const xiEnd = Math.min(
    DBOFS_XI_MAX,
    nearestXi +
      DBOFS_COARSE_XI_STRIDE,
  );
  const etaCount =
    etaEnd -
    etaStart +
    1;
  const xiCount =
    xiEnd -
    xiStart +
    1;
  const exactCount =
    etaCount * xiCount;
  const exactSlices = [
    [etaStart, 1, etaEnd],
    [xiStart, 1, xiEnd],
  ] as DapSlice[];

  const [
    latitudes,
    longitudes,
    waterMask,
  ] = await Promise.all([
    fetchDapArray(
      "lat_rho",
      exactSlices,
      exactCount,
      86400,
    ),
    fetchDapArray(
      "lon_rho",
      exactSlices,
      exactCount,
      86400,
    ),
    fetchDapArray(
      "mask_rho",
      exactSlices,
      exactCount,
      86400,
    ),
  ]);

  let result:
    | DbofsGridPoint
    | null = null;

  for (
    let etaOffset = 0;
    etaOffset < etaCount;
    etaOffset += 1
  ) {
    for (
      let xiOffset = 0;
      xiOffset < xiCount;
      xiOffset += 1
    ) {
      const index =
        etaOffset *
          xiCount +
        xiOffset;

      if (
        (waterMask[
          index
        ] ?? 0) <
        0.5
      ) {
        continue;
      }

      const latitude =
        latitudes[index];
      const longitude =
        longitudes[index];

      if (
        !isFiniteNumber(
          latitude,
        ) ||
        !isFiniteNumber(
          longitude,
        )
      ) {
        continue;
      }

      const distance =
        distanceMiles(
          target.latitude,
          target.longitude,
          latitude,
          longitude,
        );

      if (
        !result ||
        distance <
          result.distanceMiles
      ) {
        result = {
          eta:
            etaStart +
            etaOffset,
          xi:
            xiStart +
            xiOffset,
          latitude,
          longitude,
          distanceMiles:
            distance,
        };
      }
    }
  }

  if (!result) {
    throw new Error(
      "No DBOFS water cell was found near the selected point.",
    );
  }

  return result;
}

async function fetchDbofsVectors(
  point: DbofsGridPoint,
  startTimeIndex: number,
  endTimeIndex: number,
): Promise<DbofsVector[]> {
  const timeCount =
    endTimeIndex -
    startTimeIndex +
    1;

  const uXiStart = Math.max(
    0,
    point.xi - 1,
  );
  const uXiEnd = Math.min(
    DBOFS_U_XI_MAX,
    point.xi,
  );
  const uPerTime =
    uXiEnd -
    uXiStart +
    1;

  const vEtaStart =
    Math.max(
      0,
      point.eta - 1,
    );
  const vEtaEnd =
    Math.min(
      DBOFS_V_ETA_MAX,
      point.eta,
    );
  const vPerTime =
    vEtaEnd -
    vEtaStart +
    1;

  const [
    uValues,
    vValues,
    angleValues,
  ] = await Promise.all([
    fetchDapArray(
      "u",
      [
        [
          startTimeIndex,
          1,
          endTimeIndex,
        ],
        [
          DBOFS_SURFACE_LEVEL,
          1,
          DBOFS_SURFACE_LEVEL,
        ],
        [
          point.eta,
          1,
          point.eta,
        ],
        [
          uXiStart,
          1,
          uXiEnd,
        ],
      ],
      timeCount *
        uPerTime,
      900,
    ),
    fetchDapArray(
      "v",
      [
        [
          startTimeIndex,
          1,
          endTimeIndex,
        ],
        [
          DBOFS_SURFACE_LEVEL,
          1,
          DBOFS_SURFACE_LEVEL,
        ],
        [
          vEtaStart,
          1,
          vEtaEnd,
        ],
        [
          point.xi,
          1,
          point.xi,
        ],
      ],
      timeCount *
        vPerTime,
      900,
    ),
    fetchDapArray(
      "angle",
      [
        [
          point.eta,
          1,
          point.eta,
        ],
        [
          point.xi,
          1,
          point.xi,
        ],
      ],
      1,
      86400,
    ),
  ]);

  const angle =
    angleValues[0];

  if (
    !isFiniteNumber(
      angle,
    )
  ) {
    throw new Error(
      "DBOFS grid angle is unavailable.",
    );
  }

  const vectors:
    DbofsVector[] = [];

  for (
    let timeOffset = 0;
    timeOffset < timeCount;
    timeOffset += 1
  ) {
    const u =
      averageModelValues(
        uValues.slice(
          timeOffset *
            uPerTime,
          (timeOffset + 1) *
            uPerTime,
        ),
      );
    const v =
      averageModelValues(
        vValues.slice(
          timeOffset *
            vPerTime,
          (timeOffset + 1) *
            vPerTime,
        ),
      );

    if (
      u === null ||
      v === null
    ) {
      continue;
    }

    /*
     * ROMS stores u/v along its curvilinear model grid. Rotate them
     * using the RHO-cell grid angle to get true east/north velocity.
     */
    const east =
      u * Math.cos(angle) -
      v * Math.sin(angle);
    const north =
      u * Math.sin(angle) +
      v * Math.cos(angle);
    const speedMps =
      Math.hypot(
        east,
        north,
      );

    vectors.push({
      speedMph:
        speedMps *
        2.2369362921,
      directionDegrees:
        normalizeDegrees(
          (Math.atan2(
            east,
            north,
          ) *
            180) /
            Math.PI,
        ),
    });
  }

  return vectors;
}

type DapSlice = [
  number,
  number,
  number,
];

async function fetchDapArray(
  variable: string,
  slices: DapSlice[],
  expectedCount:
    | number
    | undefined,
  revalidateSeconds: number,
): Promise<number[]> {
  const constraint =
    `${variable}${slices
      .map(
        ([start, stride, end]) =>
          `[${start}:${stride}:${end}]`,
      )
      .join("")}`;

  /*
   * NOAA's THREDDS server rejects raw square brackets in a query
   * string with HTTP 400. OPeNDAP hyperslab constraints therefore
   * need to be percent-encoded before they are sent.
   */
  const encodedConstraint =
    encodeURIComponent(constraint);

  const text =
    await fetchDbofsText(
      `${DBOFS_DAP_URL}.ascii?${encodedConstraint}`,
      revalidateSeconds,
    );
  const values =
    parseDapAsciiValues(
      text,
      variable,
    );

  if (
    expectedCount !==
      undefined &&
    values.length !==
      expectedCount
  ) {
    throw new Error(
      `DBOFS ${variable} returned ${values.length} values; expected ${expectedCount}.`,
    );
  }

  return values;
}

async function fetchDbofsText(
  url: string,
  revalidateSeconds: number,
): Promise<string> {
  const controller =
    new AbortController();
  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      7000,
    );

  try {
    const response =
      await fetch(url, {
        headers: {
          Accept:
            "text/plain,*/*;q=0.8",
        },
        signal:
          controller.signal,
        next: {
          revalidate:
            revalidateSeconds,
        },
      });

    if (!response.ok) {
      throw new Error(
        `NOAA DBOFS returned ${response.status} ${response.statusText}.`,
      );
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseDapAsciiValues(
  text: string,
  variable: string,
): number[] {
  const values: number[] = [];
  let collecting = false;

  for (const rawLine of
    text.split(/\r?\n/)) {
    const line =
      rawLine.trim();

    if (!line) {
      continue;
    }

    const startsVariable =
      line === variable ||
      line.startsWith(
        `${variable}[`,
      ) ||
      line.startsWith(
        `${variable},`,
      );

    if (startsVariable) {
      collecting = true;
      const comma =
        line.indexOf(",");

      if (comma >= 0) {
        appendDapNumbers(
          line.slice(
            comma + 1,
          ),
          values,
        );
      }

      continue;
    }

    if (!collecting) {
      continue;
    }

    /*
     * Some DAP servers wrap long ASCII array rows. Continuation
     * lines contain only values, while a new variable starts with
     * an identifier.
     */
    if (
      /^[A-Za-z_][A-Za-z0-9_]*(?:\[|,|$)/.test(
        line,
      )
    ) {
      break;
    }

    if (
      /^[-+0-9.NnIi]/.test(
        line,
      )
    ) {
      appendDapNumbers(
        line,
        values,
      );
    }
  }

  if (values.length === 0) {
    throw new Error(
      `Unable to parse DBOFS ${variable} ASCII response.`,
    );
  }

  return values;
}

function appendDapNumbers(
  valueText: string,
  output: number[],
) {
  for (const part of
    valueText.split(",")) {
    const value =
      part.trim();

    if (!value) {
      continue;
    }

    if (
      /^nan$/i.test(value)
    ) {
      output.push(
        Number.NaN,
      );
      continue;
    }

    const parsed =
      Number(value);

    if (
      !Number.isNaN(parsed)
    ) {
      output.push(parsed);
    }
  }
}

function averageModelValues(
  values: number[],
): number | null {
  const usable =
    values.filter(
      (value) =>
        Number.isFinite(
          value,
        ) &&
        Math.abs(value) <
          20,
    );

  if (usable.length === 0) {
    return null;
  }

  return (
    usable.reduce(
      (sum, value) =>
        sum + value,
      0,
    ) /
    usable.length
  );
}

function findNearestTimeIndex(
  times: Date[],
  targetMs: number,
): number {
  let bestIndex = 0;
  let bestDifference =
    Number.POSITIVE_INFINITY;

  times.forEach(
    (time, index) => {
      const difference =
        Math.abs(
          time.getTime() -
            targetMs,
        );

      if (
        difference <
        bestDifference
      ) {
        bestDifference =
          difference;
        bestIndex = index;
      }
    },
  );

  return bestIndex;
}

function buildIndexRange(
  start: number,
  end: number,
  stride: number,
): number[] {
  const indices:
    number[] = [];

  for (
    let value = start;
    value <= end;
    value += stride
  ) {
    indices.push(value);
  }

  return indices;
}

function isLikelyDbofsLocation(
  point: RequestedPoint,
): boolean {
  /*
   * Fast guard only. The nearest-grid distance check is authoritative
   * and prevents locations outside the actual model water domain from
   * being incorrectly labeled DBOFS.
   */
  return (
    point.latitude >=
      38.35 &&
    point.latitude <=
      40.35 &&
    point.longitude >=
      -75.85 &&
    point.longitude <=
      -74.45
  );
}

function distanceMiles(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const radiusMiles =
    3958.7613;
  const toRadians =
    Math.PI / 180;
  const phi1 =
    latitudeA *
    toRadians;
  const phi2 =
    latitudeB *
    toRadians;
  const deltaPhi =
    (latitudeB -
      latitudeA) *
    toRadians;
  const deltaLambda =
    (longitudeB -
      longitudeA) *
    toRadians;

  const a =
    Math.sin(
      deltaPhi / 2,
    ) ** 2 +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(
        deltaLambda / 2,
      ) ** 2;

  return (
    2 *
    radiusMiles *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(
        Math.max(
          0,
          1 - a,
        ),
      ),
    )
  );
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

  const elevations =
    payload.elevation;

  if (!Array.isArray(elevations)) {
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
      elevations[index];

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
