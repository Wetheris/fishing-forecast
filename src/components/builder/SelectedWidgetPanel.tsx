import type {
  DashboardLayout,
  DashboardSource,
  LayoutDevice,
  WidgetInstance,
  WidgetKey,
  WidgetPlacement,
} from "@/types/dashboard";
import { getWidgetDefinition } from "@/widgets/registry";
import {
  booleanSetting,
  numberSetting,
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

  /*
   * Capture the narrowed widget before using it inside the nested
   * updateSetting callback. Helper components below still use their
   * own widget parameters.
   */
  const selectedWidget = widget;

  const definition = getWidgetDefinition(
    selectedWidget.widgetKey,
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
        ...selectedWidget.settings,
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
            value={widget.title}
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
            value={widget.sourceId}
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
          placement={placement}
          device={activeLayout.device}
          onChange={updateSetting}
          onUpdatePlacement={onUpdatePlacement}
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
  placement,
  device,
  onChange,
  onUpdatePlacement,
}: {
  widget: WidgetInstance;
  placement: WidgetPlacement;
  device: LayoutDevice;
  onChange: (key: string, value: unknown) => void;
  onUpdatePlacement: (
    updates: Partial<WidgetPlacement>,
  ) => void;
}) {
  const showHeader = booleanSetting(
    widget.settings,
    "showHeader",
    true,
  );
  const density = stringSetting(
    widget.settings,
    "density",
    "standard",
  );
  const definition = getWidgetDefinition(
    widget.widgetKey,
  );
  const standardPlacement =
    definition.defaultPlacement[device];
  const compactPlacement =
    getCompactPlacement(
      widget.widgetKey,
      device,
      standardPlacement,
    );

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">
        Display
      </legend>

      <SelectSetting
        label="Content density"
        value={density}
        options={[
          ["standard", "Standard"],
          ["compact", "Compact"],
        ]}
        onChange={(value) => {
          onChange("density", value);

          if (value === "compact") {
            onUpdatePlacement({
              h: compactPlacement.h,
              minH: compactPlacement.minH,
            });
            return;
          }

          onUpdatePlacement({
            h: Math.max(
              placement.h,
              standardPlacement.h,
            ),
            minH: standardPlacement.minH,
          });
        }}
      />

      <p className="text-xs leading-5 text-[var(--muted)]">
        Compact mode removes secondary visuals and uses
        a shorter fixed widget height. Change it here
        rather than from inside the dashboard.
      </p>

      <SelectSetting
        label="Font size"
        value={stringSetting(
          widget.settings,
          "fontSize",
          "medium",
        )}
        options={[
          ["small", "Small"],
          ["medium", "Medium"],
          ["large", "Large"],
        ]}
        onChange={(value) =>
          onChange("fontSize", value)
        }
      />

      <Checkbox
        label="Show widget header"
        checked={showHeader}
        onChange={(value) =>
          onChange("showHeader", value)
        }
      />

      {showHeader ? (
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
      ) : null}

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

function getCompactPlacement(
  widgetKey: WidgetKey,
  device: LayoutDevice,
  standard: {
    h: number;
    minH: number;
  },
): {
  h: number;
  minH: number;
} {
  const mobile = device === "mobile";

  switch (widgetKey) {
    case "daily-forecast":
      return {
        h: 2,
        minH: 2,
      };

    case "forecast-overview":
      return {
        h: mobile ? 3 : 2,
        minH: mobile ? 3 : 2,
      };

    case "hourly-forecast":
    case "wind-forecast":
    case "tide-timeline":
      return {
        h: mobile ? 3 : 2,
        minH: mobile ? 3 : 2,
      };

    case "moon-phase":
      return {
        h: mobile ? 2 : 2,
        minH: mobile ? 2 : 2,
      };

    case "radar-map":
      return {
        h: mobile ? 4 : 3,
        minH: mobile ? 4 : 3,
      };

    default:
      return {
        h: Math.max(1, standard.minH),
        minH: Math.max(1, standard.minH),
      };
  }
}

function WidgetSpecificSettings({
  widget,
  onChange,
}: {
  widget: WidgetInstance;
  onChange: (key: string, value: unknown) => void;
}) {
  if (widget.widgetKey === "forecast-overview") {
    return (
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          Forecast overview
        </legend>
        <SelectSetting
          label="Temperature unit"
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
      </fieldset>
    );
  }

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

  if (widget.widgetKey === "current-conditions") {
    return (
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          Conditions
        </legend>
        <Checkbox
          label="Show weather icon"
          checked={booleanSetting(
            widget.settings,
            "showIcon",
            true,
          )}
          onChange={(value) =>
            onChange("showIcon", value)
          }
        />
        <Checkbox
          label="Show condition text"
          checked={booleanSetting(
            widget.settings,
            "showText",
            true,
          )}
          onChange={(value) =>
            onChange("showText", value)
          }
        />
      </fieldset>
    );
  }

  if (widget.widgetKey === "hourly-forecast") {
    const displayMode = stringSetting(
      widget.settings,
      "displayMode",
      "cards",
    );

    return (
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          Hourly forecast
        </legend>

        <SelectSetting
          label="Display"
          value={displayMode}
          options={[
            ["cards", "Hourly cards"],
            ["line", "Temperature line chart"],
          ]}
          onChange={(value) =>
            onChange("displayMode", value)
          }
        />

        <SelectSetting
          label="Temperature unit"
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

        <NumberSetting
          label="Default forecast points"
          value={numberSetting(
            widget.settings,
            "hours",
            8,
          )}
          min={4}
          max={12}
          onChange={(value) => onChange("hours", value)}
        />

        {displayMode === "line" ? (
          <>
            <Checkbox
              label="Show temperature labels"
              checked={booleanSetting(
                widget.settings,
                "showPointLabels",
                true,
              )}
              onChange={(value) =>
                onChange("showPointLabels", value)
              }
            />
            <Checkbox
              label="Show rain chance"
              checked={booleanSetting(
                widget.settings,
                "showRainChance",
                false,
              )}
              onChange={(value) =>
                onChange("showRainChance", value)
              }
            />
          </>
        ) : null}
      </fieldset>
    );
  }

  if (widget.widgetKey === "daily-forecast") {
    return (
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          Multi-day forecast
        </legend>
        <NumberSetting
          label="Days"
          value={numberSetting(
            widget.settings,
            "days",
            7,
          )}
          min={3}
          max={7}
          onChange={(value) => onChange("days", value)}
        />
      </fieldset>
    );
  }

  if (widget.widgetKey === "tide-timeline") {
    const displayMode = stringSetting(
      widget.settings,
      "displayMode",
      "list",
    );

    return (
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          Tide timeline
        </legend>

        <SelectSetting
          label="Display"
          value={displayMode}
          options={[
            ["list", "Event cards"],
            ["chart", "Tide curve chart"],
          ]}
          onChange={(value) =>
            onChange("displayMode", value)
          }
        />

        {displayMode === "chart" ? (
          <>
            <Checkbox
              label="Show current-time marker"
              checked={booleanSetting(
                widget.settings,
                "showCurrentMarker",
                true,
              )}
              onChange={(value) =>
                onChange("showCurrentMarker", value)
              }
            />
            <Checkbox
              label="Show high and low labels"
              checked={booleanSetting(
                widget.settings,
                "showHighLowLabels",
                true,
              )}
              onChange={(value) =>
                onChange("showHighLowLabels", value)
              }
            />
          </>
        ) : null}
      </fieldset>
    );
  }

  if (widget.widgetKey === "moon-phase") {
    return (
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          Moon phase
        </legend>

        <Checkbox
          label="Show moon graphic"
          checked={booleanSetting(
            widget.settings,
            "showMoonGraphic",
            true,
          )}
          onChange={(value) =>
            onChange("showMoonGraphic", value)
          }
        />
        <Checkbox
          label="Show phase name"
          checked={booleanSetting(
            widget.settings,
            "showPhaseName",
            true,
          )}
          onChange={(value) =>
            onChange("showPhaseName", value)
          }
        />
        <Checkbox
          label="Show illumination"
          checked={booleanSetting(
            widget.settings,
            "showIllumination",
            true,
          )}
          onChange={(value) =>
            onChange("showIllumination", value)
          }
        />
      </fieldset>
    );
  }


  if (widget.widgetKey === "radar-map") {
    return (
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          Radar
        </legend>

        <NumberSetting
          label="Map zoom"
          value={numberSetting(
            widget.settings,
            "zoom",
            7,
          )}
          min={3}
          max={7}
          onChange={(value) =>
            onChange("zoom", value)
          }
        />

        <SelectSetting
          label="Radar opacity"
          value={String(
            numberSetting(
              widget.settings,
              "opacity",
              0.72,
            ),
          )}
          options={[
            ["0.5", "50%"],
            ["0.72", "72%"],
            ["0.9", "90%"],
            ["1", "100%"],
          ]}
          onChange={(value) =>
            onChange(
              "opacity",
              Number(value),
            )
          }
        />

        <Checkbox
          label="Animate recent frames"
          checked={booleanSetting(
            widget.settings,
            "animate",
            true,
          )}
          onChange={(value) =>
            onChange("animate", value)
          }
        />

        {booleanSetting(
          widget.settings,
          "animate",
          true,
        ) ? (
          <SelectSetting
            label="Animation speed"
            value={String(
              numberSetting(
                widget.settings,
                "frameDurationMs",
                750,
              ),
            )}
            options={[
              ["1200", "Slow"],
              ["750", "Normal"],
              ["450", "Fast"],
            ]}
            onChange={(value) =>
              onChange(
                "frameDurationMs",
                Number(value),
              )
            }
          />
        ) : null}

        <Checkbox
          label="Show location marker"
          checked={booleanSetting(
            widget.settings,
            "showLocationMarker",
            true,
          )}
          onChange={(value) =>
            onChange(
              "showLocationMarker",
              value,
            )
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
        {widget.widgetKey === "wind-forecast" ? (
          <NumberSetting
            label="Forecast points"
            value={numberSetting(
              widget.settings,
              "hours",
              8,
            )}
            min={4}
            max={12}
            onChange={(value) => onChange("hours", value)}
          />
        ) : null}
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

function NumberSetting({
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
    <label className="block text-sm">
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
        {options.map(
          ([optionValue, optionLabel]) => (
            <option
              key={optionValue}
              value={optionValue}
            >
              {optionLabel}
            </option>
          ),
        )}
      </select>
    </label>
  );
}
