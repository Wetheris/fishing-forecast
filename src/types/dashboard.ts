export type WidgetCategory =
  | "weather"
  | "wind"
  | "tides"
  | "waves"
  | "moon-sun";

export type WidgetSize = "small" | "medium" | "large";

export type SourceKind =
  | "weather-location"
  | "tide-station"
  | "marine-location"
  | "astronomy-location";

export type WidgetKey =
  | "current-temperature"
  | "current-conditions"
  | "rain-chance"
  | "hourly-forecast"
  | "daily-forecast"
  | "wind-speed"
  | "wind-gusts"
  | "wind-direction"
  | "wind-forecast"
  | "next-high-tide"
  | "next-low-tide"
  | "tide-status"
  | "tide-timeline"
  | "tide-station"
  | "wave-height"
  | "wave-direction"
  | "wave-period"
  | "swell-information"
  | "moon-phase"
  | "moon-illumination"
  | "moonrise-moonset"
  | "sunrise-sunset";

export type DashboardSource = {
  id: string;
  kind: SourceKind;
  providerKey: string;
  label: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  externalId?: string;
  settings: Record<string, unknown>;
};

export type WidgetInstance = {
  id: string;
  widgetKey: WidgetKey;
  category: WidgetCategory;
  sourceId: string;
  title: string;
  position: number;
  size: WidgetSize;
  settings: Record<string, unknown>;
};

export type FishingDashboard = {
  id: string;
  name: string;
  slug?: string;
  sources: DashboardSource[];
  widgets: WidgetInstance[];
};
