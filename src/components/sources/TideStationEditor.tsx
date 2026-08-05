"use client";

import { FormEvent, useState } from "react";
import type {
  DashboardSource,
  WidgetInstance,
} from "@/types/dashboard";
import type {
  TideSourceStateMap,
} from "@/types/source-data";
import type { TideStationOption } from "@/types/tide-stations";

type SearchState =
  | {
      status: "idle";
    }
  | {
      status: "loading";
    }
  | {
      status: "success";
      results: TideStationOption[];
    }
  | {
      status: "error";
      error: string;
    };

export function TideStationEditor({
  sources,
  widgets,
  referenceSource,
  tideStates,
  onAddSource,
  onRemoveSource,
}: {
  sources: DashboardSource[];
  widgets: WidgetInstance[];
  referenceSource?: DashboardSource;
  tideStates: TideSourceStateMap;
  onAddSource: (
    station: TideStationOption,
  ) => void;
  onRemoveSource: (sourceId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [searchState, setSearchState] =
    useState<SearchState>({
      status: "idle",
    });

  const tideSources = sources.filter(
    (source) => source.kind === "tide-station",
  );

  async function searchStations(
    event?: FormEvent<HTMLFormElement>,
    queryOverride?: string,
  ) {
    event?.preventDefault();

    const search = new URLSearchParams({
      limit: "10",
    });
    const normalizedQuery = (
      queryOverride ?? query
    ).trim();

    if (normalizedQuery.length >= 2) {
      search.set("query", normalizedQuery);
    }

    if (
      typeof referenceSource?.latitude ===
        "number" &&
      typeof referenceSource?.longitude ===
        "number"
    ) {
      search.set(
        "latitude",
        referenceSource.latitude.toString(),
      );
      search.set(
        "longitude",
        referenceSource.longitude.toString(),
      );
    }

    if (
      normalizedQuery.length < 2 &&
      !search.has("latitude")
    ) {
      setSearchState({
        status: "error",
        error:
          "Enter a station name or configure a weather location first.",
      });
      return;
    }

    setSearchState({
      status: "loading",
    });

    try {
      const response = await fetch(
        `/api/tide-stations?${search}`,
        {
          cache: "no-store",
        },
      );
      const body = (await response.json()) as
        | {
            results: TideStationOption[];
          }
        | {
            error?: string;
          };

      if (!response.ok) {
        throw new Error(
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "Unable to search tide stations.",
        );
      }

      setSearchState({
        status: "success",
        results:
          "results" in body
            ? body.results
            : [],
      });
    } catch (error) {
      setSearchState({
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Unable to search tide stations.",
      });
    }
  }

  return (
    <section>
      <h3 className="font-medium">
        NOAA tide stations
      </h3>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Add multiple stations, then select the source
        independently for each tide widget.
      </p>

      <div className="mt-4 space-y-3">
        {tideSources.map((source) => {
          const usageCount = widgets.filter(
            (widget) =>
              widget.sourceId === source.id,
          ).length;
          const state = tideStates[source.id];

          return (
            <article
              key={source.id}
              className="rounded-xl border border-[var(--border)] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {source.label}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    NOAA {source.externalId}
                    {formatDistance(source)}
                  </p>
                </div>

                <StatusBadge
                  status={state?.status}
                />
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-[var(--muted)]">
                  Used by {usageCount}{" "}
                  {usageCount === 1
                    ? "widget"
                    : "widgets"}
                </span>
                <button
                  type="button"
                  disabled={usageCount > 0}
                  onClick={() =>
                    onRemoveSource(source.id)
                  }
                  className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title={
                    usageCount > 0
                      ? "Reassign widgets before removing this source."
                      : "Remove source"
                  }
                >
                  Remove
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <form
        onSubmit={searchStations}
        className="mt-5"
      >
        <label
          htmlFor="tide-station-search"
          className="text-sm font-medium"
        >
          Find another station
        </label>
        <input
          id="tide-station-search"
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          placeholder="Station name or NOAA ID"
          className="mt-2 w-full rounded-xl border border-[var(--border)] px-3 py-2"
        />

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="submit"
            disabled={
              searchState.status === "loading"
            }
            className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {searchState.status === "loading"
              ? "Searching"
              : "Search"}
          </button>

          <button
            type="button"
            disabled={
              searchState.status === "loading" ||
              typeof referenceSource?.latitude !==
                "number" ||
              typeof referenceSource?.longitude !==
                "number"
            }
            onClick={() => {
              setQuery("");
              void searchStations(
                undefined,
                "",
              );
            }}
            className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[var(--surface-muted)] disabled:opacity-40"
          >
            Find nearest
          </button>
        </div>
      </form>

      {referenceSource ? (
        <p className="mt-2 text-xs text-[var(--muted)]">
          Distances are measured from{" "}
          {referenceSource.label}.
        </p>
      ) : null}

      {searchState.status === "error" ? (
        <p
          className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {searchState.error}
        </p>
      ) : null}

      {searchState.status === "success" ? (
        <div className="mt-4 space-y-2">
          {searchState.results.length === 0 ? (
            <p className="rounded-xl bg-[var(--surface-muted)] p-3 text-sm text-[var(--muted)]">
              No matching tide stations were found.
            </p>
          ) : (
            searchState.results.map((station) => {
              const alreadyAdded =
                tideSources.some(
                  (source) =>
                    source.externalId ===
                    station.id,
                );

              return (
                <article
                  key={station.id}
                  className="rounded-xl border border-[var(--border)] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {station.name}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        NOAA {station.id}
                        {station.distanceMiles !==
                        null
                          ? ` · ${station.distanceMiles.toFixed(
                              1,
                            )} mi`
                          : ""}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {station.tideType ??
                          "Tide-prediction station"}
                        {station.supportsDetailedPredictions
                          ? " · Detailed curve supported"
                          : " · High/low predictions"}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() =>
                        onAddSource(station)
                      }
                      className="shrink-0 rounded-lg border border-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--selection)] disabled:border-[var(--border)] disabled:text-[var(--muted)] disabled:opacity-60"
                    >
                      {alreadyAdded
                        ? "Added"
                        : "Add"}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      ) : null}
    </section>
  );
}

function StatusBadge({
  status,
}: {
  status?:
    | "idle"
    | "loading"
    | "success"
    | "error";
}) {
  const label =
    status === "success"
      ? "NOAA live"
      : status === "error"
        ? "Error"
        : status === "loading"
          ? "Loading"
          : "Waiting";

  return (
    <span
      className={[
        "shrink-0 rounded-full px-2 py-1 text-xs",
        status === "success"
          ? "bg-emerald-50 text-emerald-700"
          : status === "error"
            ? "bg-red-50 text-red-700"
            : "bg-[var(--surface-muted)] text-[var(--muted)]",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function formatDistance(
  source: DashboardSource,
): string {
  const value =
    source.settings.distanceMiles;

  return typeof value === "number" &&
    Number.isFinite(value)
    ? ` · ${value.toFixed(1)} mi`
    : "";
}
