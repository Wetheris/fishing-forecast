import type { WidgetComponentProps } from "@/widgets/types";
import {
  CompactTimeline,
  MetricValue,
} from "@/widgets/shared/WidgetPrimitives";
import { WeatherDataView } from "@/widgets/weather/WeatherDataView";
import {
  metersPerSecondToKnots,
  metersPerSecondToMph,
  roundMeasurement,
} from "@/lib/units";
import { formatLocalHour } from "@/lib/date-format";
import {
  booleanSetting,
  numberSetting,
  stringSetting,
} from "@/lib/widget-settings";

export function WindSpeedWidget({
  widget,
  weatherState,
}: WidgetComponentProps) {
  const unit = stringSetting(
    widget.settings,
    "unit",
    "mph",
  );
  const showDirection = booleanSetting(
    widget.settings,
    "showDirection",
    true,
  );

  return (
    <WeatherDataView state={weatherState}>
      {(data) => (
        <MetricValue
          value={formatWind(
            data.current.windSpeedMps,
            unit,
          )}
          detail={
            showDirection
              ? data.current.windDirectionLabel
              : undefined
          }
        />
      )}
    </WeatherDataView>
  );
}

export function WindGustsWidget({
  widget,
  weatherState,
}: WidgetComponentProps) {
  const unit = stringSetting(
    widget.settings,
    "unit",
    "mph",
  );

  return (
    <WeatherDataView state={weatherState}>
      {(data) => (
        <MetricValue
          value={formatWind(
            data.current.windGustMps,
            unit,
          )}
          detail="Current gusts"
        />
      )}
    </WeatherDataView>
  );
}

export function WindDirectionWidget({
  widget,
  weatherState,
}: WidgetComponentProps) {
  const showBearing = booleanSetting(
    widget.settings,
    "showBearing",
    true,
  );

  return (
    <WeatherDataView state={weatherState}>
      {(data) => (
        <MetricValue
          value={data.current.windDirectionLabel}
          detail={
            showBearing
              ? `${roundMeasurement(
                  data.current.windDirectionDegrees,
                )}°`
              : undefined
          }
        />
      )}
    </WeatherDataView>
  );
}

export function WindForecastWidget({
  widget,
  weatherState,
}: WidgetComponentProps) {
  const unit = stringSetting(
    widget.settings,
    "unit",
    "mph",
  );
  const hours = numberSetting(
    widget.settings,
    "hours",
    5,
  );

  return (
    <WeatherDataView state={weatherState}>
      {(data) => (
        <CompactTimeline
          columns={data.hourly
            .slice(0, hours)
            .map((hour) => ({
              label: formatLocalHour(hour.time),
              primary: `${formatWind(
                hour.windSpeedMps,
                unit,
              )} ${hour.windDirectionLabel}`,
              secondary: `Gusts ${formatWind(
                hour.windGustMps,
                unit,
              )}`,
            }))}
        />
      )}
    </WeatherDataView>
  );
}

function formatWind(
  metersPerSecond: number,
  unit: string,
): string {
  if (unit === "knots") {
    return `${roundMeasurement(
      metersPerSecondToKnots(metersPerSecond),
    )} kt`;
  }

  if (unit === "kmh") {
    return `${roundMeasurement(
      metersPerSecond * 3.6,
    )} km/h`;
  }

  return `${roundMeasurement(
    metersPerSecondToMph(metersPerSecond),
  )} mph`;
}
