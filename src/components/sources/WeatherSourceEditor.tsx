"use client";

import { FormEvent, useState } from "react";
import type { DashboardSource } from "@/types/dashboard";
import type {
  GeocodingResult,
  WeatherLocationSelection,
} from "@/types/geocoding";

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; results: GeocodingResult[] }
  | { status: "error"; error: string };

type LocationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string };

export function WeatherSourceEditor({
  source,
  onLocationChange,
}: {
  source: DashboardSource;
  onLocationChange: (location: WeatherLocationSelection) => void;
}) {
  const [query, setQuery] = useState("");
  const [searchState, setSearchState] =
    useState<SearchState>({ status: "idle" });
  const [locationState, setLocationState] =
    useState<LocationState>({ status: "idle" });

  async function searchLocations(event: FormEvent<HTMLFormElement>) {
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
      const response = await fetch(`/api/geocode?${search}`, {
        cache: "no-store",
      });
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

      const results =
        "results" in body ? body.results : [];

      setSearchState({
        status: "success",
        results,
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

  function selectResult(result: GeocodingResult) {
    onLocationChange({
      label: result.label,
      latitude: result.latitude,
      longitude: result.longitude,
      timezone: result.timezone,
    });

    setQuery(result.label);
    setSearchState({ status: "idle" });
    setLocationState({ status: "idle" });
  }

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setLocationState({
        status: "error",
        error:
          "This browser does not support location detection.",
      });
      return;
    }

    setLocationState({ status: "loading" });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const timezone =
          Intl.DateTimeFormat().resolvedOptions().timeZone ||
          "UTC";

        onLocationChange({
          label: `Current location (${latitude.toFixed(
            4,
          )}, ${longitude.toFixed(4)})`,
          latitude,
          longitude,
          timezone,
        });

        setQuery("");
        setSearchState({ status: "idle" });
        setLocationState({ status: "idle" });
      },
      (error) => {
        setLocationState({
          status: "error",
          error: geolocationErrorMessage(error),
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  }

  return (
    <section>
      <h2 className="font-medium">Weather &amp; Wind location</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        These widgets share one weather source and one API request.
      </p>

      <div className="mt-3 rounded-xl bg-[var(--surface-muted)] p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
          Current selection
        </p>
        <p className="mt-1 font-medium">{source.label}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {formatCoordinate(source.latitude)},{" "}
          {formatCoordinate(source.longitude)}
        </p>
      </div>

      <form onSubmit={searchLocations} className="mt-4">
        <label
          htmlFor="weather-location-search"
          className="text-sm font-medium"
        >
          Search by ZIP code or place
        </label>

        <div className="mt-2 flex gap-2">
          <input
            id="weather-location-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="08204 or Cape May, NJ"
            autoComplete="postal-code"
            className="min-w-0 flex-1 rounded-xl border border-[var(--border)] px-3 py-2"
          />
          <button
            type="submit"
            disabled={searchState.status === "loading"}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 font-medium text-white disabled:opacity-60"
          >
            {searchState.status === "loading"
              ? "Searching"
              : "Search"}
          </button>
        </div>
      </form>

      {searchState.status === "error" ? (
        <Message tone="error">{searchState.error}</Message>
      ) : null}

      {searchState.status === "success" ? (
        searchState.results.length > 0 ? (
          <div className="mt-3 grid gap-2" aria-live="polite">
            {searchState.results.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => selectResult(result)}
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-left transition hover:border-[var(--accent)] hover:bg-[var(--surface-muted)]"
              >
                <span className="block text-sm font-medium">
                  {result.label}
                </span>
                <span className="mt-1 block text-xs text-[var(--muted)]">
                  {formatResultDetail(result)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <Message>No matching locations were found.</Message>
        )
      ) : null}

      <div className="mt-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--border)]" />
        <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
          or
        </span>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <button
        type="button"
        onClick={useCurrentLocation}
        disabled={locationState.status === "loading"}
        className="mt-4 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium transition hover:bg-[var(--surface-muted)] disabled:opacity-60"
      >
        {locationState.status === "loading"
          ? "Detecting location…"
          : "Use my current location"}
      </button>

      {locationState.status === "error" ? (
        <Message tone="error">{locationState.error}</Message>
      ) : null}
    </section>
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
          ? "mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          : "mt-3 rounded-xl bg-[var(--surface-muted)] p-3 text-sm text-[var(--muted)]"
      }
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}

function formatResultDetail(result: GeocodingResult): string {
  const parts = [
    result.postcodes.length > 0
      ? `ZIP ${result.postcodes.slice(0, 3).join(", ")}`
      : undefined,
    `${result.latitude.toFixed(4)}, ${result.longitude.toFixed(
      4,
    )}`,
    result.timezone,
  ].filter(
    (part): part is string =>
      typeof part === "string" && part.length > 0,
  );

  return parts.join(" · ");
}

function formatCoordinate(value: number | undefined): string {
  return typeof value === "number" ? value.toFixed(4) : "Unknown";
}

function geolocationErrorMessage(
  error: GeolocationPositionError,
): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location permission was denied. Search by ZIP code or place instead.";
    case error.POSITION_UNAVAILABLE:
      return "Your location could not be determined.";
    case error.TIMEOUT:
      return "Location detection timed out. Please try again.";
    default:
      return "Unable to detect your current location.";
  }
}
