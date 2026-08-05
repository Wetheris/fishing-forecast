import type { WidgetComponentProps } from "@/widgets/types";
import {
  CompactTimeline,
  DataList,
  MetricValue,
} from "@/widgets/shared/WidgetPrimitives";
import {
  HourlyTemperatureLineChart,
  WeatherConditionIcon,
} from "@/widgets/shared/ForecastVisuals";
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
  widget,
  weatherState,
}: WidgetComponentProps) {
  const showIcon = booleanSetting(
    widget.settings,
    "showIcon",
    true,
  );
  const showText = booleanSetting(
    widget.settings,
    "showText",
    true,
  );

  return (
    <WeatherDataView state={weatherState}>
      {(data) => {
        const shouldShowText = showText || !showIcon;

        return (
          <div
            className={[
              "flex h-full min-h-0 items-center",
              showIcon && shouldShowText
                ? "gap-4"
                : "justify-center",
            ].join(" ")}
          >
            {showIcon ? (
              <WeatherConditionIcon
                weatherCode={data.current.weatherCode}
                condition={data.current.condition}
              />
            ) : null}

            {shouldShowText ? (
              <MetricValue
                value={data.current.condition}
              />
            ) : null}
          </div>
        );
      }}
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
  const unit = stringSetting(
    widget.settings,
    "unit",
    "fahrenheit",
  );
  const displayMode = stringSetting(
    widget.settings,
    "displayMode",
    "cards",
  );
  const showPointLabels = booleanSetting(
    widget.settings,
    "showPointLabels",
    true,
  );
  const showRainChance = booleanSetting(
    widget.settings,
    "showRainChance",
    false,
  );

  return (
    <WeatherDataView state={weatherState}>
      {(data) => {
        const selectedHours = data.hourly.slice(0, hours);
        const temperatureUnit =
          unit === "celsius" ? "C" : "F";

        if (displayMode === "line") {
          return (
            <HourlyTemperatureLineChart
              temperatureUnit={temperatureUnit}
              showPointLabels={showPointLabels}
              showRainChance={showRainChance}
              points={selectedHours.map((hour) => ({
                label: formatLocalHour(hour.time),
                temperature:
                  unit === "celsius"
                    ? hour.temperatureC
                    : celsiusToFahrenheit(
                        hour.temperatureC,
                      ),
                rainChancePercent:
                  hour.rainChancePercent,
              }))}
            />
          );
        }

        return (
          <CompactTimeline
            columns={selectedHours.map((hour) => ({
              label: formatLocalHour(hour.time),
              primary: `${roundMeasurement(
                unit === "celsius"
                  ? hour.temperatureC
                  : celsiusToFahrenheit(
                      hour.temperatureC,
                    ),
              )}°${temperatureUnit}`,
              secondary:
                hour.rainChancePercent === null
                  ? hour.condition
                  : `${roundMeasurement(
                      hour.rainChancePercent,
                    )}% rain`,
            }))}
          />
        );
      }}
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
