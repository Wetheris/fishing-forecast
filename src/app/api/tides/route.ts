import { NextRequest, NextResponse } from "next/server";
import type {
  TideEvent,
  TideSourceData,
  TideTimelinePoint,
} from "@/types/source-data";

const NOAA_DATA_URL =
  "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter";
const NOAA_METADATA_URL =
  "https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations";

type NoaaPrediction = {
  t: string;
  v: string;
  type?: "H" | "L";
};

type NoaaPredictionResponse = {
  predictions?: NoaaPrediction[];
  error?: {
    message?: string;
  };
};

type NoaaStationResponse = {
  stations?: Array<{
    id?: string;
    name?: string;
    lat?: number | string;
    lng?: number | string;
  }>;
};

export const revalidate = 21600;

export async function GET(request: NextRequest) {
  const station =
    request.nextUrl.searchParams.get("station")?.trim() ??
    "";
  const timezone =
    request.nextUrl.searchParams.get("timezone")?.trim() ||
    "America/New_York";
  const datum =
    request.nextUrl.searchParams.get("datum")?.trim() ||
    "MLLW";
  const distanceMiles = parseOptionalNumber(
    request.nextUrl.searchParams.get("distanceMiles"),
  );

  if (!/^[A-Za-z0-9-]{4,20}$/.test(station)) {
    return NextResponse.json(
      { error: "A valid NOAA tide station ID is required." },
      { status: 400 },
    );
  }

  try {
    const now = new Date();
    const currentLocalTime = formatLocalKey(
      now,
      timezone,
    );
    const beginDate = currentLocalTime
      .slice(0, 10)
      .replaceAll("-", "");

    const [highLowRaw, timelineRaw, stationRaw] =
      await Promise.all([
        fetchNoaaPredictions({
          station,
          datum,
          beginDate,
          rangeHours: 96,
          interval: "hilo",
        }),
        fetchNoaaPredictions({
          station,
          datum,
          beginDate,
          rangeHours: 72,
          interval: "6",
        }).catch((error: unknown) => {
          console.warn(
            `NOAA detailed predictions unavailable for ${station}`,
            error,
          );
          return [] as NoaaPrediction[];
        }),
        fetchStationMetadata(station).catch(
          (error: unknown) => {
            console.warn(
              `NOAA station metadata unavailable for ${station}`,
              error,
            );
            return null;
          },
        ),
      ]);

    const allEvents = highLowRaw
      .map(normalizeEvent)
      .filter(
        (event): event is TideEvent => event !== null,
      )
      .sort((a, b) =>
        a.localTime.localeCompare(b.localTime),
      );

    if (allEvents.length === 0) {
      throw new Error(
        "NOAA returned no tide predictions for this station.",
      );
    }

    const futureEvents = allEvents.filter(
      (event) => event.localTime > currentLocalTime,
    );
    const priorEvent = allEvents
      .filter(
        (event) => event.localTime <= currentLocalTime,
      )
      .at(-1);

    const events = [
      ...(priorEvent ? [priorEvent] : []),
      ...futureEvents.slice(0, 4),
    ];

    const nextTurn = futureEvents[0] ?? null;
    const nextHigh =
      futureEvents.find(
        (event) => event.type === "high",
      ) ?? null;
    const nextLow =
      futureEvents.find(
        (event) => event.type === "low",
      ) ?? null;

    const completeTimeline = timelineRaw
      .map(normalizeTimelinePoint)
      .filter(
        (
          point,
        ): point is TideTimelinePoint =>
          point !== null,
      )
      .sort((a, b) =>
        a.localTime.localeCompare(b.localTime),
      );

    const timelineStart =
      events[0]?.localTime ?? currentLocalTime;
    const timelineEnd =
      events.at(-1)?.localTime ??
      futureEvents.at(2)?.localTime ??
      currentLocalTime;

    const timeline = completeTimeline.filter(
      (point) =>
        point.localTime >= timelineStart &&
        point.localTime <= timelineEnd,
    );

    const currentHeightFt =
      interpolateCurrentHeight(
        completeTimeline,
        currentLocalTime,
      );

    const data: TideSourceData = {
      provider: "noaa-coops",
      fetchedAt: new Date().toISOString(),
      datum,
      currentLocalTime,
      currentHeightFt,
      currentTrend: getTrend(
        nextTurn,
        completeTimeline,
        currentLocalTime,
      ),
      minutesUntilTurn: nextTurn
        ? Math.max(
            0,
            Math.round(
              (localKeyToMilliseconds(
                nextTurn.localTime,
              ) -
                localKeyToMilliseconds(
                  currentLocalTime,
                )) /
                60000,
            ),
          )
        : null,
      station: {
        id: station,
        name: stationRaw?.name ?? `NOAA ${station}`,
        latitude: toFiniteNumber(
          stationRaw?.lat,
        ),
        longitude: toFiniteNumber(
          stationRaw?.lng,
        ),
        distanceMiles,
      },
      nextHigh,
      nextLow,
      events,
      timeline,
    };

    return NextResponse.json(data, {
      headers: {
        "Cache-Control":
          "public, s-maxage=21600, stale-while-revalidate=43200",
      },
    });
  } catch (error) {
    console.error("Unable to load NOAA tides", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Tide predictions are temporarily unavailable.",
      },
      { status: 502 },
    );
  }
}

