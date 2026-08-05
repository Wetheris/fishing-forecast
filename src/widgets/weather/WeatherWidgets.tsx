import { mockForecast } from "@/lib/mock-data";
import type { WidgetComponentProps } from "@/widgets/types";
import {
  CompactTimeline,
  DataList,
  MetricValue,
} from "@/widgets/shared/WidgetPrimitives";

export function CurrentTemperatureWidget({
  source,
}: WidgetComponentProps) {
  return (
    <MetricValue
      value={`${mockForecast.weather.temperatureF}°F`}
      detail={`Feels like ${mockForecast.weather.feelsLikeF}°F · ${source.label}`}
    />
  );
}

export function CurrentConditionsWidget({
  source,
}: WidgetComponentProps) {
  return (
    <MetricValue
      value={mockForecast.weather.condition}
      detail={source.label}
    />
  );
}

export function RainChanceWidget({
  source,
}: WidgetComponentProps) {
  return (
    <MetricValue
      value={`${mockForecast.weather.rainChancePercent}%`}
      detail={`Next hour · ${source.label}`}
    />
  );
}

export function HourlyForecastWidget() {
  return (
    <CompactTimeline
      columns={mockForecast.weather.hourly.map((hour) => ({
        label: hour.time,
        primary: `${hour.temperatureF}°F`,
        secondary: `${hour.rainChancePercent}% rain`,
      }))}
    />
  );
}

export function DailyForecastWidget() {
  return (
    <DataList
      rows={mockForecast.weather.daily.map((day) => ({
        label: `${day.day} · ${day.condition}`,
        value: `${day.highF}° / ${day.lowF}°`,
      }))}
    />
  );
}
