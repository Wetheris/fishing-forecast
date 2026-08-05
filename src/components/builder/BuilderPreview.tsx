"use client";

import { useEffect, useRef, useState } from "react";
import type {
  DashboardLayout,
  DashboardSource,
  WidgetInstance,
  WidgetPlacement,
} from "@/types/dashboard";
import type { WeatherSourceStateMap } from "@/types/weather";
import { DashboardCanvas } from "@/components/dashboard/DashboardCanvas";

export type PreviewZoom = "fit" | 0.5 | 0.75 | 1;

export function BuilderPreview({
  layout,
  widgets,
  sources,
  weatherStates,
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
  widgets: WidgetInstance[];
  sources: DashboardSource[];
  weatherStates: WeatherSourceStateMap;
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
  const [stageSize, setStageSize] = useState({
    width: 1000,
    height: 700,
  });

  useEffect(() => {
    const element = stageRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      setStageSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fitScale = Math.min(
    1,
    Math.max(
      0.2,
      Math.min(
        (stageSize.width - 64) / layout.viewport.width,
        (stageSize.height - 64) / layout.viewport.height,
      ),
    ),
  );

  const scale = zoom === "fit" ? fitScale : zoom;

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-white px-4 py-3">
        <div>
          <p className="text-sm font-medium">
            {layout.name} preview
          </p>
          <p className="text-xs text-[var(--muted)]">
            {layout.viewport.width} × {layout.viewport.height} ·{" "}
            {layout.grid.columns} columns ·{" "}
            {Math.round(scale * 100)}%
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
            <option value="fit">Fit</option>
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
        className="builder-scrollbar relative min-h-[520px] flex-1 overflow-auto bg-[#e8eef0]"
      >
        <div className="flex min-h-full min-w-full items-start justify-center p-8">
          <div
            className="shrink-0"
            style={{
              width: layout.viewport.width * scale,
              height: layout.viewport.height * scale,
            }}
          >
            <div
              className="origin-top-left border border-slate-300 bg-white shadow-sm"
              style={{
                width: layout.viewport.width,
                height: layout.viewport.height,
                transform: `scale(${scale})`,
              }}
            >
              <DashboardCanvas
                layout={layout}
                widgets={widgets}
                sources={sources}
                weatherStates={weatherStates}
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
