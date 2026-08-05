import { NextRequest, NextResponse } from "next/server";
import type { TideStationOption } from "@/types/tide-stations";

const NOAA_STATIONS_URL =
  "https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json";

type NoaaStationResponse = {
  stations?: NoaaStation[];
  stationList?: NoaaStation[];
};

type NoaaStation = {
  id?: string | number;
  name?: string;
  lat?: string | number;
  lng?: string | number;
  latitude?: string | number;
  longitude?: string | number;
  tideType?: string;
  tide_type?: string;
};

export const revalidate = 604800;

export async function GET(request: NextRequest) {
  const query =
    request.nextUrl.searchParams
      .get("query")
      ?.trim()
      .slice(0, 80) ?? "";

  const latitude = parseOptionalNumber(
    request.nextUrl.searchParams.get("latitude"),
  );
  const longitude = parseOptionalNumber(
    request.nextUrl.searchParams.get("longitude"),
  );
  const limit = clampInteger(
    request.nextUrl.searchParams.get("limit"),
    8,
    1,
    20,
  );

  const hasCoordinates =
    latitude !== null &&
    longitude !== null &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  if (query.length < 2 && !hasCoordinates) {
    return NextResponse.json(
      {
        error:
          "Enter a station name or provide a valid reference location.",
      },
      { status: 400 },
    );
  }

  const url = new URL(NOAA_STATIONS_URL);
  url.searchParams.set("type", "tidepredictions");
  url.searchParams.set("units", "english");

  try {
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
        `NOAA station metadata returned ${response.status}.`,
      );
    }

    const body =
      (await response.json()) as NoaaStationResponse;

    const rawStations =
      body.stations ?? body.stationList ?? [];

    const normalized = rawStations
      .map((station) =>
        normalizeStation(
          station,
          hasCoordinates ? latitude : null,
          hasCoordinates ? longitude : null,
        ),
      )
      .filter(
        (
          station,
        ): station is TideStationOption =>
          station !== null,
      );

    const filtered =
      query.length >= 2
        ? normalized.filter((station) =>
            stationMatches(station, query),
          )
        : normalized;

    const sorted = [...filtered].sort(
      (first, second) => {
        if (
          first.distanceMiles !== null &&
          second.distanceMiles !== null
        ) {
          return (
            first.distanceMiles -
            second.distanceMiles
          );
        }

        return first.name.localeCompare(
          second.name,
        );
      },
    );

    return NextResponse.json(
      {
        results: sorted.slice(0, limit),
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=604800, stale-while-revalidate=1209600",
        },
      },
    );
  } catch (error) {
    console.error(
      "Unable to load NOAA tide stations",
      error,
    );

    return NextResponse.json(
      {
        error:
          "NOAA tide-station search is temporarily unavailable.",
      },
      { status: 502 },
    );
  }
}

function normalizeStation(
  station: NoaaStation,
  referenceLatitude: number | null,
  referenceLongitude: number | null,
): TideStationOption | null {
  const id =
    station.id === undefined
      ? ""
      : String(station.id).trim();
  const name = station.name?.trim() ?? "";
  const latitude = toFiniteNumber(
    station.lat ?? station.latitude,
  );
  const longitude = toFiniteNumber(
    station.lng ?? station.longitude,
  );

  if (
    !id ||
    !name ||
    latitude === null ||
    longitude === null
  ) {
    return null;
  }

  const tideType =
    station.tideType?.trim() ||
    station.tide_type?.trim() ||
    null;
  const normalizedTideType =
    tideType?.toLowerCase() ?? "";

  return {
    id,
    name,
    label: `${name} — NOAA ${id}`,
    latitude,
    longitude,
    distanceMiles:
      referenceLatitude !== null &&
      referenceLongitude !== null
        ? haversineMiles(
            referenceLatitude,
            referenceLongitude,
            latitude,
            longitude,
          )
        : null,
    tideType,
    supportsDetailedPredictions:
      !normalizedTideType.includes(
        "subordinate",
      ),
  };
}

function stationMatches(
  station: TideStationOption,
  query: string,
): boolean {
  const normalizedQuery = query.toLowerCase();

  return (
    station.id
      .toLowerCase()
      .includes(normalizedQuery) ||
    station.name
      .toLowerCase()
      .includes(normalizedQuery) ||
    station.label
      .toLowerCase()
      .includes(normalizedQuery)
  );
}

function haversineMiles(
  firstLatitude: number,
  firstLongitude: number,
  secondLatitude: number,
  secondLongitude: number,
): number {
  const earthRadiusMiles = 3958.7613;
  const latitudeDifference = toRadians(
    secondLatitude - firstLatitude,
  );
  const longitudeDifference = toRadians(
    secondLongitude - firstLongitude,
  );

  const firstLatitudeRadians =
    toRadians(firstLatitude);
  const secondLatitudeRadians =
    toRadians(secondLatitude);

  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(firstLatitudeRadians) *
      Math.cos(secondLatitudeRadians) *
      Math.sin(longitudeDifference / 2) ** 2;

  return (
    earthRadiusMiles *
    2 *
    Math.atan2(
      Math.sqrt(haversine),
      Math.sqrt(1 - haversine),
    )
  );
}

function toRadians(value: number): number {
  return value * (Math.PI / 180);
}

function toFiniteNumber(
  value: unknown,
): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function parseOptionalNumber(
  value: string | null,
): number | null {
  if (value === null || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function clampInteger(
  value: string | null,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(minimum, parsed),
  );
}
