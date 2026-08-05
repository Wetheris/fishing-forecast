"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type {
  DashboardSource,
  WidgetInstance,
  WidgetSize,
} from "@/types/dashboard";
import { mockSources } from "@/lib/mock-data";
import {
  categoryLabels,
  categoryOrder,
  widgetDefinitions,
} from "@/widgets/registry";
import type { WidgetDefinition } from "@/widgets/types";
import { DashboardWidgetCard } from "@/components/dashboard/DashboardWidgetCard";

const initialWidgets: WidgetInstance[] = [
  createWidget(widgetDefinitions[0], mockSources),
  createWidget(
    widgetDefinitions.find((item) => item.key === "wind-speed") ??
      widgetDefinitions[0],
    mockSources,
  ),
  createWidget(
    widgetDefinitions.find((item) => item.key === "next-high-tide") ??
      widgetDefinitions[0],
    mockSources,
  ),
];

export function DashboardBuilder() {
  const [dashboardName, setDashboardName] = useState("Cape May Fishing");
  const [widgets, setWidgets] = useState<WidgetInstance[]>(initialWidgets);

  const orderedWidgets = useMemo(
    () => [...widgets].sort((a, b) => a.position - b.position),
    [widgets],
  );

  function addWidget(definition: WidgetDefinition) {
    const nextWidget = createWidget(definition, mockSources);

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
      normalizePositions(current.filter((widget) => widget.id !== id)),
    );
  }

  function moveWidget(id: string, direction: -1 | 1) {
    setWidgets((current) => {
      const ordered = [...current].sort((a, b) => a.position - b.position);
      const currentIndex = ordered.findIndex((widget) => widget.id === id);
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

  function changeWidgetSize(id: string, size: WidgetSize) {
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
            <h1 className="mt-1 text-2xl font-semibold">Dashboard Builder</h1>
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

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[320px_minmax(0,1fr)]">
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
              onChange={(event) => setDashboardName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--border)] px-3 py-2"
            />

            <div className="mt-4 rounded-xl bg-[var(--surface-muted)] p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                Mock sources
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {mockSources.map((source) => (
                  <li key={source.id}>{source.label}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-white p-4">
            <h2 className="font-medium">Add widgets</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Widgets are atomic, but grouped into categories for discovery.
            </p>

            <div className="mt-5 space-y-5">
              {categoryOrder.map((category) => (
                <div key={category}>
                  <h3 className="text-sm font-medium">
                    {categoryLabels[category]}
                  </h3>

                  <div className="mt-2 grid gap-2">
                    {widgetDefinitions
                      .filter((item) => item.category === category)
                      .map((definition) => (
                        <button
                          key={definition.key}
                          type="button"
                          onClick={() => addWidget(definition)}
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
              {widgets.length} {widgets.length === 1 ? "widget" : "widgets"}
            </p>
          </div>

          {orderedWidgets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white p-10 text-center">
              <h3 className="font-medium">Your dashboard is empty</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Choose a widget from a category to begin.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {orderedWidgets.map((widget, index) => {
                const source =
                  mockSources.find((item) => item.id === widget.sourceId) ??
                  mockSources[0];

                return (
                  <div
                    key={widget.id}
                    className={sizeClassNames[widget.size]}
                  >
                    <DashboardWidgetCard
                      widget={widget}
                      source={source}
                      canMoveUp={index > 0}
                      canMoveDown={index < orderedWidgets.length - 1}
                      onMoveUp={() => moveWidget(widget.id, -1)}
                      onMoveDown={() => moveWidget(widget.id, 1)}
                      onRemove={() => removeWidget(widget.id)}
                      onSizeChange={(size) =>
                        changeWidgetSize(widget.id, size)
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
    (candidate) => candidate.kind === definition.sourceKind,
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

  return `widget-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizePositions(
  widgets: WidgetInstance[],
): WidgetInstance[] {
  return widgets.map((widget, index) => ({
    ...widget,
    position: index,
  }));
}
