"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type {
  DashboardSource,
  WidgetInstance,
  WidgetSize,
} from "@/types/dashboard";
import type { WeatherLocationSelection } from "@/types/geocoding";
import { mockSources } from "@/lib/mock-data";
import { useWeatherSources } from "@/hooks/useWeatherSources";
import {
  categoryLabels,
  categoryOrder,
  widgetDefinitions,
} from "@/widgets/registry";
import type { WidgetDefinition } from "@/widgets/types";
import { DashboardWidgetCard } from "@/components/dashboard/DashboardWidgetCard";
import { WeatherSourceEditor } from "@/components/sources/WeatherSourceEditor";

const initialWidgets: WidgetInstance[] = [
  {
    id: "initial-temperature",
    widgetKey: "current-temperature",
    category: "weather",
    sourceId: "cape-may-weather",
    title: "Temperature",
    position: 0,
    size: "small",
    settings: {},
  },
  {
    id: "initial-wind-speed",
    widgetKey: "wind-speed",
    category: "wind",
    sourceId: "cape-may-weather",
    title: "Wind Speed",
    position: 1,
    size: "small",
    settings: {},
  },
  {
    id: "initial-next-high-tide",
    widgetKey: "next-high-tide",
    category: "tides",
    sourceId: "cape-may-tides",
    title: "Next High Tide",
    position: 2,
    size: "small",
    settings: {},
  },
];

