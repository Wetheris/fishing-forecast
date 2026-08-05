import type {
  DashboardSource,
  WidgetInstance,
} from "@/types/dashboard";
import type { WeatherSourceState } from "@/types/weather";
import { WidgetRenderer } from "@/components/dashboard/WidgetRenderer";

export function DashboardWidgetCard({
  widget,
  source,
  weatherState,
}: {
  widget: WidgetInstance;
  source: DashboardSource;
  weatherState?: WeatherSourceState;
}) {
  return (
    <article className="h-full rounded-2xl border border-[var(--border)] bg-white p-4">
      <WidgetRenderer
        widget={widget}
        source={source}
        weatherState={weatherState}
      />
    </article>
  );
}
