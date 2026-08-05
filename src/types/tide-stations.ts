export type TideStationOption = {
  id: string;
  name: string;
  label: string;
  latitude: number;
  longitude: number;
  distanceMiles: number | null;
  tideType: string | null;
  supportsDetailedPredictions: boolean;
};
