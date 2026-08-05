import { widgetComponents } from "@/widgets/component-registry";
import type {
  DashboardSource,
  WidgetInstance,
} from "@/types/dashboard";

export function WidgetRenderer({
  widget,
  source,
}: {
  widget: WidgetInstance;
  source: DashboardSource;
}) {
  const Component = widgetComponents[widget.widgetKey];

  return <Component widget={widget} source={source} />;
}
