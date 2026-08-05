export type GeocodingResult = {
  id: string;
  name: string;
  label: string;
  latitude: number;
  longitude: number;
  timezone: string;
  country?: string;
  countryCode?: string;
  admin1?: string;
  postcodes: string[];
};

export type WeatherLocationSelection = {
  label: string;
  latitude: number;
  longitude: number;
  timezone: string;
};
