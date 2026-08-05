import type {
  LayoutDevice,
  WidgetCategory,
  WidgetKey,
} from "@/types/dashboard";
import type {
  DefaultPlacement,
  WidgetDefinition,
} from "@/widgets/types";

const metricDesktop: DefaultPlacement = {
  w: 3,
  h: 2,
  minW: 2,
  minH: 2,
};

const metricMobile: DefaultPlacement = {
  w: 2,
  h: 2,
  minW: 2,
  minH: 2,
};

const mediumDesktop: DefaultPlacement = {
  w: 6,
  h: 3,
  minW: 4,
  minH: 2,
};

const mediumMobile: DefaultPlacement = {
  w: 4,
  h: 3,
  minW: 4,
  minH: 2,
};

const timelineDesktop: DefaultPlacement = {
  w: 12,
  h: 3,
  minW: 6,
  minH: 3,
};

const timelineMobile: DefaultPlacement = {
  w: 4,
  h: 4,
  minW: 4,
  minH: 3,
};

function placements(
  desktop: DefaultPlacement,
  mobile: DefaultPlacement,
): Record<LayoutDevice, DefaultPlacement> {
  return { desktop, mobile };
}

export const widgetDefinitions: WidgetDefinition[] = [
  {
    key: "current-temperature",
    name: "Current Temperature",
    description: "Current and feels-like temperature.",
    category: "weather",
    sourceKind: "weather-location",
    defaultTitle: "Temperature",
    defaultSettings: {
      unit: "fahrenheit",
      showFeelsLike: true,
      showSourceLabel: true,
      showLastUpdated: false,
    },
    defaultPlacement: placements(metricDesktop, metricMobile),
  },
  {
    key: "current-conditions",
    name: "Current Conditions",
    description: "Current sky and precipitation conditions.",
    category: "weather",
    sourceKind: "weather-location",
    defaultTitle: "Conditions",
    defaultSettings: {
      showIcon: true,
      showText: true,
      showSourceLabel: true,
      showLastUpdated: false,
    },
    defaultPlacement: placements(metricDesktop, metricMobile),
  },
  {
    key: "rain-chance",
    name: "Rain Chance",
    description: "Upcoming precipitation probability.",
    category: "weather",
    sourceKind: "weather-location",
    defaultTitle: "Rain Chance",
    defaultSettings: {
      showSourceLabel: true,
      showLastUpdated: false,
    },
    defaultPlacement: placements(metricDesktop, metricMobile),
  },
  {
    key: "hourly-forecast",
    name: "Hourly Forecast",
    description: "A compact hourly weather timeline.",
    category: "weather",
    sourceKind: "weather-location",
    defaultTitle: "Hourly Forecast",
    defaultSettings: {
      displayMode: "cards",
      hours: 5,
      unit: "fahrenheit",
      showPointLabels: true,
      showRainChance: false,
      showSourceLabel: true,
      showLastUpdated: false,
    },
    defaultPlacement: placements(timelineDesktop, timelineMobile),
  },
  {
    key: "daily-forecast",
    name: "Daily Forecast",
    description: "Upcoming daily highs, lows, and conditions.",
    category: "weather",
    sourceKind: "weather-location",
    defaultTitle: "Daily Forecast",
    defaultSettings: {
      days: 5,
      showSourceLabel: true,
      showLastUpdated: false,
    },
    defaultPlacement: placements(timelineDesktop, timelineMobile),
  },

  {
    key: "radar-map",
    name: "Weather Radar",
    description:
      "Animated recent precipitation radar around a selected location.",
    category: "weather",
    sourceKind: "weather-location",
    defaultTitle: "Weather Radar",
    defaultSettings: {
      zoom: 7,
      opacity: 0.72,
      animate: true,
      frameDurationMs: 750,
      showLocationMarker: true,
      showSourceLabel: true,
      showLastUpdated: true,
    },
    defaultPlacement: placements(
      {
        w: 6,
        h: 5,
        minW: 4,
        minH: 4,
      },
      {
        w: 4,
        h: 5,
        minW: 4,
        minH: 4,
      },
    ),
  },
  {
    key: "wind-speed",
    name: "Wind Speed",
    description: "Current sustained wind speed.",
    category: "wind",
    sourceKind: "weather-location",
    defaultTitle: "Wind Speed",
    defaultSettings: {
      unit: "mph",
      showDirection: true,
      showSourceLabel: true,
      showLastUpdated: false,
    },
    defaultPlacement: placements(metricDesktop, metricMobile),
  },
  {
    key: "wind-gusts",
    name: "Wind Gusts",
    description: "Current and expected wind gusts.",
    category: "wind",
    sourceKind: "weather-location",
    defaultTitle: "Wind Gusts",
    defaultSettings: {
      unit: "mph",
      showSourceLabel: true,
      showLastUpdated: false,
    },
    defaultPlacement: placements(metricDesktop, metricMobile),
  },
  {
    key: "wind-direction",
    name: "Wind Direction",
    description: "Compass direction and bearing.",
    category: "wind",
    sourceKind: "weather-location",
    defaultTitle: "Wind Direction",
    defaultSettings: {
      showBearing: true,
      showSourceLabel: true,
      showLastUpdated: false,
    },
    defaultPlacement: placements(metricDesktop, metricMobile),
  },
  {
    key: "wind-forecast",
    name: "Wind Forecast",
    description: "Hourly wind speed, gust, and direction changes.",
    category: "wind",
    sourceKind: "weather-location",
    defaultTitle: "Wind Forecast",
    defaultSettings: {
      unit: "mph",
      hours: 5,
      showSourceLabel: true,
      showLastUpdated: false,
    },
    defaultPlacement: placements(timelineDesktop, timelineMobile),
  },
  {
    key: "next-high-tide",
    name: "Next High Tide",
    description: "Time and predicted height of the next high tide.",
    category: "tides",
    sourceKind: "tide-station",
    defaultTitle: "Next High Tide",
    defaultSettings: {
      heightUnit: "feet",
      showSourceLabel: true,
    },
    defaultPlacement: placements(metricDesktop, metricMobile),
  },
  {
    key: "next-low-tide",
    name: "Next Low Tide",
    description: "Time and predicted height of the next low tide.",
    category: "tides",
    sourceKind: "tide-station",
    defaultTitle: "Next Low Tide",
    defaultSettings: {
      heightUnit: "feet",
      showSourceLabel: true,
    },
    defaultPlacement: placements(metricDesktop, metricMobile),
  },
  {
    key: "tide-status",
    name: "Tide Status",
    description: "Whether the tide is rising, falling, or near a turn.",
    category: "tides",
    sourceKind: "tide-station",
    defaultTitle: "Tide Status",
    defaultSettings: {
      showSourceLabel: true,
    },
    defaultPlacement: placements(metricDesktop, metricMobile),
  },
  {
    key: "tide-timeline",
    name: "Tide Timeline",
    description: "Upcoming high and low tide events.",
    category: "tides",
    sourceKind: "tide-station",
    defaultTitle: "Tide Timeline",
    defaultSettings: {
      displayMode: "list",
      heightUnit: "feet",
      showCurrentMarker: true,
      showHighLowLabels: true,
      showSourceLabel: true,
    },
    defaultPlacement: placements(timelineDesktop, timelineMobile),
  },
  {
    key: "tide-station",
    name: "Tide Station",
    description: "Station identity and distance from the fishing location.",
    category: "tides",
    sourceKind: "tide-station",
    defaultTitle: "Tide Station",
    defaultSettings: {
      showSourceLabel: true,
    },
    defaultPlacement: placements(mediumDesktop, mediumMobile),
  },
  {
    key: "wave-height",
    name: "Wave Height",
    description: "Current significant wave height.",
    category: "waves",
    sourceKind: "marine-location",
    defaultTitle: "Wave Height",
    defaultSettings: {
      lengthUnit: "feet",
      showSourceLabel: true,
    },
    defaultPlacement: placements(metricDesktop, metricMobile),
  },
  {
    key: "wave-direction",
    name: "Wave Direction",
    description: "Direction waves are arriving from.",
    category: "waves",
    sourceKind: "marine-location",
    defaultTitle: "Wave Direction",
    defaultSettings: {
      showBearing: true,
      showSourceLabel: true,
    },
    defaultPlacement: placements(metricDesktop, metricMobile),
  },
  {
    key: "wave-period",
    name: "Wave Period",
    description: "Time between successive wave crests.",
    category: "waves",
    sourceKind: "marine-location",
    defaultTitle: "Wave Period",
    defaultSettings: {
      showSourceLabel: true,
    },
    defaultPlacement: placements(metricDesktop, metricMobile),
  },
  {
    key: "swell-information",
    name: "Swell Information",
    description: "Swell height, direction, and period.",
    category: "waves",
    sourceKind: "marine-location",
    defaultTitle: "Swell",
    defaultSettings: {
      lengthUnit: "feet",
      showSourceLabel: true,
    },
    defaultPlacement: placements(mediumDesktop, mediumMobile),
  },
  {
    key: "moon-phase",
    name: "Moon Phase",
    description: "Current lunar phase.",
    category: "moon-sun",
    sourceKind: "astronomy-location",
    defaultTitle: "Moon Phase",
    defaultSettings: {
      showMoonGraphic: true,
      showPhaseName: true,
      showIllumination: true,
      showSourceLabel: true,
    },
    defaultPlacement: placements(metricDesktop, metricMobile),
  },
  {
    key: "moon-illumination",
    name: "Moon Illumination",
    description: "Visible percentage of the Moon.",
    category: "moon-sun",
    sourceKind: "astronomy-location",
    defaultTitle: "Moon Illumination",
    defaultSettings: {
      showSourceLabel: true,
    },
    defaultPlacement: placements(metricDesktop, metricMobile),
  },
  {
    key: "moonrise-moonset",
    name: "Moonrise & Moonset",
    description: "Local Moon rise and set times.",
    category: "moon-sun",
    sourceKind: "astronomy-location",
    defaultTitle: "Moonrise & Moonset",
    defaultSettings: {
      showSourceLabel: true,
    },
    defaultPlacement: placements(mediumDesktop, mediumMobile),
  },
  {
    key: "sunrise-sunset",
    name: "Sunrise & Sunset",
    description: "Local daylight times.",
    category: "moon-sun",
    sourceKind: "astronomy-location",
    defaultTitle: "Sunrise & Sunset",
    defaultSettings: {
      showSourceLabel: true,
    },
    defaultPlacement: placements(mediumDesktop, mediumMobile),
  },
];

export const categoryLabels: Record<WidgetCategory, string> = {
  weather: "Weather",
  wind: "Wind",
  tides: "Tides",
  waves: "Waves",
  "moon-sun": "Moon & Sun",
};

export const categoryOrder: WidgetCategory[] = [
  "weather",
  "wind",
  "tides",
  "waves",
  "moon-sun",
];

export function getWidgetDefinition(
  key: WidgetKey,
): WidgetDefinition {
  const definition = widgetDefinitions.find(
    (item) => item.key === key,
  );

  if (!definition) {
    throw new Error(`Unknown widget: ${key}`);
  }

  return definition;
}
