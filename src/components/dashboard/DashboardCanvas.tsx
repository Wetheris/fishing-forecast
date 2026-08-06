"use client";

import { useMemo } from "react";
import ReactGridLayout, {
  type Layout,
  type LayoutItem,
} from "react-grid-layout";
import {
  createScaledStrategy,
  verticalCompactor,
} from "react-grid-layout/core";
import type {
  DashboardLayout,
  DashboardSource,
  DashboardThemeKey,
  WidgetInstance,
  WidgetPlacement,
} from "@/types/dashboard";
import type {
  AstronomySourceStateMap,
  MarineSourceStateMap,
  RadarSourceStateMap,
  TideSourceStateMap,
} from "@/types/source-data";
import type { ForecastContext } from "@/types/forecast";
import type { WeatherSourceStateMap } from "@/types/weather";
import { getLayoutContentHeight } from "@/lib/layout-measurements";
import { WidgetRenderer } from "@/components/dashboard/WidgetRenderer";
import { WidgetShell } from "@/components/dashboard/WidgetShell";

export function DashboardCanvas({
  layout,
  theme,
  widgets,
  sources,
  weatherStates,
  tideStates,
  marineStates,
  astronomyStates,
  radarStates,
  forecastContext,
  onForecastDateChange,
  onWidgetSettingsChange,
  mode,
  scale,
  showGrid,
  selectedWidgetId,
  onSelectWidget,
  onPlacementsChange,
}: {
  layout: DashboardLayout;
  theme: DashboardThemeKey;
  widgets: WidgetInstance[];
  sources: DashboardSource[];
  weatherStates: WeatherSourceStateMap;
  tideStates: TideSourceStateMap;
  marineStates: MarineSourceStateMap;
  astronomyStates: AstronomySourceStateMap;
  radarStates: RadarSourceStateMap;
  forecastContext: ForecastContext;
  onForecastDateChange?: (date: string) => void;
  onWidgetSettingsChange?: (
    widgetId: string,
    settings: Record<string, unknown>,
  ) => void;
  mode: "edit" | "view";
  scale: number;
  showGrid: boolean;
  selectedWidgetId?: string;
  onSelectWidget?: (widgetId: string) => void;
  onPlacementsChange?: (
    placements: WidgetPlacement[],
  ) => void;
}) {
  const visiblePlacements = useMemo(
    () =>
      layout.placements.filter(
        (placement) => !placement.hidden,
      ),
    [layout.placements],
  );

  const gridLayout = useMemo<Layout>(
    () =>
      visiblePlacements.map((placement) => ({
        i: placement.widgetId,
        x: placement.x,
        y: placement.y,
        w: placement.w,
        h: placement.h,
        minW: placement.minW,
        minH: placement.minH,
        maxW: placement.maxW,
        maxH: placement.maxH,
      })),
    [visiblePlacements],
  );

  const contentHeight = getLayoutContentHeight(layout);
  const cellWidth =
    (layout.viewport.width -
      layout.grid.padding * 2 -
      layout.grid.gap *
        (layout.grid.columns - 1)) /
    layout.grid.columns;

  const backgroundStyle = showGrid
    ? {
        backgroundImage:
          "linear-gradient(to right, color-mix(in srgb, var(--accent) 14%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--accent) 14%, transparent) 1px, transparent 1px), var(--dashboard-pattern, none)",
        backgroundSize: `${cellWidth + layout.grid.gap}px ${
          layout.grid.rowHeight + layout.grid.gap
        }px, ${cellWidth + layout.grid.gap}px ${
          layout.grid.rowHeight + layout.grid.gap
        }px, var(--dashboard-pattern-size, auto)`,
        backgroundPosition: `${layout.grid.padding}px ${layout.grid.padding}px, ${layout.grid.padding}px ${layout.grid.padding}px, center`,
      }
    : {
        backgroundImage: "var(--dashboard-pattern, none)",
        backgroundSize: "var(--dashboard-pattern-size, auto)",
        backgroundPosition: "center",
      };

  function handleLayoutChange(
    nextLayout: Layout,
  ) {
    if (!onPlacementsChange) {
      return;
    }

    const nextById = new Map(
      nextLayout.map((item) => [item.i, item]),
    );

    const nextPlacements =
      layout.placements.map((placement) => {
        const next = nextById.get(
          placement.widgetId,
        );

        return next
          ? toPlacement(next, placement)
          : placement;
      });

    if (
      placementsEqual(
        layout.placements,
        nextPlacements,
      )
    ) {
      return;
    }

    onPlacementsChange(nextPlacements);
  }

  return (
    <div
      className="dashboard-theme relative text-[var(--foreground)]"
      data-theme={theme}
      style={{
        width: layout.viewport.width,
        height: contentHeight,
        backgroundColor:
          "var(--dashboard-background, var(--background))",
        ...backgroundStyle,
      }}
      onMouseDown={(event) => {
        if (
          mode === "edit" &&
          event.currentTarget === event.target
        ) {
          onSelectWidget?.("");
        }
      }}
    >
      <ReactGridLayout
        width={layout.viewport.width}
        layout={gridLayout}
        autoSize={false}
        style={{
          height: contentHeight,
        }}
        gridConfig={{
          cols: layout.grid.columns,
          rowHeight: layout.grid.rowHeight,
          margin: [
            layout.grid.gap,
            layout.grid.gap,
          ],
          containerPadding: [
            layout.grid.padding,
            layout.grid.padding,
          ],
        }}
        dragConfig={{
          enabled: mode === "edit",
          bounded: false,
          handle: ".widget-drag-handle",
          cancel:
            "button:not(.widget-drag-handle),input,select,textarea,a",
        }}
        resizeConfig={{
          enabled: mode === "edit",
          handles: ["se", "e", "s"],
        }}
        compactor={verticalCompactor}
        positionStrategy={createScaledStrategy(scale)}
        onLayoutChange={handleLayoutChange}
      >
        {visiblePlacements.map((placement) => {
          const widget = widgets.find(
            (item) =>
              item.id === placement.widgetId,
          );

          if (!widget) {
            return (
              <div key={placement.widgetId}>
                Missing widget
              </div>
            );
          }

          const source =
            sources.find(
              (item) =>
                item.id === widget.sourceId,
            ) ?? sources[0];

          if (!source) {
            return (
              <div key={placement.widgetId}>
                Missing source
              </div>
            );
          }

          const weatherState =
            weatherStates[source.id];
          const tideState = tideStates[source.id];
          const marineState =
            marineStates[source.id];
          const astronomyState =
            astronomyStates[source.id];
          const radarState =
            radarStates[source.id];

          return (
            <div key={placement.widgetId}>
              <WidgetShell
                widget={widget}
                source={source}
                updatedAt={getUpdatedAt({
                  weatherState,
                  tideState,
                  marineState,
                  astronomyState,
                  radarState,
                })}
                mode={mode}
                selected={
                  mode === "edit" &&
                  selectedWidgetId === widget.id
                }
                onSelect={() =>
                  onSelectWidget?.(widget.id)
                }
              >
                <WidgetRenderer
                  widget={widget}
                  source={source}
                  weatherState={weatherState}
                  tideState={tideState}
                  marineState={marineState}
                  astronomyState={astronomyState}
                  radarState={radarState}
                  forecastContext={forecastContext}
                  onForecastDateChange={
                    onForecastDateChange
                  }
                  onWidgetSettingsChange={
                    onWidgetSettingsChange
                      ? (settings) =>
                          onWidgetSettingsChange(
                            widget.id,
                            settings,
                          )
                      : undefined
                  }
                />
              </WidgetShell>
            </div>
          );
        })}
      </ReactGridLayout>
    </div>
  );
}