async function fetchNoaaPredictions({
  station,
  datum,
  beginDate,
  rangeHours,
  interval,
}: {
  station: string;
  datum: string;
  beginDate: string;
  rangeHours: number;
  interval: "hilo" | "6";
}): Promise<NoaaPrediction[]> {
  const url = new URL(NOAA_DATA_URL);

  url.searchParams.set("product", "predictions");
  url.searchParams.set(
    "application",
    "fishing_forecast_dashboard",
  );
  url.searchParams.set("begin_date", beginDate);
  url.searchParams.set(
    "range",
    rangeHours.toString(),
  );
  url.searchParams.set("datum", datum);
  url.searchParams.set("station", station);
  url.searchParams.set("time_zone", "lst_ldt");
  url.searchParams.set("units", "english");
  url.searchParams.set("interval", interval);
  url.searchParams.set("format", "json");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: 21600,
    },
  });

  if (!response.ok) {
    throw new Error(
      `NOAA returned ${response.status} ${response.statusText}.`,
    );
  }

  const body =
    (await response.json()) as NoaaPredictionResponse;

  if (body.error?.message) {
    throw new Error(body.error.message);
  }

  return body.predictions ?? [];
}

async function fetchStationMetadata(
  station: string,
): Promise<
  NonNullable<NoaaStationResponse["stations"]>[number] | null
> {
  const url = `${NOAA_METADATA_URL}/${encodeURIComponent(
    station,
  )}.json`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: 604800,
    },
  });

  if (!response.ok) {
    throw new Error(
      `NOAA metadata returned ${response.status}.`,
    );
  }

  const body =
    (await response.json()) as NoaaStationResponse;

  return body.stations?.[0] ?? null;
}

function normalizeEvent(
  prediction: NoaaPrediction,
): TideEvent | null {
  const heightFt = Number(prediction.v);

  if (
    !isLocalKey(prediction.t) ||
    !Number.isFinite(heightFt) ||
    (prediction.type !== "H" &&
      prediction.type !== "L")
  ) {
    return null;
  }

  return {
    localTime: prediction.t,
    displayTime: formatClockFromLocalKey(
      prediction.t,
    ),
    type:
      prediction.type === "H" ? "high" : "low",
    heightFt,
  };
}

function normalizeTimelinePoint(
  prediction: NoaaPrediction,
): TideTimelinePoint | null {
  const heightFt = Number(prediction.v);

  if (
    !isLocalKey(prediction.t) ||
    !Number.isFinite(heightFt)
  ) {
    return null;
  }

  return {
    localTime: prediction.t,
    heightFt,
  };
}

function getTrend(
  nextTurn: TideEvent | null,
  timeline: TideTimelinePoint[],
  currentLocalTime: string,
): TideSourceData["currentTrend"] {
  const previousIndex = findPreviousIndex(
    timeline,
    currentLocalTime,
  );

  if (
    previousIndex >= 0 &&
    previousIndex + 1 < timeline.length
  ) {
    const difference =
      timeline[previousIndex + 1].heightFt -
      timeline[previousIndex].heightFt;

    if (difference > 0.005) return "rising";
    if (difference < -0.005) return "falling";
    return "steady";
  }

  if (nextTurn?.type === "high") return "rising";
  if (nextTurn?.type === "low") return "falling";
  return "unknown";
}

function interpolateCurrentHeight(
  timeline: TideTimelinePoint[],
  currentLocalTime: string,
): number | null {
  const previousIndex = findPreviousIndex(
    timeline,
    currentLocalTime,
  );

  if (previousIndex < 0) {
    return timeline[0]?.heightFt ?? null;
  }

  const previous = timeline[previousIndex];
  const next = timeline[previousIndex + 1];

  if (!next) {
    return previous.heightFt;
  }

  const previousTime = localKeyToMilliseconds(
    previous.localTime,
  );
  const nextTime = localKeyToMilliseconds(
    next.localTime,
  );
  const currentTime = localKeyToMilliseconds(
    currentLocalTime,
  );
  const range = Math.max(1, nextTime - previousTime);
  const progress = Math.min(
    1,
    Math.max(0, (currentTime - previousTime) / range),
  );

  return (
    previous.heightFt +
    (next.heightFt - previous.heightFt) *
      progress
  );
}

function findPreviousIndex(
  timeline: TideTimelinePoint[],
  currentLocalTime: string,
): number {
  let previousIndex = -1;

  for (
    let index = 0;
    index < timeline.length;
    index += 1
  ) {
    if (
      timeline[index].localTime <= currentLocalTime
    ) {
      previousIndex = index;
    } else {
      break;
    }
  }

  return previousIndex;
}

function formatLocalKey(
  date: Date,
  timezone: string,
): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`;
}

function formatClockFromLocalKey(
  localTime: string,
): string {
  const match = localTime.match(
    /^\d{4}-\d{2}-\d{2} (\d{2}):(\d{2})$/,
  );

  if (!match) {
    return localTime;
  }

  const hour = Number(match[1]);
  const minute = match[2];
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minute} ${suffix}`;
}

function localKeyToMilliseconds(
  localTime: string,
): number {
  const match = localTime.match(
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/,
  );

  if (!match) {
    return 0;
  }

  return Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  );
}

function isLocalKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(
    value,
  );
}

function toFiniteNumber(
  value: number | string | undefined,
): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalNumber(
  value: string | null,
): number | null {
  if (value === null || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
