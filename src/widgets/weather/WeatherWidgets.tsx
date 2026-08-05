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

export function CurrentTemperatureWidget({
  source,
  weatherState,
}: WidgetComponentProps) {
  return (
    <WeatherDataView state={weatherState}>
      {(data) => (
        <MetricValue
          value={`${roundMeasurement(
            celsiusToFahrenheit(
              data.current.temperatureC,
            ),
          )}°F`}
          detail={`Feels like ${roundMeasurement(
            celsiusToFahrenheit(
              data.current.apparentTemperatureC,
            ),
          )}°F · ${source.label}`}
        />
      )}
    </WeatherDataView>
  );
}

export function CurrentConditionsWidget({
  source,
  weatherState,
}: WidgetComponentProps) {
  return (
    <WeatherDataView state={weatherState}>
      {(data) => (
        <MetricValue
          value={data.current.condition}
          detail={source.label}
        />
      )}
    </WeatherDataView>
  );
}

export function RainChanceWidget({
  source,
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
          detail={`Current hour · ${source.label}`}
        />
      )}
    </WeatherDataView>
  );
}

export function HourlyForecastWidget({
  weatherState,
}: WidgetComponentProps) {
  return (
    <WeatherDataView state={weatherState}>
      {(data) => (
        <CompactTimeline
          columns={data.hourly.slice(0, 5).map((hour) => ({
            label: formatLocalHour(hour.time),
            primary: `${roundMeasurement(
              celsiusToFahrenheit(hour.temperatureC),
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
  weatherState,
}: WidgetComponentProps) {
  return (
    <WeatherDataView state={weatherState}>
      {(data) => (
        <DataList
          rows={data.daily.slice(0, 5).map((day) => ({
            label: `${formatForecastDay(day.date)} · ${
              day.condition
            }`,
            value: `${roundMeasurement(
              celsiusToFahrenheit(day.temperatureMaxC),
            )}° / ${roundMeasurement(
              celsiusToFahrenheit(day.temperatureMinC),
            )}°`,
          }))}
        />
      )}
    </WeatherDataView>
  );
}
