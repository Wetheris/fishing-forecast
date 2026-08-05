export type WeatherSourceData = {
  provider: "open-meteo";
  fetchedAt: string;
  latitude: number;
  longitude: number;
  timezone: string;
  utcOffsetSeconds: number;

  current: {
    time: string;
    temperatureC: number;
    apparentTemperatureC: number;
    weatherCode: number;
    condition: string;
    rainChancePercent: number | null;
    windSpeedMps: number;
    windGustMps: number;
    windDirectionDegrees: number;
    windDirectionLabel: string;
  };

  hourly: Array<{
    time: string;
    temperatureC: number;
    apparentTemperatureC: number;
    weatherCode: number;
    condition: string;
    rainChancePercent: number | null;
    windSpeedMps: number;
    windGustMps: number;
    windDirectionDegrees: number;
    windDirectionLabel: string;
  }>;

  daily: Array<{
    date: string;
    weatherCode: number;
    condition: string;
    temperatureMaxC: number;
    temperatureMinC: number;
    rainChancePercent: number | null;
  }>;
};

export type WeatherSourceState =
  | {
      status: "idle";
    }
  | {
      status: "loading";
    }
  | {
      status: "success";
      data: WeatherSourceData;
    }
  | {
      status: "error";
      error: string;
    };

export type WeatherSourceStateMap = Record<
  string,
  WeatherSourceState
>;
