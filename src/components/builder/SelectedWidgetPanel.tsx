import type {
  DashboardLayout,
  DashboardSource,
  WidgetInstance,
  WidgetPlacement,
} from "@/types/dashboard";
import { getWidgetDefinition } from "@/widgets/registry";
import {
  booleanSetting,
  stringSetting,
} from "@/lib/widget-settings";

export function SelectedWidgetPanel({
  widget,
  placement,
  activeLayout,
  sources,
  onUpdateWidget,
  onUpdatePlacement,
  onDuplicate,
  onRemove,
}: {
  widget?: WidgetInstance;
  placement?: WidgetPlacement;
  activeLayout: DashboardLayout;
  sources: DashboardSource[];
  onUpdateWidget: (
    updates: Partial<WidgetInstance>,
  ) => void;
  onUpdatePlacement: (
    updates: Partial<WidgetPlacement>,
  ) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  if (!widget || !placement) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] p-5 text-center">
        <h2 className="font-medium">No widget selected</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Select a widget in the canvas to configure it.
        </p>
      </div>
    );
  }

  const currentWidget = widget;
  const definition = getWidgetDefinition(
    currentWidget.widgetKey,
  );
  const compatibleSources = sources.filter(
    (source) => source.kind === definition.sourceKind,
  );

  function updateSetting(
    key: string,
    value: unknown,
  ) {
    onUpdateWidget({
      settings: {
        ...currentWidget.settings,
        [key]: value,
      },
    });
  }

  return (
    <div>
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--accent)]">
          {definition.name}
        </p>
        <h2 className="mt-1 font-medium">
          Selected widget
        </h2>
      </header>

      <div className="mt-5 space-y-4">
        <label className="block text-sm">
          <span className="font-medium">Title</span>
          <input
            value={currentWidget.title}
            onChange={(event) =>
              onUpdateWidget({
                title: event.target.value,
              })
            }
            className="mt-2 w-full rounded-xl border border-[var(--border)] px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium">Data source</span>
          <select
            value={currentWidget.sourceId}
            onChange={(event) =>
              onUpdateWidget({
                sourceId: event.target.value,
              })
            }
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
          >
            {compatibleSources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.label}
              </option>
            ))}
          </select>
        </label>

        <CommonDisplaySettings
          widget={widget}
          onChange={updateSetting}
        />

        <WidgetSpecificSettings
          widget={widget}
          onChange={updateSetting}
        />

        <fieldset>
          <legend className="text-sm font-medium">
            Placement on {activeLayout.name}
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <PlacementField
              label="X"
              value={placement.x}
              min={0}
              max={Math.max(
                0,
                activeLayout.grid.columns - placement.w,
              )}
              onChange={(x) => onUpdatePlacement({ x })}
            />
            <PlacementField
              label="Y"
              value={placement.y}
              min={0}
              max={100}
              onChange={(y) => onUpdatePlacement({ y })}
            />
            <PlacementField
              label="Width"
              value={placement.w}
              min={placement.minW}
              max={activeLayout.grid.columns}
              onChange={(w) =>
                onUpdatePlacement({
                  w,
                  x: Math.min(
                    placement.x,
                    activeLayout.grid.columns - w,
                  ),
                })
              }
            />
            <PlacementField
              label="Height"
              value={placement.h}
              min={placement.minH}
              max={12}
              onChange={(h) => onUpdatePlacement({ h })}
            />
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onDuplicate}
            className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--surface-muted)]"
          >
            Duplicate
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function CommonDisplaySettings({
  widget,
  onChange,
}: {
  widget: WidgetInstance;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">
        Display
      </legend>
      <Checkbox
        label="Show source label"
        checked={booleanSetting(
          widget.settings,
          "showSourceLabel",
          true,
        )}
        onChange={(value) =>
          onChange("showSourceLabel", value)
        }
      />
      {widget.category === "weather" ||
      widget.category === "wind" ? (
        <Checkbox
          label="Show last updated"
          checked={booleanSetting(
            widget.settings,
            "showLastUpdated",
            false,
          )}
          onChange={(value) =>
            onChange("showLastUpdated", value)
          }
        />
      ) : null}
    </fieldset>
  );
}

function WidgetSpecificSettings({
  widget,
  onChange,
}: {
  widget: WidgetInstance;
  onChange: (key: string, value: unknown) => void;
}) {
  if (widget.widgetKey === "current-temperature") {
    return (
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          Temperature
        </legend>
        <SelectSetting
          label="Unit"
          value={stringSetting(
            widget.settings,
            "unit",
            "fahrenheit",
          )}
          options={[
            ["fahrenheit", "Fahrenheit"],
            ["celsius", "Celsius"],
          ]}
          onChange={(value) => onChange("unit", value)}
        />
        <Checkbox
          label="Show feels-like temperature"
          checked={booleanSetting(
            widget.settings,
            "showFeelsLike",
            true,
          )}
          onChange={(value) =>
            onChange("showFeelsLike", value)
          }
        />
      </fieldset>
    );
  }

  if (
    widget.widgetKey === "wind-speed" ||
    widget.widgetKey === "wind-gusts" ||
    widget.widgetKey === "wind-forecast"
  ) {
    return (
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          Wind
        </legend>
        <SelectSetting
          label="Unit"
          value={stringSetting(
            widget.settings,
            "unit",
            "mph",
          )}
          options={[
            ["mph", "Miles per hour"],
            ["knots", "Knots"],
            ["kmh", "Kilometers per hour"],
          ]}
          onChange={(value) => onChange("unit", value)}
        />
      </fieldset>
    );
  }

  if (
    widget.widgetKey === "wave-height" ||
    widget.widgetKey === "swell-information"
  ) {
    return (
      <SelectSetting
        label="Length unit"
        value={stringSetting(
          widget.settings,
          "lengthUnit",
          "feet",
        )}
        options={[
          ["feet", "Feet"],
          ["meters", "Meters"],
        ]}
        onChange={(value) =>
          onChange("lengthUnit", value)
        }
      />
    );
  }

  return null;
}

function PlacementField({
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
      <span>{label}</span>
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
        className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2"
      />
    </label>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
      />
      {label}
    </label>
  );
}

function SelectSetting({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option
            key={optionValue}
            value={optionValue}
          >
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
