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

  try {
    assertTimezone(timezone);

    const now = new Date();
    const observer = new Observer(
      latitude,
      longitude,
      0,
    );
    const phaseDegrees = normalizeDegrees(
      MoonPhase(now),
    );
    const illumination = Illumination(
      Body.Moon,
      now,
    );

    const data: AstronomySourceData = {
      provider: "astronomy-engine",
      calculatedAt: now.toISOString(),
      timezone,
      phaseDegrees,
      phaseName: moonPhaseName(phaseDegrees),
      illuminationPercent:
        illumination.phase_fraction * 100,
      moonrise: formatEvent(
        SearchRiseSet(
          Body.Moon,
          observer,
          +1,
          now,
          3,
        ),
        timezone,
        now,
      ),
      moonset: formatEvent(
        SearchRiseSet(
          Body.Moon,
          observer,
          -1,
          now,
          3,
        ),
        timezone,
        now,
      ),
      sunrise: formatEvent(
        SearchRiseSet(
          Body.Sun,
          observer,
          +1,
          now,
          3,
        ),
        timezone,
        now,
      ),
      sunset: formatEvent(
        SearchRiseSet(
          Body.Sun,
          observer,
          -1,
          now,
          3,
        ),
        timezone,
        now,
      ),
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

function formatEvent(
  event: AstroTime | null,
  timezone: string,
  now: Date,
): AstronomyEvent | null {
  if (!event) {
    return null;
  }

  const date = event.date;
  const eventDateKey = formatDateKey(
    date,
    timezone,
  );
  const currentDateKey = formatDateKey(
    now,
    timezone,
  );
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  const displayTime =
    eventDateKey === currentDateKey
      ? time
      : `${new Intl.DateTimeFormat("en-US", {
          timeZone: timezone,
          weekday: "short",
        }).format(date)} ${time}`;

  return {
    isoTime: date.toISOString(),
    displayTime,
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
