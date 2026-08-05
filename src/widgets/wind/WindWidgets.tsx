import { mockForecast } from "@/lib/mock-data";
import type { WidgetComponentProps } from "@/widgets/types";
import {
  CompactTimeline,
  MetricValue,
} from "@/widgets/shared/WidgetPrimitives";

export function WindSpeedWidget({ source }: WidgetComponentProps) {
  return (
    <MetricValue
      value={`${mockForecast.wind.speedMph} mph`}
      detail={`${mockForecast.wind.directionLabel} · ${source.label}`}
    />
  );
}

export function WindGustsWidget({ source }: WidgetComponentProps) {
  return (
    <MetricValue
      value={`${mockForecast.wind.gustMph} mph`}
      detail={`Current gusts · ${source.label}`}
    />
  );
}

export function WindDirectionWidget({ source }: WidgetComponentProps) {
  return (
    <MetricValue
      value={mockForecast.wind.directionLabel}
      detail={`${mockForecast.wind.directionDegrees}° · ${source.label}`}
    />
  );
}

export function WindForecastWidget() {
  return (
    <CompactTimeline
      columns={mockForecast.wind.hourly.map((hour) => ({
        label: hour.time,
        primary: `${hour.speedMph} mph ${hour.direction}`,
        secondary: `Gusts ${hour.gustMph} mph`,
      }))}
    />
  );
}
