import type { DashboardSource } from "@/types/dashboard";

export const mockSources: DashboardSource[] = [
  {
    id: "cape-may-weather",
    kind: "weather-location",
    providerKey: "open-meteo",
    label: "Cape May Point, NJ",
    latitude: 38.9376,
    longitude: -74.9691,
    timezone: "America/New_York",
    settings: {},
  },
  {
    id: "cape-may-tides",
    kind: "tide-station",
    providerKey: "noaa-coops",
    label: "Cape May, NJ — NOAA 8536110",
    latitude: 38.9683,
    longitude: -74.9603,
    timezone: "America/New_York",
    externalId: "8536110",
    settings: {
      datum: "MLLW",
      units: "english",
      distanceMiles: 4.3,
    },
  },
  {
    id: "cape-may-marine",
    kind: "marine-location",
    providerKey: "open-meteo-marine",
    label: "Cape May Offshore",
    latitude: 38.91,
    longitude: -74.89,
    timezone: "America/New_York",
    settings: {
      gridDistanceMiles: 1.8,
    },
  },
  {
    id: "cape-may-astronomy",
    kind: "astronomy-location",
    providerKey: "astronomy-engine",
    label: "Cape May Point, NJ",
    latitude: 38.9376,
    longitude: -74.9691,
    timezone: "America/New_York",
    settings: {},
  },
];

export const mockForecast = {
  tides: {
    nextHigh: { time: "2:46 PM", heightFt: 4.7 },
    nextLow: { time: "9:12 PM", heightFt: 0.3 },
    status: "Rising",
    minutesUntilTurn: 134,
    stationName: "Cape May, NJ",
    stationId: "8536110",
    distanceMiles: 4.3,
    events: [
      { type: "Low", time: "8:21 AM", heightFt: 0.4 },
      { type: "High", time: "2:46 PM", heightFt: 4.7 },
      { type: "Low", time: "9:12 PM", heightFt: 0.3 },
      { type: "High", time: "3:05 AM", heightFt: 4.4 },
    ],
  },
  marine: {
    waveHeightFt: 2.1,
    waveDirection: "SE",
    waveDirectionDegrees: 135,
    wavePeriodSeconds: 7,
    swellHeightFt: 1.6,
    swellDirection: "ESE",
    swellPeriodSeconds: 8,
  },
  astronomy: {
    phaseName: "Waning Gibbous",
    illuminationPercent: 72,
    moonrise: "10:41 PM",
    moonset: "11:16 AM",
    sunrise: "6:03 AM",
    sunset: "8:08 PM",
  },
};
