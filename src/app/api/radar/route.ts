import { NextRequest, NextResponse } from "next/server";
import type { RadarSourceData } from "@/types/source-data";

const RAINVIEWER_METADATA_URL =
  "https://api.rainviewer.com/public/weather-maps.json";

type RainViewerResponse = {
  generated?: number;
  host?: string;
  radar?: {
    past?: Array<{
      time?: number;
      path?: string;
    }>;
  };
};

export const revalidate = 300;

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
    const response = await fetch(
      RAINVIEWER_METADATA_URL,
      {
        headers: {
          Accept: "application/json",
        },
        next: {
          revalidate: 300,
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `RainViewer returned ${response.status}.`,
      );
    }

    const body =
      (await response.json()) as RainViewerResponse;

    if (
      !body.host ||
      !body.host.startsWith("https://")
    ) {
      throw new Error(
        "RainViewer returned an invalid tile host.",
      );
    }

    const frames = (body.radar?.past ?? [])
      .map((frame) => {
        if (
          typeof frame.time !== "number" ||
          typeof frame.path !== "string" ||
          !frame.path.startsWith("/")
        ) {
          return null;
        }

        return {
          time: frame.time,
          path: frame.path,
          isoTime: new Date(
            frame.time * 1000,
          ).toISOString(),
        };
      })
      .filter(
        (
          frame,
        ): frame is RadarSourceData["frames"][number] =>
          frame !== null,
      )
      .slice(-12);

    if (frames.length === 0) {
      throw new Error(
        "RainViewer returned no radar frames.",
      );
    }

    const data: RadarSourceData = {
      provider: "rainviewer",
      fetchedAt: new Date().toISOString(),
      generatedAt:
        typeof body.generated === "number"
          ? new Date(
              body.generated * 1000,
            ).toISOString()
          : new Date().toISOString(),
      host: body.host,
      requestedLocation: {
        latitude,
        longitude,
      },
      frames,
    };

    return NextResponse.json(data, {
      headers: {
        "Cache-Control":
          "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error(
      "Unable to load radar metadata",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Radar imagery is temporarily unavailable.",
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

  return Number.isFinite(parsed)
    ? parsed
    : null;
}
