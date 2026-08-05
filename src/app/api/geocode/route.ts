import { NextRequest, NextResponse } from "next/server";
import type { GeocodingResult } from "@/types/geocoding";

const OPEN_METEO_GEOCODING_URL =
  "https://geocoding-api.open-meteo.com/v1/search";

type OpenMeteoGeocodingResponse = {
  results?: OpenMeteoGeocodingResult[];
  error?: boolean;
  reason?: string;
};

type OpenMeteoGeocodingResult = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  country?: string;
  country_code?: string;
  admin1?: string;
  admin2?: string;
  postcodes?: string[];
};

export async function GET(request: NextRequest) {
  const query =
    request.nextUrl.searchParams.get("query")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json(
      {
        error:
          "Enter at least two characters, a city, or a ZIP code.",
      },
      { status: 400 },
    );
  }

  const url = new URL(OPEN_METEO_GEOCODING_URL);
  url.searchParams.set("name", query);
  url.searchParams.set("count", "8");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  try {
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
        `Open-Meteo geocoding returned ${response.status}.`,
      );
    }

    const body =
      (await response.json()) as OpenMeteoGeocodingResponse;

    if (body.error) {
      throw new Error(
        body.reason || "The geocoding provider returned an error.",
      );
    }

    const results = (body.results ?? [])
      .map(normalizeResult)
      .filter(
        (result): result is GeocodingResult => result !== null,
      );

    return NextResponse.json(
      { results },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch (error) {
    console.error("Unable to search locations", error);

    return NextResponse.json(
      {
        error:
          "Location search is temporarily unavailable. Please try again.",
      },
      { status: 502 },
    );
  }
}

function normalizeResult(
  result: OpenMeteoGeocodingResult,
): GeocodingResult | null {
  if (
    !Number.isFinite(result.latitude) ||
    !Number.isFinite(result.longitude) ||
    !result.name ||
    !result.timezone
  ) {
    return null;
  }

  return {
    id: String(result.id),
    name: result.name,
    label: formatLocationLabel(result),
    latitude: result.latitude,
    longitude: result.longitude,
    timezone: result.timezone,
    country: result.country,
    countryCode: result.country_code,
    admin1: result.admin1,
    postcodes: result.postcodes ?? [],
  };
}

function formatLocationLabel(
  result: OpenMeteoGeocodingResult,
): string {
  const parts = [
    result.name,
    result.admin1 &&
    result.admin1.toLocaleLowerCase() !==
      result.name.toLocaleLowerCase()
      ? result.admin1
      : undefined,
    result.country,
  ].filter(
    (part): part is string =>
      typeof part === "string" && part.trim().length > 0,
  );

  return [...new Set(parts)].join(", ");
}
