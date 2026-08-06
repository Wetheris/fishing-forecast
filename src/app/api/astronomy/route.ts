import { NextRequest, NextResponse } from "next/server";
import {
  Body,
  Illumination,
  MoonPhase,
  Observer,
  SearchRiseSet,
  type AstroTime,
} from "astronomy-engine";
import type {
  AstronomyEvent,
  AstronomySourceData,
} from "@/types/source-data";

export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const latitude = parseCoordinate(
    request.nextUrl.searchParams.get("latitude"),
  );
  const longitude = parseCoordinate(
    request.nextUrl.searchParams.get("longitude"),
  );
  const timezone =
    request.nextUrl.searchParams.get("timezone")?.trim() ||
    "UTC";
  const requestedDate =
    request.nextUrl.searchParams.get("date")?.trim() ||
    formatDateKey(new Date(), timezone);

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

  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
    return NextResponse.json(
      {
        error: "Date must use YYYY-MM-DD format.",
      },
      { status: 400 },
    );
  }

  try {
    assertTimezone(timezone);

    const calculatedAt = new Date();
    const start = zonedDateTimeToUtc(
      requestedDate,
      0,
      0,
      timezone,
    );
    const midday = zonedDateTimeToUtc(
      requestedDate,
      12,
      0,
      timezone,
    );
    const observer = new Observer(
      latitude,
      longitude,
      0,
    );
    const phaseDegrees = normalizeDegrees(
      MoonPhase(midday),
    );
    const illumination = Illumination(
      Body.Moon,
      midday,
    );

    const data: AstronomySourceData = {
      provider: "astronomy-engine",
      calculatedAt: calculatedAt.toISOString(),
      date: requestedDate,
      timezone,
      phaseDegrees,
      phaseName: moonPhaseName(phaseDegrees),
      illuminationPercent:
        illumination.phase_fraction * 100,
      moonrise: findEventForDate({
        body: Body.Moon,
        direction: +1,
        observer,
        start,
        timezone,
        requestedDate,
      }),
      moonset: findEventForDate({
        body: Body.Moon,
        direction: -1,
        observer,
        start,
        timezone,
        requestedDate,
      }),
      sunrise: findEventForDate({
        body: Body.Sun,
        direction: +1,
        observer,
        start,
        timezone,
        requestedDate,
      }),
      sunset: findEventForDate({
        body: Body.Sun,
        direction: -1,
        observer,
        start,
        timezone,
        requestedDate,
      }),
    };

    return NextResponse.json(data, {
      headers: {
        "Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error(
      "Unable to calculate astronomy data",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Astronomy data is temporarily unavailable.",
      },
      { status: 500 },
    );
  }
}

function findEventForDate({
  body,
  direction,
  observer,
  start,
  timezone,
  requestedDate,
}: {
  body: Body;
  direction: 1 | -1;
  observer: Observer;
  start: Date;
  timezone: string;
  requestedDate: string;
}): AstronomyEvent | null {
  let cursor = new Date(start.getTime() - 60_000);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const event = SearchRiseSet(
      body,
      observer,
      direction,
      cursor,
      2,
    );

    if (!event) {
      return null;
    }

    const eventDate = formatDateKey(
      event.date,
      timezone,
    );

    if (eventDate === requestedDate) {
      return formatEvent(event, timezone);
    }

    if (eventDate > requestedDate) {
      return null;
    }

    cursor = new Date(
      event.date.getTime() + 60_000,
    );
  }

  return null;
}

function formatEvent(
  event: AstroTime,
  timezone: string,
): AstronomyEvent {
  const date = event.date;

  return {
    isoTime: date.toISOString(),
    displayTime: new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
    }).format(date),
  };
}

function zonedDateTimeToUtc(
  dateKey: string,
  hour: number,
  minute: number,
  timezone: string,
): Date {
  const [year, month, day] = dateKey
    .split("-")
    .map(Number);
  const desiredAsUtc = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    0,
  );
  let guess = new Date(desiredAsUtc);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = zonedParts(guess, timezone);
    const actualAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      0,
    );
    const difference = desiredAsUtc - actualAsUtc;

    if (difference === 0) {
      break;
    }

    guess = new Date(
      guess.getTime() + difference,
    );
  }

  return guess;
}

function zonedParts(
  date: Date,
  timezone: string,
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function formatDateKey(
  date: Date,
  timezone: string,
): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function moonPhaseName(
  phaseDegrees: number,
): string {
  if (
    phaseDegrees < 22.5 ||
    phaseDegrees >= 337.5
  ) {
    return "New Moon";
  }
  if (phaseDegrees < 67.5) {
    return "Waxing Crescent";
  }
  if (phaseDegrees < 112.5) {
    return "First Quarter";
  }
  if (phaseDegrees < 157.5) {
    return "Waxing Gibbous";
  }
  if (phaseDegrees < 202.5) {
    return "Full Moon";
  }
  if (phaseDegrees < 247.5) {
    return "Waning Gibbous";
  }
  if (phaseDegrees < 292.5) {
    return "Third Quarter";
  }
  return "Waning Crescent";
}

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

function assertTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
    }).format(new Date());
  } catch {
    throw new Error(
      `Invalid timezone: ${timezone}`,
    );
  }
}

function parseCoordinate(
  value: string | null,
): number | null {
  if (value === null || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
