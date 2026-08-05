import { NextRequest, NextResponse } from "next/server";
import { fetchOpenMeteoWeather } from "@/providers/weather/open-meteo";

export const revalidate = 900;

export async function GET(request: NextRequest) {
  const latitude = parseCoordinate(
    request.nextUrl.searchParams.get("latitude"),
  );
  const longitude = parseCoordinate(
    request.nextUrl.searchParams.get("longitude"),
  );

  if (latitude === null || latitude < -90 || latitude > 90) {
    return NextResponse.json(
      { error: "A valid latitude between -90 and 90 is required." },
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
    const weather = await fetchOpenMeteoWeather(
      latitude,
      longitude,
    );

    return NextResponse.json(weather, {
      headers: {
        "Cache-Control":
          "public, s-maxage=900, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    console.error("Unable to load Open-Meteo weather", error);

    return NextResponse.json(
      {
        error:
          "Weather data is temporarily unavailable. Please try again.",
      },
      { status: 502 },
    );
  }
}

function parseCoordinate(value: string | null): number | null {
  if (value === null || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}
