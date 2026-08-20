"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import type { DashboardSource } from "@/types/dashboard";
import type {
  GeocodingResult,
  WeatherLocationSelection,
} from "@/types/geocoding";
import type { MarineSourceStateMap } from "@/types/source-data";

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; results: GeocodingResult[] }
  | { status: "error"; error: string };

export function MarineSourceEditor({
  sources,
  weatherSource,
  marineStates,
  onLocationChange,
}: {
  sources: DashboardSource[];
  weatherSource?: DashboardSource;
  marineStates: MarineSourceStateMap;
  onLocationChange: (
    sourceId: string,
    location: WeatherLocationSelection,
    options?: { followWeather?: boolean },
  ) => void;
}) {
  if (sources.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--border)] p-3 text-sm text-[var(--muted)]">
        No marine source is configured.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {sources.map((source) => (
        <MarineSourceCard
          key={source.id}
          source={source}
          weatherSource={weatherSource}
          status={marineStates[source.id]?.status}
          onLocationChange={onLocationChange}
        />
      ))}
    </div>
  );
}

function MarineSourceCard({
  source,
  weatherSource,
  status,
  onLocationChange,
}: {
  source: DashboardSource;
  weatherSource?: DashboardSource;
  status?: "idle" | "loading" | "success" | "error";
  onLocationChange: (
    sourceId: string,
    location: WeatherLocationSelection,
    options?: { followWeather?: boolean },
  ) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [searchState, setSearchState] =
    useState<SearchState>({ status: "idle" });
  const [label, setLabel] = useState(source.label);
  const [latitude, setLatitude] = useState(
    formatCoordinateInput(source.latitude),
  );
  const [longitude, setLongitude] = useState(
    formatCoordinateInput(source.longitude),
  );
  const [manualError, setManualError] =
    useState<string>();

  const followsWeather =
    source.settings.followWeatherLocation === true;

  useEffect(() => {
    setLabel(source.label);
    setLatitude(formatCoordinateInput(source.latitude));
    setLongitude(formatCoordinateInput(source.longitude));
  }, [
    source.label,
    source.latitude,
    source.longitude,
  ]);

  function useWeatherLocation() {
    if (
      !weatherSource ||
      typeof weatherSource.latitude !== "number" ||
      typeof weatherSource.longitude !== "number"
    ) {
      setManualError(
        "Choose a weather location first.",
      );
      return;
    }

    onLocationChange(
      source.id,
      {
        label: `${weatherSource.label} Marine`,
        latitude: weatherSource.latitude,
        longitude: weatherSource.longitude,
        timezone: weatherSource.timezone ?? "UTC",
      },
      { followWeather: true },
    );

    setEditing(false);
    setSearchState({ status: "idle" });
    setManualError(undefined);
  }

  async function searchLocations(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      setSearchState({
        status: "error",
        error: "Enter a city, place name, or ZIP code.",
      });
      return;
    }

    setSearchState({ status: "loading" });

    try {
      const search = new URLSearchParams({
        query: normalizedQuery,
      });
      const response = await fetch(
        `/api/geocode?${search}`,
        { cache: "no-store" },
      );
      const body = (await response.json()) as
        | { results: GeocodingResult[] }
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in body && body.error
            ? body.error
            : "Unable to search locations.",
        );
      }

      setSearchState({
        status: "success",
        results:
          "results" in body ? body.results : [],
      });
    } catch (error) {
      setSearchState({
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Unable to search locations.",
      });
    }
  }

  function selectSearchResult(
    result: GeocodingResult,
  ) {
    onLocationChange(
      source.id,
      {
        label: `${result.label} Marine`,
        latitude: result.latitude,
        longitude: result.longitude,
        timezone: result.timezone,
      },
      { followWeather: false },
    );

    setQuery(result.label);
    setSearchState({ status: "idle" });
    setEditing(false);
    setManualError(undefined);
  }

  function saveManualCoordinates() {
    const nextLatitude = Number(latitude);
    const nextLongitude = Number(longitude);

    if (
      !Number.isFinite(nextLatitude) ||
      nextLatitude < -90 ||
      nextLatitude > 90
    ) {
      setManualError(
        "Latitude must be a number from -90 to 90.",
      );
      return;
    }

    if (
      !Number.isFinite(nextLongitude) ||
      nextLongitude < -180 ||
      nextLongitude > 180
    ) {
      setManualError(
        "Longitude must be a number from -180 to 180.",
      );
      return;
    }

    const nextLabel =
      label.trim() || "Custom marine location";

    onLocationChange(
      source.id,
      {
        label: nextLabel,
        latitude: nextLatitude,
        longitude: nextLongitude,
        timezone:
          source.timezone ??
          weatherSource?.timezone ??
          "UTC",
      },
      { followWeather: false },
    );

    setEditing(false);
    setSearchState({ status: "idle" });
    setManualError(undefined);
  }

  return (
    <article className="rounded-xl border border-[var(--border)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {source.label}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Wave, swell, and water-temperature coordinate
          </p>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            {formatCoordinate(source.latitude)},{" "}
            {formatCoordinate(source.longitude)}
          </p>
        </div>

        <SourceBadge status={status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={[
            "rounded-full px-2 py-1 text-[11px] font-medium",
            followsWeather
              ? "bg-[var(--selection)] text-[var(--accent)]"
              : "bg-[var(--surface-muted)] text-[var(--muted)]",
          ].join(" ")}
        >
          {followsWeather
            ? "Following weather location"
            : "Custom marine location"}
        </span>

        <button
          type="button"
          onClick={() => setEditing((current) => !current)}
          className="ml-auto rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium hover:bg-[var(--surface-muted)]"
        >
          {editing ? "Close" : "Edit"}
        </button>
      </div>

      {editing ? (
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          <button
            type="button"
            onClick={useWeatherLocation}
            disabled={
              !weatherSource ||
              typeof weatherSource.latitude !== "number" ||
              typeof weatherSource.longitude !== "number"
            }
            className="w-full rounded-xl bg-[var(--selection)] px-3 py-2 text-sm font-medium text-[var(--accent)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Use weather location
          </button>

          <p className="mt-1.5 text-[11px] leading-4 text-[var(--muted)]">
            When linked, changing the Weather &amp; Radar location also moves this marine source.
          </p>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--border)]" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
              custom location
            </span>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <form onSubmit={searchLocations}>
            <label
              htmlFor={`marine-search-${source.id}`}
              className="text-xs font-medium"
            >
              Search by ZIP code or place
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id={`marine-search-${source.id}`}
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value)
                }
                placeholder="Cape May, NJ"
                className="min-w-0 flex-1 rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={searchState.status === "loading"}
                className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-medium hover:bg-[var(--surface-muted)] disabled:opacity-60"
              >
                {searchState.status === "loading"
                  ? "Searching"
                  : "Search"}
              </button>
            </div>
          </form>

          {searchState.status === "error" ? (
            <Message tone="error">
              {searchState.error}
            </Message>
          ) : null}

          {searchState.status === "success" ? (
            searchState.results.length > 0 ? (
              <div className="mt-2 grid gap-2">
                {searchState.results.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() =>
                      selectSearchResult(result)
                    }
                    className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-left hover:border-[var(--accent)] hover:bg-[var(--surface-muted)]"
                  >
                    <span className="block text-xs font-medium">
                      {result.label}
                    </span>
                    <span className="mt-1 block text-[10px] text-[var(--muted)]">
                      {result.latitude.toFixed(4)},{" "}
                      {result.longitude.toFixed(4)}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <Message>
                No matching locations were found.
              </Message>
            )
          ) : null}

          <div className="mt-4 grid gap-2">
            <label className="block">
              <span className="text-xs font-medium">
                Label
              </span>
              <input
                value={label}
                onChange={(event) =>
                  setLabel(event.target.value)
                }
                className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
                placeholder="Cape May Offshore"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs font-medium">
                  Latitude
                </span>
                <input
                  inputMode="decimal"
                  value={latitude}
                  onChange={(event) =>
                    setLatitude(event.target.value)
                  }
                  className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
                  placeholder="38.9100"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium">
                  Longitude
                </span>
                <input
                  inputMode="decimal"
                  value={longitude}
                  onChange={(event) =>
                    setLongitude(event.target.value)
                  }
                  className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
                  placeholder="-74.8900"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={saveManualCoordinates}
              className="mt-1 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white"
            >
              Save custom coordinates
            </button>
          </div>

          {manualError ? (
            <Message tone="error">
              {manualError}
            </Message>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function SourceBadge({
  status,
}: {
  status?: "idle" | "loading" | "success" | "error";
}) {
  const text =
    status === "success"
      ? "Marine live"
      : status === "error"
        ? "Source error"
        : status === "loading"
          ? "Loading"
          : "Waiting";

  return (
    <span
      className={[
        "inline-block shrink-0 rounded-full px-2 py-1 text-xs",
        status === "error"
          ? "bg-red-50 text-red-700"
          : status === "success"
            ? "bg-emerald-50 text-emerald-700"
            : "bg-[var(--surface-muted)] text-[var(--muted)]",
      ].join(" ")}
    >
      {text}
    </span>
  );
}

function Message({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "error";
}) {
  return (
    <p
      className={
        tone === "error"
          ? "mt-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-800"
          : "mt-2 rounded-xl bg-[var(--surface-muted)] p-2.5 text-xs text-[var(--muted)]"
      }
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}

function formatCoordinate(
  value: number | undefined,
): string {
  return typeof value === "number"
    ? value.toFixed(4)
    : "Unknown";
}

function formatCoordinateInput(
  value: number | undefined,
): string {
  return typeof value === "number"
    ? String(value)
    : "";
}
