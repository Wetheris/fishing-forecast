import { mockForecast } from "@/lib/mock-data";
import type { WidgetComponentProps } from "@/widgets/types";
import {
  CompactTimeline,
  DataList,
  MetricValue,
} from "@/widgets/shared/WidgetPrimitives";

export function NextHighTideWidget({ source }: WidgetComponentProps) {
  return (
    <MetricValue
      value={mockForecast.tides.nextHigh.time}
      detail={`${mockForecast.tides.nextHigh.heightFt} ft · ${source.label}`}
    />
  );
}

export function NextLowTideWidget({ source }: WidgetComponentProps) {
  return (
    <MetricValue
      value={mockForecast.tides.nextLow.time}
      detail={`${mockForecast.tides.nextLow.heightFt} ft · ${source.label}`}
    />
  );
}

export function TideStatusWidget() {
  const hours = Math.floor(mockForecast.tides.minutesUntilTurn / 60);
  const minutes = mockForecast.tides.minutesUntilTurn % 60;

  return (
    <MetricValue
      value={mockForecast.tides.status}
      detail={`${hours} hr ${minutes} min until high tide`}
    />
  );
}

export function TideTimelineWidget() {
  return (
    <CompactTimeline
      columns={mockForecast.tides.events.map((event) => ({
        label: event.type,
        primary: event.time,
        secondary: `${event.heightFt} ft`,
      }))}
    />
  );
}

export function TideStationWidget() {
  return (
    <DataList
      rows={[
        { label: "Station", value: mockForecast.tides.stationName },
        { label: "NOAA ID", value: mockForecast.tides.stationId },
        {
          label: "Distance",
          value: `${mockForecast.tides.distanceMiles} miles`,
        },
      ]}
    />
  );
}
