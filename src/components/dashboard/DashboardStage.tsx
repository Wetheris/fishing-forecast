"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  DashboardLayout,
  FishingDashboard,
  WidgetPlacement,
} from "@/types/dashboard";
import type { ForecastContext } from "@/types/forecast";
import type {
  AstronomySourceStateMap,
  MarineSourceStateMap,
  RadarSourceStateMap,
  TideSourceStateMap,
} from "@/types/source-data";
import type { WeatherSourceStateMap } from "@/types/weather";
import { getLayoutContentHeight } from "@/lib/layout-measurements";
import { DashboardCanvas } from "@/components/dashboard/DashboardCanvas";

export function DashboardStage({
  dashboard,
  layout,
  subtitle,
  weatherStates,
  tideStates,
  marineStates,
  astronomyStates,
  radarStates,
  forecastContext,
  onForecastDateChange,
  onWidgetSettingsChange,
  mode,
  showGrid = false,
  selectedWidgetId,
  onSelectWidget,
  onPlacementsChange,
}: {
  dashboard: FishingDashboard;
  layout: DashboardLayout;
  subtitle?: string;
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
  showGrid?: boolean;
  selectedWidgetId?: string;
  onSelectWidget?: (widgetId: string) => void;
  onPlacementsChange?: (
    placements: WidgetPlacement[],
  ) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] =
    useState(layout.viewport.width);

  useEffect(() => {
    const element = stageRef.current;

    if (!element) {
      return;
    }

    let frame = 0;
    const measure = () => {
      setStageWidth(element.clientWidth);
    };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });

    observer.observe(element);
    measure();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const contentHeight =
    getLayoutContentHeight(layout);
  const titleHeight =
    layout.device === "mobile" ? 82 : 104;
  const totalHeight =
    titleHeight + contentHeight;
  const scale = Math.min(
    1,
    Math.max(
      0.2,
      stageWidth / layout.viewport.width,
    ),
  );
  const displayedWidth = Math.round(
    layout.viewport.width * scale,
  );
  const displayedHeight = Math.round(
    totalHeight * scale,
  );

  const basePadding =
    layout.device === "mobile"
      ? 16
      : 28;
  const viewLeftPadding =
    layout.device === "mobile"
      ? 68
      : 76;
  const viewRightPadding =
    layout.device === "mobile"
      ? 116
      : 132;

  return (
    <div
      ref={stageRef}
      className="min-h-screen overflow-x-auto"
    >
      <div
        className="mx-auto shrink-0 overflow-hidden"
        style={{
          width: displayedWidth,
          height: displayedHeight,
        }}
      >
        <div
          className="dashboard-theme origin-top-left text-[var(--foreground)]"
          data-theme={dashboard.theme}
          style={{
            width: layout.viewport.width,
            height: totalHeight,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            backgroundColor:
              "var(--dashboard-background, var(--background))",
          }}
        >
          <header
            className="flex items-center"
            style={{
              height: titleHeight,
              paddingLeft:
                mode === "view"
                  ? viewLeftPadding
                  : basePadding,
              paddingRight:
                mode === "view"
                  ? viewRightPadding
                  : basePadding,
            }}
          >
            <div className="min-w-0">
              <h1
                className={
                  layout.device === "mobile"
                    ? "truncate text-2xl font-semibold"
                    : "truncate text-3xl font-semibold"
                }
              >
                {dashboard.name}
              </h1>
              {subtitle ? (
                <p className="mt-1 truncate text-sm text-[var(--muted)]">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </header>

          <DashboardCanvas
            layout={layout}
            theme={dashboard.theme}
            widgets={dashboard.widgets}
            sources={dashboard.sources}
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
            showGrid={
              showGrid && mode === "edit"
            }
            selectedWidgetId={
              selectedWidgetId
            }
            onSelectWidget={
              onSelectWidget
            }
            onPlacementsChange={
              onPlacementsChange
            }
          />
        </div>
      </div>
    </div>
  );
}
