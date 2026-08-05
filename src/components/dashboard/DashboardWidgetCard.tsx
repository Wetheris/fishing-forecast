import type {
  DashboardSource,
  WidgetInstance,
} from "@/types/dashboard";
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
}: {
  widget: WidgetInstance;
  source: DashboardSource;
  weatherState?: WeatherSourceState;
  tideState?: TideSourceState;
  marineState?: MarineSourceState;
  astronomyState?: AstronomySourceState;
  radarState?: RadarSourceState;
}) {
  return (
    <article className="h-full rounded-2xl border border-[var(--border)] bg-white p-4">
      <WidgetRenderer
        widget={widget}
        source={source}
        weatherState={weatherState}
        tideState={tideState}
        marineState={marineState}
        astronomyState={astronomyState}
        radarState={radarState}
      />
    </article>
  );
}