function getUpdatedAt({
  weatherState,
  tideState,
  marineState,
  astronomyState,
  radarState,
}: {
  weatherState?: WeatherSourceStateMap[string];
  tideState?: TideSourceStateMap[string];
  marineState?: MarineSourceStateMap[string];
  astronomyState?: AstronomySourceStateMap[string];
  radarState?: RadarSourceStateMap[string];
}): string | null {
  if (weatherState?.status === "success") {
    return weatherState.data.fetchedAt;
  }
  if (tideState?.status === "success") {
    return tideState.data.fetchedAt;
  }
  if (marineState?.status === "success") {
    return marineState.data.fetchedAt;
  }
  if (astronomyState?.status === "success") {
    return astronomyState.data.calculatedAt;
  }
  if (radarState?.status === "success") {
    return radarState.data.fetchedAt;
  }

  return null;
}

function toPlacement(
  item: LayoutItem,
  previous: WidgetPlacement,
): WidgetPlacement {
  return {
    ...previous,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: item.minW ?? previous.minW,
    minH: item.minH ?? previous.minH,
    maxW: item.maxW ?? previous.maxW,
    maxH: item.maxH ?? previous.maxH,
  };
}

function placementsEqual(
  first: WidgetPlacement[],
  second: WidgetPlacement[],
): boolean {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((placement, index) => {
    const comparison = second[index];

    return (
      comparison !== undefined &&
      placement.widgetId ===
        comparison.widgetId &&
      placement.x === comparison.x &&
      placement.y === comparison.y &&
      placement.w === comparison.w &&
      placement.h === comparison.h &&
      placement.minW === comparison.minW &&
      placement.minH === comparison.minH &&
      placement.maxW === comparison.maxW &&
      placement.maxH === comparison.maxH &&
      placement.hidden === comparison.hidden
    );
  });
}
