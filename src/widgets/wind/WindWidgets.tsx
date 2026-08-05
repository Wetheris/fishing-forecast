import type { WidgetComponentProps } from "@/widgets/types";
import {
  CompactTimeline,
  MetricValue,
} from "@/widgets/shared/WidgetPrimitives";
import { WeatherDataView } from "@/widgets/weather/WeatherDataView";
import {
  metersPerSecondToMph,
  roundMeasurement,
} from "@/lib/units";
import { formatLocalHour } from "@/lib/date-format";

export function WindSpeedWidget({
  source,
  weatherState,
}: WidgetComponentProps) {
  return (
    <WeatherDataView state={weatherState}>
      {(data) => (
        <MetricValue
          value={`${roundMeasurement(
            metersPerSecondToMph(
              data.current.windSpeedMps,
            ),
          )} mph`}
          detail={`${data.current.windDirectionLabel} · ${source.label}`}
        />
      )}
    </WeatherDataView>
  );
}

export function WindGustsWidget({
  source,
  weatherState,
}: WidgetComponentProps) {
  return (
    <WeatherDataView state={weatherState}>
      {(data) => (
        <MetricValue
          value={`${roundMeasurement(
            metersPerSecondToMph(
              data.current.windGustMps,
            ),
          )} mph`}
          detail={`Current gusts · ${source.label}`}
        />
      )}
    </WeatherDataView>
  );
}

export function WindDirectionWidget({
  source,
  weatherState,
}: WidgetComponentProps) {
  return (
    <WeatherDataView state={weatherState}>
      {(data) => (
        <MetricValue
          value={data.current.windDirectionLabel}
          detail={`${roundMeasurement(
            data.current.windDirectionDegrees,
          )}° · ${source.label}`}
        />
      )}
    </WeatherDataView>
  );
}

export function WindForecastWidget({
  weatherState,
}: WidgetComponentProps) {
  return (
    <WeatherDataView state={weatherState}>
      {(data) => (
        <CompactTimeline
          columns={data.hourly.slice(0, 5).map((hour) => ({
            label: formatLocalHour(hour.time),
            primary: `${roundMeasurement(
              metersPerSecondToMph(hour.windSpeedMps),
            )} mph ${hour.windDirectionLabel}`,
            secondary: `Gusts ${roundMeasurement(
              metersPerSecondToMph(hour.windGustMps),
            )} mph`,
          }))}
        />
      )}
    </WeatherDataView>
  );
}
