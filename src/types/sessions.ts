export type SessionConditionSnapshot = {
  capturedAt: string;
  eventTime: string;
  latitude: number;
  longitude: number;
  timezone: string;
  weather?: {
    condition: string;
    temperatureF: number;
    feelsLikeF: number;
    rainChancePercent: number | null;
    windMph: number;
    windGustMph: number;
    windDirection: string;
    windDirectionDegrees: number;
  };
  marine?: {
    waterTemperatureF: number | null;
    waveHeightFt: number;
    wavePeriodSeconds: number;
    waveDirection: string;
    swellHeightFt: number | null;
    swellPeriodSeconds: number | null;
  };
  tide?: {
    stationId: string;
    stationName: string;
    stationDistanceMiles: number | null;
    heightFt: number | null;
    trend:
      | "rising"
      | "falling"
      | "steady"
      | "unknown";
    nextHighTime: string | null;
    nextHighHeightFt: number | null;
    nextLowTime: string | null;
    nextLowHeightFt: number | null;
  };
  moon?: {
    phaseName: string;
    illuminationPercent: number;
  };
  unavailable: string[];
};

export type PhotoStampSettings = {
  showDate: boolean;
  showTime: boolean;
  showSpecies: boolean;
  showLocationName: boolean;
  showCoordinates: boolean;
  showTide: boolean;
  showWaterTemperature: boolean;
  showAirTemperature: boolean;
  showWind: boolean;
  showMoon: boolean;
  showLureBait: boolean;
};

export const DEFAULT_PHOTO_STAMP_SETTINGS: PhotoStampSettings = {
  showDate: true,
  showTime: true,
  showSpecies: true,
  showLocationName: true,
  showCoordinates: false,
  showTide: true,
  showWaterTemperature: true,
  showAirTemperature: false,
  showWind: false,
  showMoon: false,
  showLureBait: false,
};

export type FishingSessionSummary = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  latitude: number;
  longitude: number;
  locationName: string | null;
  notes: string | null;
  catchCount: number;
};

export type FishingCatch = {
  id: string;
  sessionId: string;
  caughtAt: string;
  latitude: number;
  longitude: number;
  locationName: string | null;
  species: string | null;
  lengthValue: number | null;
  weightValue: number | null;
  lureBait: string | null;
  notes: string | null;
  conditions: SessionConditionSnapshot;
  stampSettings: PhotoStampSettings;
  originalPhotoPath: string | null;
  stampedPhotoPath: string | null;
  createdAt: string;
};

export type FishingSessionDetail = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  latitude: number;
  longitude: number;
  locationName: string | null;
  notes: string | null;
  startingConditions: SessionConditionSnapshot;
  catches: FishingCatch[];
};

export type CatchDraft = {
  caughtAt: string;
  latitude: number;
  longitude: number;
  locationName?: string;
  species?: string;
  lengthValue?: number;
  weightValue?: number;
  lureBait?: string;
  notes?: string;
  conditions: SessionConditionSnapshot;
  stampSettings: PhotoStampSettings;
};


export type DroneFishingDrop = {
  id: string;
  sessionId: string;
  rodLabel: string;
  dropNumber: number;
  droppedAt: string;
  retrievedAt: string | null;
  originLatitude: number;
  originLongitude: number;
  latitude: number;
  longitude: number;
  distanceYards: number;
  bearingDegrees: number;
  bait: string | null;
  sinkerOz: number | null;
  estimatedDepthFt: number | null;
  depthSource: "manual" | "unknown";
  conditions: SessionConditionSnapshot;
  biteAt: string | null;
  caughtFishAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DroneFishingDropDraft = {
  rodLabel: string;
  dropNumber: number;
  droppedAt: string;
  originLatitude: number;
  originLongitude: number;
  latitude: number;
  longitude: number;
  distanceYards: number;
  bearingDegrees: number;
  bait?: string;
  sinkerOz?: number;
  estimatedDepthFt?: number;
  conditions: SessionConditionSnapshot;
  notes?: string;
};

export type DroneFishingDropUpdate = {
  biteAt?: string | null;
  caughtFishAt?: string | null;
  retrievedAt?: string | null;
  notes?: string | null;
};