export function DashboardBuilder() {
  const [dashboardName, setDashboardName] = useState(
    "Cape May Fishing",
  );
  const [sources, setSources] =
    useState<DashboardSource[]>(mockSources);
  const [widgets, setWidgets] =
    useState<WidgetInstance[]>(initialWidgets);

  const weatherStates = useWeatherSources(sources);

  const weatherSource = sources.find(
    (source) => source.kind === "weather-location",
  );

  const orderedWidgets = useMemo(
    () =>
      [...widgets].sort(
        (first, second) =>
          first.position - second.position,
      ),
    [widgets],
  );

  function updateWeatherLocation(
    location: WeatherLocationSelection,
  ) {
    if (!weatherSource) {
      return;
    }

    setSources((current) =>
      current.map((source) =>
        source.id === weatherSource.id
          ? {
              ...source,
              label: location.label,
              latitude: location.latitude,
              longitude: location.longitude,
              timezone: location.timezone,
            }
          : source,
      ),
    );
  }

  function addWidget(definition: WidgetDefinition) {
    const nextWidget = createWidget(definition, sources);

    setWidgets((current) => [
      ...current,
      {
        ...nextWidget,
        position: current.length,
      },
    ]);
  }

  function removeWidget(id: string) {
    setWidgets((current) =>
      normalizePositions(
        current.filter((widget) => widget.id !== id),
      ),
    );
  }

  function moveWidget(id: string, direction: -1 | 1) {
    setWidgets((current) => {
      const ordered = [...current].sort(
        (first, second) =>
          first.position - second.position,
      );
      const currentIndex = ordered.findIndex(
        (widget) => widget.id === id,
      );
      const targetIndex = currentIndex + direction;

      if (
        currentIndex < 0 ||
        targetIndex < 0 ||
        targetIndex >= ordered.length
      ) {
        return current;
      }

      [ordered[currentIndex], ordered[targetIndex]] = [
        ordered[targetIndex],
        ordered[currentIndex],
      ];

      return normalizePositions(ordered);
    });
  }

  function changeWidgetSize(
    id: string,
    size: WidgetSize,
  ) {
    setWidgets((current) =>
      current.map((widget) =>
        widget.id === id ? { ...widget, size } : widget,
      ),
    );
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <Link
              href="/"
              className="text-sm font-medium text-[var(--accent)]"
            >
              Fishing Forecast
            </Link>
            <h1 className="mt-1 text-2xl font-semibold">
              Dashboard Builder
            </h1>
          </div>

          <button
            type="button"
            disabled
            className="rounded-xl bg-[var(--accent)] px-4 py-2 font-medium text-white opacity-60"
            title="Persistence will be added after the builder is stable."
          >
            Save dashboard
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <section className="rounded-2xl border border-[var(--border)] bg-white p-4">
            <label
              htmlFor="dashboard-name"
              className="text-sm font-medium"
            >
              Dashboard name
            </label>
            <input
              id="dashboard-name"
              value={dashboardName}
              onChange={(event) =>
                setDashboardName(event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-[var(--border)] px-3 py-2"
            />
          </section>

          {weatherSource ? (
            <section className="rounded-2xl border border-[var(--border)] bg-white p-4">
              <WeatherSourceEditor
                source={weatherSource}
                onLocationChange={updateWeatherLocation}
              />
            </section>
          ) : null}

          <section className="rounded-2xl border border-[var(--border)] bg-white p-4">
            <h2 className="font-medium">Configured sources</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Tides, waves, and astronomy remain independent.
            </p>

            <ul className="mt-3 space-y-2 text-sm">
              {sources.map((source) => {
                const weatherState =
                  source.kind === "weather-location"
                    ? weatherStates[source.id]
                    : undefined;

                return (
                  <li
                    key={source.id}
                    className="flex items-start justify-between gap-3 rounded-xl bg-[var(--surface-muted)] p-3"
                  >
                    <div>
                      <p className="font-medium">{source.label}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {sourceKindLabel(source.kind)}
                      </p>
                    </div>

                    <SourceStatus
                      isLive={
                        source.kind === "weather-location"
                      }
                      status={weatherState?.status}
                    />
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-white p-4">
            <h2 className="font-medium">Add widgets</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Widgets are atomic, but grouped into categories for
              discovery.
            </p>

            <div className="mt-5 space-y-5">
              {categoryOrder.map((category) => (
                <div key={category}>
                  <h3 className="text-sm font-medium">
                    {categoryLabels[category]}
                  </h3>

                  <div className="mt-2 grid gap-2">
                    {widgetDefinitions
                      .filter(
                        (item) =>
                          item.category === category,
                      )
                      .map((definition) => (
                        <button
                          key={definition.key}
                          type="button"
                          onClick={() =>
                            addWidget(definition)
                          }
                          className="rounded-xl border border-[var(--border)] px-3 py-2 text-left transition hover:border-[var(--accent)] hover:bg-[var(--surface-muted)]"
                        >
                          <span className="block text-sm font-medium">
                            + {definition.name}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
                            {definition.description}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--muted)]">
                Dashboard preview
              </p>
              <h2 className="text-2xl font-semibold">
                {dashboardName || "Untitled dashboard"}
              </h2>
            </div>

            <p className="text-sm text-[var(--muted)]">
              {widgets.length}{" "}
              {widgets.length === 1
                ? "widget"
                : "widgets"}
            </p>
          </div>

          {orderedWidgets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white p-10 text-center">
              <h3 className="font-medium">
                Your dashboard is empty
              </h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Choose a widget from a category to begin.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {orderedWidgets.map((widget, index) => {
                const source =
                  sources.find(
                    (item) =>
                      item.id === widget.sourceId,
                  ) ?? sources[0];

                if (!source) {
                  return null;
                }

                return (
                  <div
                    key={widget.id}
                    className={
                      sizeClassNames[widget.size]
                    }
                  >
                    <DashboardWidgetCard
                      widget={widget}
                      source={source}
                      weatherState={
                        weatherStates[source.id]
                      }
                      canMoveUp={index > 0}
                      canMoveDown={
                        index <
                        orderedWidgets.length - 1
                      }
                      onMoveUp={() =>
                        moveWidget(widget.id, -1)
                      }
                      onMoveDown={() =>
                        moveWidget(widget.id, 1)
                      }
                      onRemove={() =>
                        removeWidget(widget.id)
                      }
                      onSizeChange={(size) =>
                        changeWidgetSize(
                          widget.id,
                          size,
                        )
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SourceStatus({
  isLive,
  status,
}: {
  isLive: boolean;
  status?: "idle" | "loading" | "success" | "error";
}) {
  if (!isLive) {
    return (
      <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs text-[var(--muted)]">
        Mock
      </span>
    );
  }

  const labels = {
    idle: "Waiting",
    loading: "Loading",
    success: "Live",
    error: "Error",
  } as const;

  return (
    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs text-[var(--muted)]">
      {labels[status ?? "idle"]}
    </span>
  );
}

const sizeClassNames: Record<WidgetSize, string> = {
  small: "md:col-span-1 xl:col-span-1",
  medium: "md:col-span-2 xl:col-span-2",
  large: "md:col-span-2 xl:col-span-4",
};

function createWidget(
  definition: WidgetDefinition,
  sources: DashboardSource[],
): WidgetInstance {
  const source = sources.find(
    (candidate) =>
      candidate.kind === definition.sourceKind,
  );

  if (!source) {
    throw new Error(
      `No source available for widget source kind: ${definition.sourceKind}`,
    );
  }

  return {
    id: createId(),
    widgetKey: definition.key,
    category: definition.category,
    sourceId: source.id,
    title: definition.defaultTitle,
    position: 0,
    size: definition.defaultSize,
    settings: {},
  };
}

function createId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    "randomUUID" in globalThis.crypto
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `widget-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function normalizePositions(
  widgets: WidgetInstance[],
): WidgetInstance[] {
  return widgets.map((widget, index) => ({
    ...widget,
    position: index,
  }));
}

function sourceKindLabel(
  kind: DashboardSource["kind"],
): string {
  const labels: Record<
    DashboardSource["kind"],
    string
  > = {
    "weather-location": "Weather & wind location",
    "tide-station": "Tide station",
    "marine-location": "Marine coordinate",
    "astronomy-location": "Moon & sun location",
  };

  return labels[kind];
}
