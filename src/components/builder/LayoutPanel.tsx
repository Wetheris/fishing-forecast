"use client";

import type {
  DashboardLayout,
  DashboardThemeKey,
  LayoutDevice,
} from "@/types/dashboard";
import {
  aspectRatioLabel,
  layoutPresets,
} from "@/lib/dashboard-layouts";
import { dashboardThemes } from "@/lib/dashboard-themes";

export function LayoutPanel({
  layouts,
  activeLayout,
  theme,
  onSelectLayout,
  onCreateLayout,
  onDeleteLayout,
  onApplyPreset,
  onUpdateLayout,
  onResetLayout,
  onThemeChange,
}: {
  layouts: DashboardLayout[];
  activeLayout: DashboardLayout;
  theme: DashboardThemeKey;
  onSelectLayout: (layoutId: string) => void;
  onCreateLayout: (device: LayoutDevice) => void;
  onDeleteLayout: (layoutId: string) => void;
  onApplyPreset: (presetKey: string) => void;
  onUpdateLayout: (
    updates: Partial<DashboardLayout>,
  ) => void;
  onResetLayout: () => void;
  onThemeChange: (theme: DashboardThemeKey) => void;
}) {
  const hasMobile = layouts.some(
    (layout) => layout.device === "mobile",
  );

  const presets = layoutPresets.filter(
    (preset) => preset.device === activeLayout.device,
  );

  const selectedTheme =
    dashboardThemes.find(
      (option) => option.key === theme,
    ) ?? dashboardThemes[0];

  return (
    <div>
      <header>
        <h2 className="font-medium">Layouts</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Widgets share data and settings, but each layout has
          independent placement and sizing.
        </p>
      </header>

      <div className="mt-4 grid gap-2">
        {layouts.map((layout) => (
          <button
            key={layout.id}
            type="button"
            onClick={() => onSelectLayout(layout.id)}
            className={[
              "rounded-xl border p-3 text-left",
              layout.id === activeLayout.id
                ? "border-[var(--accent)] bg-[var(--selection)]"
                : "border-[var(--border)] hover:bg-[var(--surface-muted)]",
            ].join(" ")}
          >
            <span className="block font-medium">
              {layout.name}
            </span>
            <span className="mt-1 block text-xs text-[var(--muted)]">
              {layout.viewport.width} × {layout.viewport.height} ·{" "}
              {layout.grid.columns} columns
            </span>
          </button>
        ))}
      </div>

      {!hasMobile ? (
        <button
          type="button"
          onClick={() => onCreateLayout("mobile")}
          className="mt-3 w-full rounded-xl border border-dashed border-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--selection)]"
        >
          + Create mobile layout
        </button>
      ) : null}

      <hr className="my-5 border-[var(--border)]" />

      <section>
        <h3 className="text-sm font-medium">
          Dashboard theme
        </h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Theme colors apply to every dashboard layout.
        </p>

        <div className="mt-3 rounded-xl border border-[var(--border)] p-3">
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 gap-1">
              {selectedTheme.swatches.map((swatch) => (
                <span
                  key={swatch}
                  className="h-8 w-8 rounded-lg border border-black/10"
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>

            <select
              aria-label="Dashboard theme"
              value={theme}
              onChange={(event) =>
                onThemeChange(
                  event.target.value as DashboardThemeKey,
                )
              }
              className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium"
            >
              {dashboardThemes.map((option) => (
                <option
                  key={option.key}
                  value={option.key}
                >
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            {selectedTheme.description}
          </p>
        </div>
      </section>

      <hr className="my-5 border-[var(--border)]" />

      <div className="space-y-4">
        <div>
          <label
            htmlFor="layout-preset"
            className="text-sm font-medium"
          >
            Suggested size
          </label>
          <select
            id="layout-preset"
            value={
              presets.some(
                (preset) =>
                  preset.key === activeLayout.presetKey,
              )
                ? activeLayout.presetKey
                : "custom"
            }
            onChange={(event) => {
              if (event.target.value !== "custom") {
                onApplyPreset(event.target.value);
              }
            }}
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
          >
            {presets.map((preset) => (
              <option key={preset.key} value={preset.key}>
                {preset.name}
                {preset.recommended ? " — Recommended" : ""}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Width"
            value={activeLayout.viewport.width}
            min={280}
            max={2560}
            onChange={(width) =>
              onUpdateLayout({
                presetKey: "custom",
                viewport: {
                  ...activeLayout.viewport,
                  width,
                },
              })
            }
          />
          <NumberField
            label="Minimum height"
            value={activeLayout.viewport.height}
            min={480}
            max={1800}
            onChange={(height) =>
              onUpdateLayout({
                presetKey: "custom",
                viewport: {
                  ...activeLayout.viewport,
                  height,
                },
              })
            }
          />
        </div>

        <p className="rounded-xl bg-[var(--surface-muted)] p-3 text-sm">
          Widgets may extend below the minimum height; the dashboard will scroll vertically.
          <br />
          Aspect ratio:{" "}
          <strong>
            {aspectRatioLabel(
              activeLayout.viewport.width,
              activeLayout.viewport.height,
            )}
          </strong>
        </p>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Columns"
            value={activeLayout.grid.columns}
            min={2}
            max={24}
            onChange={(columns) =>
              onUpdateLayout({
                presetKey: "custom",
                grid: {
                  ...activeLayout.grid,
                  columns,
                },
              })
            }
          />
          <NumberField
            label="Row height"
            value={activeLayout.grid.rowHeight}
            min={32}
            max={160}
            onChange={(rowHeight) =>
              onUpdateLayout({
                presetKey: "custom",
                grid: {
                  ...activeLayout.grid,
                  rowHeight,
                },
              })
            }
          />
          <NumberField
            label="Gap"
            value={activeLayout.grid.gap}
            min={0}
            max={40}
            onChange={(gap) =>
              onUpdateLayout({
                presetKey: "custom",
                grid: {
                  ...activeLayout.grid,
                  gap,
                },
              })
            }
          />
          <NumberField
            label="Padding"
            value={activeLayout.grid.padding}
            min={0}
            max={80}
            onChange={(padding) =>
              onUpdateLayout({
                presetKey: "custom",
                grid: {
                  ...activeLayout.grid,
                  padding,
                },
              })
            }
          />
        </div>

        <button
          type="button"
          onClick={onResetLayout}
          className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--surface-muted)]"
        >
          Auto-arrange widgets
        </button>

        {activeLayout.device === "mobile" ? (
          <button
            type="button"
            onClick={() =>
              onDeleteLayout(activeLayout.id)
            }
            className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
          >
            Remove mobile layout
          </button>
        ) : null}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="text-sm">
      <span className="font-medium">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) {
            onChange(
              Math.min(max, Math.max(min, next)),
            );
          }
        }}
        className="mt-2 w-full rounded-xl border border-[var(--border)] px-3 py-2"
      />
    </label>
  );
}
