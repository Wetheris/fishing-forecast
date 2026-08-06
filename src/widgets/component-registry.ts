import type { ComponentType } from "react";
import type { WidgetKey } from "@/types/dashboard";
import type { WidgetComponentProps } from "@/widgets/types";
import {
  CurrentConditionsWidget,
  CurrentTemperatureWidget,
  ForecastOverviewWidget,
  DailyForecastWidget,
  HourlyForecastWidget,
  RainChanceWidget,
} from "@/widgets/weather/WeatherWidgets";
import {
  WindDirectionWidget,
  WindForecastWidget,
  WindGustsWidget,
  WindSpeedWidget,
} from "@/widgets/wind/WindWidgets";
import {
  NextHighTideWidget,
  NextLowTideWidget,
  TideStationWidget,
  TideStatusWidget,
  TideTimelineWidget,
} from "@/widgets/tides/TideWidgets";
import {
  SwellInformationWidget,
  WaveDirectionWidget,
  WaveHeightWidget,
  WavePeriodWidget,
} from "@/widgets/waves/WaveWidgets";
import {
  MoonIlluminationWidget,
  MoonPhaseWidget,
  MoonriseMoonsetWidget,
  SunriseSunsetWidget,
} from "@/widgets/astronomy/AstronomyWidgets";
import { RadarWidget } from "@/widgets/radar/RadarWidget";

export const widgetComponents: Record<
  WidgetKey,
  ComponentType<WidgetComponentProps>
> = {
  "forecast-overview": ForecastOverviewWidget,
  "current-temperature":
    CurrentTemperatureWidget,
  "current-conditions":
    CurrentConditionsWidget,
  "rain-chance": RainChanceWidget,
  "hourly-forecast": HourlyForecastWidget,
  "daily-forecast": DailyForecastWidget,
  "radar-map": RadarWidget,
  "wind-speed": WindSpeedWidget,
  "wind-gusts": WindGustsWidget,
  "wind-direction": WindDirectionWidget,
  "wind-forecast": WindForecastWidget,
  "next-high-tide": NextHighTideWidget,
  "next-low-tide": NextLowTideWidget,
  "tide-status": TideStatusWidget,
  "tide-timeline": TideTimelineWidget,
  "tide-station": TideStationWidget,
  "wave-height": WaveHeightWidget,
  "wave-direction": WaveDirectionWidget,
  "wave-period": WavePeriodWidget,
  "swell-information":
    SwellInformationWidget,
  "moon-phase": MoonPhaseWidget,
  "moon-illumination":
    MoonIlluminationWidget,
  "moonrise-moonset":
    MoonriseMoonsetWidget,
  "sunrise-sunset": SunriseSunsetWidget,
};
