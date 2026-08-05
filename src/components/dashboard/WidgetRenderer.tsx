import { widgetComponents } from "@/widgets/component-registry";
import type {
  DashboardSource,
  WidgetInstance,
} from "@/types/dashboard";
import type { WeatherSourceState } from "@/types/weather";

export function WidgetRenderer({
  widget,
  source,
  weatherState,
}: {
  widget: WidgetInstance;
  source: DashboardSource;
  weatherState?: WeatherSourceState;
}) {
  const Component = widgetComponents[widget.widgetKey];

  return (
    <Component
      widget={widget}
      source={source}
      weatherState={weatherState}
    />
  );
}
