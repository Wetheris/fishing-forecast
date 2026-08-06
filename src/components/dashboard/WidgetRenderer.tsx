import { widgetComponents } from "@/widgets/component-registry";
import type {
  DashboardSource,
  WidgetInstance,
} from "@/types/dashboard";
import type { ForecastContext } from "@/types/forecast";
import type {
  AstronomySourceState,
  MarineSourceState,
  RadarSourceState,
  TideSourceState,
} from "@/types/source-data";
import type {
  WeatherSourceState,
} from "@/types/weather";

export function WidgetRenderer({
  widget,
  source,
  weatherState,
  tideState,
  marineState,
  astronomyState,
  radarState,
  forecastContext,
  onForecastDateChange,
  onWidgetSettingsChange,
}: {
  widget: WidgetInstance;
  source: DashboardSource;
  weatherState?: WeatherSourceState;
  tideState?: TideSourceState;
  marineState?: MarineSourceState;
  astronomyState?: AstronomySourceState;
  radarState?: RadarSourceState;
  forecastContext: ForecastContext;
  onForecastDateChange?: (date: string) => void;
  onWidgetSettingsChange?: (
    settings: Record<string, unknown>,
  ) => void;
}) {
  const Component =
    widgetComponents[widget.widgetKey];

  return (
    <Component
      widget={widget}
      source={source}
      weatherState={weatherState}
      tideState={tideState}
      marineState={marineState}
      astronomyState={astronomyState}
      radarState={radarState}
      forecastContext={forecastContext}
      onForecastDateChange={
        onForecastDateChange
      }
      onWidgetSettingsChange={
        onWidgetSettingsChange
      }
    />
  );
}
