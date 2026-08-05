import type {
  DashboardSource,
  LayoutDevice,
  SourceKind,
  WidgetCategory,
  WidgetInstance,
  WidgetKey,
} from "@/types/dashboard";
import type { WeatherSourceState } from "@/types/weather";

export type DefaultPlacement = {
  w: number;
  h: number;
  minW: number;
  minH: number;
};

export type WidgetDefinition = {
  key: WidgetKey;
  name: string;
  description: string;
  category: WidgetCategory;
  sourceKind: SourceKind;
  defaultTitle: string;
  defaultSettings: Record<string, unknown>;
  defaultPlacement: Record<LayoutDevice, DefaultPlacement>;
};

export type WidgetComponentProps = {
  widget: WidgetInstance;
  source: DashboardSource;
  weatherState?: WeatherSourceState;
};
