import type { WidgetComponentProps } from "@/widgets/types";
import {
  DataList,
  MetricValue,
} from "@/widgets/shared/WidgetPrimitives";
import { LiveDataView } from "@/widgets/shared/LiveDataView";
import { MoonPhaseGraphic } from "@/widgets/shared/ForecastVisuals";
import { booleanSetting } from "@/lib/widget-settings";

export function MoonPhaseWidget({
  widget,
  astronomyState,
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

  return (
    <LiveDataView
      state={astronomyState}
      sourceName="moon data"
      loadingDetail="Calculating the Moon phase for this location."
    >
      {(data) => {
        if (!showMoonGraphic) {
          return (
            <MetricValue
              value={
                showPhaseName
                  ? data.phaseName
                  : `${Math.round(
                      data.illuminationPercent,
                    )}%`
              }
              detail={
                showIllumination &&
                showPhaseName
                  ? `${Math.round(
                      data.illuminationPercent,
                    )}% illuminated`
                  : undefined
              }
            />
          );
        }

        return (
          <div className="flex h-full min-h-0 items-center justify-center gap-5">
            <MoonPhaseGraphic
              phaseName={data.phaseName}
              illuminationPercent={
                data.illuminationPercent
              }
            />

            {showPhaseName ||
            showIllumination ? (
              <div className="min-w-0">
                {showPhaseName ? (
                  <p className="text-xl font-semibold">
                    {data.phaseName}
                  </p>
                ) : null}
                {showIllumination ? (
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {Math.round(
                      data.illuminationPercent,
                    )}
                    % illuminated
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      }}
    </LiveDataView>
  );
}

export function MoonIlluminationWidget({
  astronomyState,
}: WidgetComponentProps) {
  return (
    <LiveDataView
      state={astronomyState}
      sourceName="moon data"
      loadingDetail="Calculating lunar illumination."
    >
      {(data) => (
        <MetricValue
          value={`${Math.round(
            data.illuminationPercent,
          )}%`}
          detail="Illuminated"
        />
      )}
    </LiveDataView>
  );
}

export function MoonriseMoonsetWidget({
  astronomyState,
}: WidgetComponentProps) {
  return (
    <LiveDataView
      state={astronomyState}
      sourceName="moon data"
      loadingDetail="Calculating moonrise and moonset."
    >
      {(data) => (
        <DataList
          rows={[
            {
              label: "Moonrise",
              value:
                data.moonrise?.displayTime ??
                "No event found",
            },
            {
              label: "Moonset",
              value:
                data.moonset?.displayTime ??
                "No event found",
            },
          ]}
        />
      )}
    </LiveDataView>
  );
}

export function SunriseSunsetWidget({
  astronomyState,
}: WidgetComponentProps) {
  return (
    <LiveDataView
      state={astronomyState}
      sourceName="sun data"
      loadingDetail="Calculating sunrise and sunset."
    >
      {(data) => (
        <DataList
          rows={[
            {
              label: "Sunrise",
              value:
                data.sunrise?.displayTime ??
                "No event found",
            },
            {
              label: "Sunset",
              value:
                data.sunset?.displayTime ??
                "No event found",
            },
          ]}
        />
      )}
    </LiveDataView>
  );
}
