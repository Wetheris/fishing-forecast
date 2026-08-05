"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  DashboardLayout,
  FishingDashboard,
  LayoutDevice,
  WidgetInstance,
  WidgetPlacement,
} from "@/types/dashboard";
import type { WeatherLocationSelection } from "@/types/geocoding";
import { useWeatherSources } from "@/hooks/useWeatherSources";
import {
  addWidgetToLayout,
  applyPreset,
  autoArrangeLayout,
  createInitialDashboard,
  createLayoutFromPreset,
  createMobileLayoutFromDesktop,
  createWidgetInstance,
  getRecommendedPreset,
  layoutPresets,
  normalizePlacementsForLayout,
} from "@/lib/dashboard-layouts";
import type { WidgetDefinition } from "@/widgets/types";
import {
  BuilderToolbar,
  type BuilderPanel,
} from "@/components/builder/BuilderToolbar";
import {
  BuilderPreview,
  type PreviewZoom,
} from "@/components/builder/BuilderPreview";

export function DashboardBuilder() {
  const [dashboard, setDashboard] =
    useState<FishingDashboard>(() =>
      createInitialDashboard(),
    );
  const [activeLayoutId, setActiveLayoutId] =
    useState(dashboard.layouts[0].id);
  const [panel, setPanel] =
    useState<BuilderPanel>("layouts");
  const [selectedWidgetId, setSelectedWidgetId] =
    useState<string>();
  const [mode, setMode] =
    useState<"edit" | "view">("edit");
  const [zoom, setZoom] =
    useState<PreviewZoom>("fit");
  const [showGrid, setShowGrid] = useState(true);

  const weatherStates = useWeatherSources(
    dashboard.sources,
  );

  const activeLayout =
    dashboard.layouts.find(
      (layout) => layout.id === activeLayoutId,
    ) ?? dashboard.layouts[0];

  const selectedWidget = dashboard.widgets.find(
    (widget) => widget.id === selectedWidgetId,
  );

  const selectedPlacement =
    activeLayout?.placements.find(
      (placement) =>
        placement.widgetId === selectedWidgetId,
    );

  function updateDashboardName(name: string) {
    setDashboard((current) => ({
      ...current,
      name,
    }));
  }

  function selectWidget(widgetId: string) {
    setSelectedWidgetId(widgetId || undefined);
    if (widgetId) {
      setPanel("selected");
    }
  }

  function updateActiveLayout(
    updater: (
      layout: DashboardLayout,
    ) => DashboardLayout,
  ) {
    setDashboard((current) => ({
      ...current,
      layouts: current.layouts.map((layout) =>
        layout.id === activeLayout.id
          ? updater(layout)
          : layout,
      ),
    }));
  }

  function updatePlacements(
    placements: WidgetPlacement[],
  ) {
    updateActiveLayout((layout) => ({
      ...layout,
      placements,
    }));
  }

  function updateLayout(
    updates: Partial<DashboardLayout>,
  ) {
    updateActiveLayout((layout) => {
      const next = {
        ...layout,
        ...updates,
      };
      return {
        ...next,
        placements: normalizePlacementsForLayout(
          next,
          layout.placements,
        ),
      };
    });
  }

  function applyLayoutPreset(presetKey: string) {
    const preset = layoutPresets.find(
      (item) => item.key === presetKey,
    );
    if (!preset) {
      return;
    }
    updateActiveLayout((layout) =>
      applyPreset(layout, preset),
    );
  }

  function createLayout(device: LayoutDevice) {
    if (
      dashboard.layouts.some(
        (layout) => layout.device === device,
      )
    ) {
      return;
    }

    const layout =
      device === "mobile"
        ? createMobileLayoutFromDesktop(
            dashboard.widgets,
          )
        : createLayoutFromPreset(
            getRecommendedPreset(device),
            dashboard.widgets,
          );

    setDashboard((current) => ({
      ...current,
      layouts: [...current.layouts, layout],
    }));
    setActiveLayoutId(layout.id);
    setPanel("layouts");
    setZoom("fit");
  }

  function deleteLayout(layoutId: string) {
    const remaining = dashboard.layouts.filter(
      (layout) => layout.id !== layoutId,
    );
    if (remaining.length === 0) {
      return;
    }

    setDashboard((current) => ({
      ...current,
      layouts: current.layouts.filter(
        (layout) => layout.id !== layoutId,
      ),
    }));
    setActiveLayoutId(remaining[0].id);
    setSelectedWidgetId(undefined);
  }

  function resetLayout() {
    updateActiveLayout((layout) =>
      autoArrangeLayout(layout, dashboard.widgets),
    );
  }

  function addWidget(definition: WidgetDefinition) {
    const widget = createWidgetInstance(
      definition.key,
      dashboard.widgets.length,
    );

    setDashboard((current) => ({
      ...current,
      widgets: [...current.widgets, widget],
      layouts: current.layouts.map((layout) =>
        addWidgetToLayout(layout, widget),
      ),
    }));
    setSelectedWidgetId(widget.id);
    setPanel("selected");
  }

  function updateSelectedWidget(
    updates: Partial<WidgetInstance>,
  ) {
    if (!selectedWidgetId) {
      return;
    }

    setDashboard((current) => ({
      ...current,
      widgets: current.widgets.map((widget) =>
        widget.id === selectedWidgetId
          ? { ...widget, ...updates }
          : widget,
      ),
    }));
  }

  function updateSelectedPlacement(
    updates: Partial<WidgetPlacement>,
  ) {
    if (!selectedWidgetId) {
      return;
    }

    updateActiveLayout((layout) => ({
      ...layout,
      placements: layout.placements.map(
        (placement) =>
          placement.widgetId === selectedWidgetId
            ? { ...placement, ...updates }
            : placement,
      ),
    }));
  }

  function duplicateSelectedWidget() {
    if (!selectedWidget) {
      return;
    }

    const duplicate: WidgetInstance = {
      ...selectedWidget,
      id: `${selectedWidget.widgetKey}-${Date.now()}`,
      title: `${selectedWidget.title} Copy`,
      settings: { ...selectedWidget.settings },
    };

    setDashboard((current) => ({
      ...current,
      widgets: [...current.widgets, duplicate],
      layouts: current.layouts.map((layout) =>
        addWidgetToLayout(layout, duplicate),
      ),
    }));
    setSelectedWidgetId(duplicate.id);
  }

  function removeSelectedWidget() {
    if (!selectedWidgetId) {
      return;
    }

    setDashboard((current) => ({
      ...current,
      widgets: current.widgets.filter(
        (widget) => widget.id !== selectedWidgetId,
      ),
      layouts: current.layouts.map((layout) => ({
        ...layout,
        placements: layout.placements.filter(
          (placement) =>
            placement.widgetId !== selectedWidgetId,
        ),
      })),
    }));
    setSelectedWidgetId(undefined);
    setPanel("widgets");
  }

  function updateWeatherLocation(
    location: WeatherLocationSelection,
  ) {
    setDashboard((current) => ({
      ...current,
      sources: current.sources.map((source) =>
        source.kind === "weather-location"
          ? {
              ...source,
              label: location.label,
              latitude: location.latitude,
              longitude: location.longitude,
              timezone: location.timezone,
            }
          : source,
      ),
    }));
  }

  if (!activeLayout) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] bg-white px-5 py-3">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/"
            className="shrink-0 text-sm font-medium text-[var(--accent)]"
          >
            Fishing Forecast
          </Link>
          <input
            aria-label="Dashboard name"
            value={dashboard.name}
            onChange={(event) =>
              updateDashboardName(event.target.value)
            }
            className="min-w-0 max-w-sm rounded-xl border border-transparent bg-[var(--surface-muted)] px-3 py-2 font-medium focus:border-[var(--accent)] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          {dashboard.layouts.map((layout) => (
            <button
              key={layout.id}
              type="button"
              onClick={() => {
                setActiveLayoutId(layout.id);
                setSelectedWidgetId(undefined);
                setZoom("fit");
              }}
              className={[
                "rounded-xl px-3 py-2 text-sm",
                layout.id === activeLayout.id
                  ? "bg-[var(--selection)] font-medium text-[var(--accent)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-muted)]",
              ].join(" ")}
            >
              {layout.name}
            </button>
          ))}
          <button
            type="button"
            disabled
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white opacity-60"
            title="Saving will be added after the editor model is finalized."
          >
            Save
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:h-[calc(100vh-65px)] lg:flex-row">
        <BuilderToolbar
          panel={panel}
          onPanelChange={setPanel}
          layouts={dashboard.layouts}
          activeLayout={activeLayout}
          sources={dashboard.sources}
          selectedWidget={selectedWidget}
          selectedPlacement={selectedPlacement}
          onSelectLayout={(layoutId) => {
            setActiveLayoutId(layoutId);
            setSelectedWidgetId(undefined);
            setZoom("fit");
          }}
          onCreateLayout={createLayout}
          onDeleteLayout={deleteLayout}
          onApplyLayoutPreset={applyLayoutPreset}
          onUpdateLayout={updateLayout}
          onResetLayout={resetLayout}
          onAddWidget={addWidget}
          onWeatherLocationChange={
            updateWeatherLocation
          }
          onUpdateWidget={updateSelectedWidget}
          onUpdatePlacement={
            updateSelectedPlacement
          }
          onDuplicateWidget={
            duplicateSelectedWidget
          }
          onRemoveWidget={removeSelectedWidget}
        />

        <BuilderPreview
          layout={activeLayout}
          widgets={dashboard.widgets}
          sources={dashboard.sources}
          weatherStates={weatherStates}
          mode={mode}
          zoom={zoom}
          showGrid={showGrid}
          selectedWidgetId={selectedWidgetId}
          onModeChange={setMode}
          onZoomChange={setZoom}
          onShowGridChange={setShowGrid}
          onSelectWidget={selectWidget}
          onPlacementsChange={updatePlacements}
        />
      </div>
    </main>
  );
}
