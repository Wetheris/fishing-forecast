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
import { WidgetRenderer } from "@/components/dashboard/WidgetRenderer";

export function DashboardWidgetCard({
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
  return (
    <article className="h-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <WidgetRenderer
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
    </article>
  );
}
