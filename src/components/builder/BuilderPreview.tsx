"use client";

import { useEffect, useRef, useState } from "react";
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
import { DashboardCanvas } from "@/components/dashboard/DashboardCanvas";

export type PreviewZoom = "fit" | 0.5 | 0.75 | 1;

const FIT_PADDING = 32;
const SCALE_PRECISION = 1000;

export function BuilderPreview({
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
  zoom,
  showGrid,
  selectedWidgetId,
  onModeChange,
  onZoomChange,
  onShowGridChange,
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
  onForecastDateChange: (date: string) => void;
  onWidgetSettingsChange: (
    widgetId: string,
    settings: Record<string, unknown>,
  ) => void;
  mode: "edit" | "view";
  zoom: PreviewZoom;
  showGrid: boolean;
  selectedWidgetId?: string;
  onModeChange: (mode: "edit" | "view") => void;
  onZoomChange: (zoom: PreviewZoom) => void;
  onShowGridChange: (show: boolean) => void;
  onSelectWidget: (widgetId: string) => void;
  onPlacementsChange: (
    placements: WidgetPlacement[],
  ) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(1000);

  useEffect(() => {
    const element = stageRef.current;

    if (!element) {
      return;
    }

    let animationFrame = 0;

    const measure = () => {
      const nextWidth = element.clientWidth;

      setStageWidth((current) =>
        Math.abs(current - nextWidth) < 2
          ? current
          : nextWidth,
      );
    };

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(measure);
    });

    observer.observe(element);
    measure();

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, []);

  const contentHeight = getLayoutContentHeight(layout);
  const availableWidth = Math.max(
    1,
    stageWidth - FIT_PADDING,
  );
  const rawFitScale = Math.min(
    1,
    availableWidth / layout.viewport.width,
  );

  /*
   * Fit mode is width-based. A dashboard that grows vertically keeps a
   * readable scale and scrolls instead of shrinking until everything is
   * too small to use.
   */
  const fitScale =
    Math.floor(
      Math.max(0.2, rawFitScale) * SCALE_PRECISION,
    ) / SCALE_PRECISION;

  const scale = zoom === "fit" ? fitScale : zoom;
  const displayedWidth = Math.round(
    layout.viewport.width * scale,
  );
  const displayedHeight = Math.round(
    contentHeight * scale,
  );
  const hasScrollableContent =
    contentHeight > layout.viewport.height;

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-white px-3 py-2">
        <div>
          <p className="text-sm font-medium">
            {layout.name} preview
          </p>
          <p className="text-xs text-[var(--muted)]">
            {layout.viewport.width} × {layout.viewport.height} ·{" "}
            {layout.grid.columns} columns ·{" "}
            {Math.round(scale * 100)}%
            {hasScrollableContent
              ? ` · ${contentHeight}px scroll height`
              : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-1">
            <ToolbarButton
              active={mode === "edit"}
              onClick={() => onModeChange("edit")}
            >
              Edit
            </ToolbarButton>
            <ToolbarButton
              active={mode === "view"}
              onClick={() => onModeChange("view")}
            >
              Preview
            </ToolbarButton>
          </div>

          <select
            aria-label="Preview zoom"
            value={String(zoom)}
            onChange={(event) => {
              const value = event.target.value;

              onZoomChange(
                value === "fit"
                  ? "fit"
                  : (Number(value) as PreviewZoom),
              );
            }}
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
          >
            <option value="fit">Fit width</option>
            <option value="0.5">50%</option>
            <option value="0.75">75%</option>
            <option value="1">100%</option>
          </select>

          <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(event) =>
                onShowGridChange(event.target.checked)
              }
            />
            Grid
          </label>
        </div>
      </div>

      <div
        ref={stageRef}
        className="builder-scrollbar relative min-h-0 flex-1 overflow-auto bg-[#e8eef0]"
        style={{
          scrollbarGutter: "stable both-edges",
          overflowAnchor: "none",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div className="flex min-h-full min-w-full items-start justify-center p-4 sm:p-5">
          <div
            className="shrink-0"
            style={{
              width: displayedWidth,
              height: displayedHeight,
            }}
          >
            <div
              className="origin-top-left border border-slate-300 bg-white shadow-sm"
              style={{
                width: layout.viewport.width,
                height: contentHeight,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              <DashboardCanvas
                layout={layout}
                theme={theme}
                widgets={widgets}
                sources={sources}
                weatherStates={weatherStates}
                tideStates={tideStates}
                marineStates={marineStates}
                astronomyStates={astronomyStates}
                radarStates={radarStates}
                forecastContext={forecastContext}
                onForecastDateChange={
                  onForecastDateChange
                }
                onWidgetSettingsChange={
                  onWidgetSettingsChange
                }
                mode={mode}
                scale={scale}
                showGrid={showGrid && mode === "edit"}
                selectedWidgetId={selectedWidgetId}
                onSelectWidget={onSelectWidget}
                onPlacementsChange={onPlacementsChange}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ToolbarButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-lg px-3 py-1.5 text-sm",
        active
          ? "bg-white font-medium shadow-sm"
          : "text-[var(--muted)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
