export type ForecastContext = {
  selectedDate: string;
  todayDate: string;
  timezone: string;
};

export type ForecastMetric =
  | "temperature"
  | "precipitation"
  | "wind";
