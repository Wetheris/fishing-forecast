import type { WidgetComponentProps } from "@/widgets/types";
import {
  CompactTimeline,
  DataList,
  MetricValue,
} from "@/widgets/shared/WidgetPrimitives";
import { WeatherDataView } from "@/widgets/weather/WeatherDataView";
import {
  celsiusToFahrenheit,
  roundMeasurement,
} from "@/lib/units";
import {
  formatForecastDay,
  formatLocalHour,
} from "@/lib/date-format";
import {
  booleanSetting,
  numberSetting,
  stringSetting,
} from "@/lib/widget-settings";

export function CurrentTemperatureWidget({
  widget,
  weatherState,
}: WidgetComponentProps) {
  const unit = stringSetting(
    widget.settings,
    "unit",
    "fahrenheit",
  );
  const showFeelsLike = booleanSetting(
    widget.settings,
    "showFeelsLike",
    true,
  );

  return (
    <WeatherDataView state={weatherState}>
      {(data) => {
        const temperature =
          unit === "celsius"
            ? data.current.temperatureC
            : celsiusToFahrenheit(
                data.current.temperatureC,
              );
        const feelsLike =
          unit === "celsius"
            ? data.current.apparentTemperatureC
            : celsiusToFahrenheit(
                data.current.apparentTemperatureC,
              );
        const symbol = unit === "celsius" ? "C" : "F";

        return (
          <MetricValue
            value={`${roundMeasurement(
              temperature,
            )}°${symbol}`}
            detail={
              showFeelsLike
                ? `Feels like ${roundMeasurement(
                    feelsLike,
                  )}°${symbol}`
                : undefined
            }
          />
        );
      }}
    </WeatherDataView>
  );
}

export function CurrentConditionsWidget({
  weatherState,
}: WidgetComponentProps) {
  return (
    <WeatherDataView state={weatherState}>
      {(data) => (
        <MetricValue value={data.current.condition} />
      )}
    </WeatherDataView>
  );
}

export function RainChanceWidget({
  weatherState,
}: WidgetComponentProps) {
  return (
    <WeatherDataView state={weatherState}>
      {(data) => (
        <MetricValue
          value={
            data.current.rainChancePercent === null
              ? "—"
              : `${roundMeasurement(
                  data.current.rainChancePercent,
                )}%`
          }
          detail="Current hour"
        />
      )}
    </WeatherDataView>
  );
}

export function HourlyForecastWidget({
  widget,
  weatherState,
}: WidgetComponentProps) {
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
              primary: `${roundMeasurement(
                celsiusToFahrenheit(
                  hour.temperatureC,
                ),
              )}°F`,
              secondary:
                hour.rainChancePercent === null
                  ? hour.condition
                  : `${roundMeasurement(
                      hour.rainChancePercent,
                    )}% rain`,
            }))}
        />
      )}
    </WeatherDataView>
  );
}

export function DailyForecastWidget({
  widget,
  weatherState,
}: WidgetComponentProps) {
  const days = numberSetting(
    widget.settings,
    "days",
    5,
  );

  return (
    <WeatherDataView state={weatherState}>
      {(data) => (
        <DataList
          rows={data.daily
            .slice(0, days)
            .map((day) => ({
              label: `${formatForecastDay(
                day.date,
              )} · ${day.condition}`,
              value: `${roundMeasurement(
                celsiusToFahrenheit(
                  day.temperatureMaxC,
                ),
              )}° / ${roundMeasurement(
                celsiusToFahrenheit(
                  day.temperatureMinC,
                ),
              )}°`,
            }))}
        />
      )}
    </WeatherDataView>
  );
}
