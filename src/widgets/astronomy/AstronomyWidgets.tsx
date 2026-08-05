import { mockForecast } from "@/lib/mock-data";
import type { WidgetComponentProps } from "@/widgets/types";
import {
  DataList,
  MetricValue,
} from "@/widgets/shared/WidgetPrimitives";

export function MoonPhaseWidget({ source }: WidgetComponentProps) {
  return (
    <MetricValue
      value={mockForecast.astronomy.phaseName}
      detail={source.label}
    />
  );
}

export function MoonIlluminationWidget({ source }: WidgetComponentProps) {
  return (
    <MetricValue
      value={`${mockForecast.astronomy.illuminationPercent}%`}
      detail={`Illuminated · ${source.label}`}
    />
  );
}

export function MoonriseMoonsetWidget() {
  return (
    <DataList
      rows={[
        { label: "Moonrise", value: mockForecast.astronomy.moonrise },
        { label: "Moonset", value: mockForecast.astronomy.moonset },
      ]}
    />
  );
}

export function SunriseSunsetWidget() {
  return (
    <DataList
      rows={[
        { label: "Sunrise", value: mockForecast.astronomy.sunrise },
        { label: "Sunset", value: mockForecast.astronomy.sunset },
      ]}
    />
  );
}
