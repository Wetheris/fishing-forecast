import { mockForecast } from "@/lib/mock-data";
import type { WidgetComponentProps } from "@/widgets/types";
import {
  DataList,
  MetricValue,
} from "@/widgets/shared/WidgetPrimitives";
import { MoonPhaseGraphic } from "@/widgets/shared/ForecastVisuals";
import { booleanSetting } from "@/lib/widget-settings";

export function MoonPhaseWidget({
  widget,
}: WidgetComponentProps) {
  const showMoonGraphic = booleanSetting(
    widget.settings,
    "showMoonGraphic",
    true,
  );
  const showPhaseName = booleanSetting(
    widget.settings,
    "showPhaseName",
    true,
  );
  const showIllumination = booleanSetting(
    widget.settings,
    "showIllumination",
    true,
  );

  if (!showMoonGraphic) {
    return (
      <MetricValue
        value={
          showPhaseName
            ? mockForecast.astronomy.phaseName
            : `${mockForecast.astronomy.illuminationPercent}%`
        }
        detail={
          showIllumination && showPhaseName
            ? `${mockForecast.astronomy.illuminationPercent}% illuminated`
            : undefined
        }
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 items-center justify-center gap-5">
      <MoonPhaseGraphic
        phaseName={mockForecast.astronomy.phaseName}
        illuminationPercent={
          mockForecast.astronomy.illuminationPercent
        }
      />

      {showPhaseName || showIllumination ? (
        <div className="min-w-0">
          {showPhaseName ? (
            <p className="text-xl font-semibold">
              {mockForecast.astronomy.phaseName}
            </p>
          ) : null}
          {showIllumination ? (
            <p className="mt-1 text-sm text-[var(--muted)]">
              {
                mockForecast.astronomy
                  .illuminationPercent
              }
              % illuminated
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function MoonIlluminationWidget() {
  return (
    <MetricValue
      value={`${mockForecast.astronomy.illuminationPercent}%`}
      detail="Illuminated"
    />
  );
}

export function MoonriseMoonsetWidget() {
  return (
    <DataList
      rows={[
        {
          label: "Moonrise",
          value: mockForecast.astronomy.moonrise,
        },
        {
          label: "Moonset",
          value: mockForecast.astronomy.moonset,
        },
      ]}
    />
  );
}

export function SunriseSunsetWidget() {
  return (
    <DataList
      rows={[
        {
          label: "Sunrise",
          value: mockForecast.astronomy.sunrise,
        },
        {
          label: "Sunset",
          value: mockForecast.astronomy.sunset,
        },
      ]}
    />
  );
}
