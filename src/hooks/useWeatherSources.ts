"use client";

import { useEffect, useMemo, useState } from "react";
import type { DashboardSource } from "@/types/dashboard";
import type {
  WeatherSourceData,
  WeatherSourceState,
  WeatherSourceStateMap,
} from "@/types/weather";

type StoredWeatherState = {
  requestKey: string;
  state: WeatherSourceState;
};

type StoredWeatherStateMap = Record<string, StoredWeatherState>;

export function useWeatherSources(
  sources: DashboardSource[],
): WeatherSourceStateMap {
  const [storedStates, setStoredStates] =
    useState<StoredWeatherStateMap>({});

  const weatherSources = useMemo(
    () =>
      sources.filter(
        (source) => source.kind === "weather-location",
      ),
    [sources],
  );

  useEffect(() => {
    const controller = new AbortController();

    for (const source of weatherSources) {
      const requestKey = createRequestKey(source);

      void loadWeatherSource(source, controller.signal)
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
                    : "Unable to load weather.",
              },
            },
          }));
        });
    }

    return () => {
      controller.abort();
    };
  }, [weatherSources]);

  return useMemo(() => {
    const states: WeatherSourceStateMap = {};

    for (const source of weatherSources) {
      const requestKey = createRequestKey(source);
      const stored = storedStates[source.id];

      /*
       * Loading is derived rather than written synchronously inside
       * the effect. A stored response is only used when it matches
       * the source's current coordinates.
       */
      states[source.id] =
        stored?.requestKey === requestKey
          ? stored.state
          : { status: "loading" };
    }

    return states;
  }, [storedStates, weatherSources]);
}

async function loadWeatherSource(
  source: DashboardSource,
  signal: AbortSignal,
): Promise<WeatherSourceData> {
  if (
    typeof source.latitude !== "number" ||
    typeof source.longitude !== "number"
  ) {
    throw new Error(
      `${source.label} does not have valid coordinates.`,
    );
  }

  const search = new URLSearchParams({
    latitude: source.latitude.toString(),
    longitude: source.longitude.toString(),
  });

  const response = await fetch(`/api/weather?${search}`, {
    signal,
    cache: "no-store",
  });

  const body = (await response.json()) as
    | WeatherSourceData
    | { error?: string };

  if (!response.ok) {
    const message =
      "error" in body && body.error
        ? body.error
        : `Weather request failed with status ${response.status}.`;

    throw new Error(message);
  }

  return body as WeatherSourceData;
}

function createRequestKey(source: DashboardSource): string {
  return [
    source.id,
    source.latitude ?? "missing-latitude",
    source.longitude ?? "missing-longitude",
  ].join(":");
}
