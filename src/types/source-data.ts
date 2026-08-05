export type LiveSourceState<TData> =
  | {
      status: "idle";
    }
  | {
      status: "loading";
    }
  | {
      status: "success";
      data: TData;
    }
  | {
      status: "error";
      error: string;
    };

export type LiveSourceStateMap<TData> = Record<
  string,
  LiveSourceState<TData>
>;

export type TideEvent = {
  localTime: string;
  displayTime: string;
  type: "high" | "low";
  heightFt: number;
};

export type TideTimelinePoint = {
  localTime: string;
  heightFt: number;
};

export type TideSourceData = {
  provider: "noaa-coops";
  fetchedAt: string;
  datum: string;
  currentLocalTime: string;
  currentHeightFt: number | null;
  currentTrend:
    | "rising"
    | "falling"
    | "steady"
    | "unknown";
  minutesUntilTurn: number | null;

  station: {
    id: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
    distanceMiles: number | null;
  };

  nextHigh: TideEvent | null;
  nextLow: TideEvent | null;
  events: TideEvent[];
  timeline: TideTimelinePoint[];
};

export type MarineHour = {
  time: string;
  waveHeightM: number;
  waveDirectionDegrees: number;
  waveDirectionLabel: string;
  wavePeriodSeconds: number;
  swellHeightM: number | null;
  swellDirectionDegrees: number | null;
  swellDirectionLabel: string | null;
  swellPeriodSeconds: number | null;
};

export type MarineSourceData = {
  provider: "open-meteo-marine";
  fetchedAt: string;
  timezone: string;

  requestedLocation: {
    latitude: number;
    longitude: number;
  };

  resolvedGrid: {
    latitude: number;
    longitude: number;
    distanceMiles: number;
  };

  current: MarineHour;
  hourly: MarineHour[];
};

export type AstronomyEvent = {
  isoTime: string;
  displayTime: string;
};

export type AstronomySourceData = {
  provider: "astronomy-engine";
  calculatedAt: string;
  timezone: string;
  phaseDegrees: number;
  phaseName: string;
  illuminationPercent: number;
  moonrise: AstronomyEvent | null;
  moonset: AstronomyEvent | null;
  sunrise: AstronomyEvent | null;
  sunset: AstronomyEvent | null;
};

export type RadarFrame = {
  time: number;
  path: string;
  isoTime: string;
};

export type RadarSourceData = {
  provider: "rainviewer";
  fetchedAt: string;
  generatedAt: string;
  host: string;
  requestedLocation: {
    latitude: number;
    longitude: number;
  };
  frames: RadarFrame[];
};

export type TideSourceState =
  LiveSourceState<TideSourceData>;
export type TideSourceStateMap =
  LiveSourceStateMap<TideSourceData>;

export type MarineSourceState =
  LiveSourceState<MarineSourceData>;
export type MarineSourceStateMap =
  LiveSourceStateMap<MarineSourceData>;

export type AstronomySourceState =
  LiveSourceState<AstronomySourceData>;
export type AstronomySourceStateMap =
  LiveSourceStateMap<AstronomySourceData>;

export type RadarSourceState =
  LiveSourceState<RadarSourceData>;
export type RadarSourceStateMap =
  LiveSourceStateMap<RadarSourceData>;
