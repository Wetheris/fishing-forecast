import { NextRequest, NextResponse } from "next/server";
import { fetchOpenMeteoMarine } from "@/providers/marine/open-meteo";

export const revalidate = 1800;

export async function GET(request: NextRequest) {
  const latitude = parseCoordinate(
    request.nextUrl.searchParams.get("latitude"),
  );
  const longitude = parseCoordinate(
    request.nextUrl.searchParams.get("longitude"),
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

  try {
    const marine = await fetchOpenMeteoMarine(
      latitude,
      longitude,
    );

    return NextResponse.json(marine, {
      headers: {
        "Cache-Control":
          "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error(
      "Unable to load Open-Meteo Marine data",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Marine data is temporarily unavailable.",
      },
      { status: 502 },
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
