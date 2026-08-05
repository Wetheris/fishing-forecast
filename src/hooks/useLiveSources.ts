"use client";

import { useEffect, useMemo, useState } from "react";
import type { DashboardSource } from "@/types/dashboard";
import type {
  AstronomySourceData,
  AstronomySourceStateMap,
  LiveSourceState,
  LiveSourceStateMap,
  MarineSourceData,
  MarineSourceStateMap,
  RadarSourceData,
  RadarSourceStateMap,
  TideSourceData,
  TideSourceStateMap,
} from "@/types/source-data";

type StoredSourceState<TData> = {
  requestKey: string;
  state: LiveSourceState<TData>;
};

type StoredSourceStateMap<TData> = Record<
  string,
  StoredSourceState<TData>
>;

type LiveKind =
  | "weather-location"
  | "tide-station"
  | "marine-location"
  | "astronomy-location";

export function useTideSources(
  sources: DashboardSource[],
): TideSourceStateMap {
  return useLiveSourceStates<TideSourceData>(
    sources,
    "tide-station",
    buildTideUrl,
  );
}

export function useMarineSources(
  sources: DashboardSource[],
): MarineSourceStateMap {
  return useLiveSourceStates<MarineSourceData>(
    sources,
    "marine-location",
    buildMarineUrl,
  );
}

export function useAstronomySources(
  sources: DashboardSource[],
): AstronomySourceStateMap {
  return useLiveSourceStates<AstronomySourceData>(
    sources,
    "astronomy-location",
    buildAstronomyUrl,
  );
}

export function useRadarSources(
  sources: DashboardSource[],
): RadarSourceStateMap {
  return useLiveSourceStates<RadarSourceData>(
    sources,
    "weather-location",
    buildRadarUrl,
  );
}

function useLiveSourceStates<TData>(
  sources: DashboardSource[],
  kind: LiveKind,
  buildUrl: (source: DashboardSource) => string,
): LiveSourceStateMap<TData> {
  const [storedStates, setStoredStates] =
    useState<StoredSourceStateMap<TData>>({});

  const matchingSources = useMemo(
    () =>
      sources.filter(
        (source) => source.kind === kind,
      ),
    [kind, sources],
  );

  useEffect(() => {
    const controller = new AbortController();

    for (const source of matchingSources) {
      const requestKey =
        createRequestKey(source);

      void loadSource<TData>(
        buildUrl(source),
        controller.signal,
      )
        .then((data) => {
          if (controller.signal.aborted) {
            return;
          }

          setStoredStates((current) => ({
            ...current,
            [source.id]: {
              requestKey,
              state: {
                status: "success",
                data,
              },
            },
          }));
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) {
            return;
          }

          setStoredStates((current) => ({
            ...current,
            [source.id]: {
              requestKey,
              state: {
                status: "error",
                error:
                  error instanceof Error
                    ? error.message
                    : "Unable to load source data.",
              },
            },
          }));
        });
    }

    return () => {
      controller.abort();
    };
  }, [buildUrl, matchingSources]);

  return useMemo(() => {
    const states: LiveSourceStateMap<TData> = {};

    for (const source of matchingSources) {
      const requestKey =
        createRequestKey(source);
      const stored = storedStates[source.id];

      states[source.id] =
        stored?.requestKey === requestKey
          ? stored.state
          : { status: "loading" };
    }

    return states;
  }, [matchingSources, storedStates]);
}

async function loadSource<TData>(
  url: string,
  signal: AbortSignal,
): Promise<TData> {
  const response = await fetch(url, {
    signal,
    cache: "no-store",
  });

  const body = (await response.json()) as
    | TData
    | { error?: string };

  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : `Source request failed with status ${response.status}.`;

    throw new Error(message);
  }

  return body as TData;
}

function buildTideUrl(
  source: DashboardSource,
): string {
  if (!source.externalId) {
    throw new Error(
      `${source.label} does not have a NOAA station ID.`,
    );
  }

  const search = new URLSearchParams({
    station: source.externalId,
    timezone:
      source.timezone ?? "America/New_York",
    datum: stringSetting(
      source,
      "datum",
      "MLLW",
    ),
  });

  const distanceMiles = numberSetting(
    source,
    "distanceMiles",
  );

  if (distanceMiles !== null) {
    search.set(
      "distanceMiles",
      distanceMiles.toString(),
    );
  }

  return `/api/tides?${search}`;
}

function buildMarineUrl(
  source: DashboardSource,
): string {
  assertCoordinates(source);

  const search = new URLSearchParams({
    latitude: source.latitude.toString(),
    longitude: source.longitude.toString(),
  });

  return `/api/marine?${search}`;
}

function buildAstronomyUrl(
  source: DashboardSource,
): string {
  assertCoordinates(source);

  const search = new URLSearchParams({
    latitude: source.latitude.toString(),
    longitude: source.longitude.toString(),
    timezone: source.timezone ?? "UTC",
  });

  return `/api/astronomy?${search}`;
}

function buildRadarUrl(
  source: DashboardSource,
): string {
  assertCoordinates(source);

  const search = new URLSearchParams({
    latitude: source.latitude.toString(),
    longitude: source.longitude.toString(),
  });

  return `/api/radar?${search}`;
}

function createRequestKey(
  source: DashboardSource,
): string {
  return JSON.stringify({
    id: source.id,
    kind: source.kind,
    providerKey: source.providerKey,
    latitude: source.latitude,
    longitude: source.longitude,
    timezone: source.timezone,
    externalId: source.externalId,
    settings: source.settings,
  });
}

function assertCoordinates(
  source: DashboardSource,
): asserts source is DashboardSource & {
  latitude: number;
  longitude: number;
} {
  if (
    typeof source.latitude !== "number" ||
    typeof source.longitude !== "number"
  ) {
    throw new Error(
      `${source.label} does not have valid coordinates.`,
    );
  }
}

function stringSetting(
  source: DashboardSource,
  key: string,
  fallback: string,
): string {
  const value = source.settings[key];

  return typeof value === "string"
    ? value
    : fallback;
}

function numberSetting(
  source: DashboardSource,
  key: string,
): number | null {
  const value = source.settings[key];

  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : null;
}
