import type {
  DashboardSource,
  LayoutDevice,
  SourceKind,
  WidgetCategory,
  WidgetInstance,
  WidgetKey,
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
  defaultPlacement: Record<
    LayoutDevice,
    DefaultPlacement
  >;
};

export type WidgetComponentProps = {
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
};
