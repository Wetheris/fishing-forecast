import { mockForecast } from "@/lib/mock-data";
import type { WidgetComponentProps } from "@/widgets/types";
import {
  DataList,
  MetricValue,
} from "@/widgets/shared/WidgetPrimitives";

export function WaveHeightWidget({ source }: WidgetComponentProps) {
  return (
    <MetricValue
      value={`${mockForecast.marine.waveHeightFt} ft`}
      detail={source.label}
    />
  );
}

export function WaveDirectionWidget({ source }: WidgetComponentProps) {
  return (
    <MetricValue
      value={mockForecast.marine.waveDirection}
      detail={`${mockForecast.marine.waveDirectionDegrees}° · ${source.label}`}
    />
  );
}

export function WavePeriodWidget({ source }: WidgetComponentProps) {
  return (
    <MetricValue
      value={`${mockForecast.marine.wavePeriodSeconds} sec`}
      detail={`Wave period · ${source.label}`}
    />
  );
}

export function SwellInformationWidget() {
  return (
    <DataList
      rows={[
        {
          label: "Swell height",
          value: `${mockForecast.marine.swellHeightFt} ft`,
        },
        {
          label: "Swell direction",
          value: mockForecast.marine.swellDirection,
        },
        {
          label: "Swell period",
          value: `${mockForecast.marine.swellPeriodSeconds} sec`,
        },
      ]}
    />
  );
}
