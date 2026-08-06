import type { WidgetComponentProps } from "@/widgets/types";
import {
  MetricValue,
  WidgetDataMessage,
} from "@/widgets/shared/WidgetPrimitives";
import { WindDirectionArrow } from "@/widgets/shared/WindDirectionArrow";
import { WeatherDataView } from "@/widgets/weather/WeatherDataView";
import {
  metersPerSecondToKnots,
  metersPerSecondToMph,
  roundMeasurement,
} from "@/lib/units";
import { formatLocalHour } from "@/lib/date-format";
import {
  dateKeyFromLocalTime,
  formatCompactForecastDateLabel,
  formatForecastDateLabel,
  selectDefaultForecastHours,
} from "@/lib/forecast-selection";
import { summarizeWeatherDay } from "@/lib/weather-summary";
import {
  booleanSetting,
  numberSetting,
  stringSetting,
} from "@/lib/widget-settings";

export function WindSpeedWidget({
  widget,
  weatherState,
  forecastContext,
}: WidgetComponentProps) {
  const unit = stringSetting(
    widget.settings,
    "unit",
    "mph",
  );
  const showDirection = booleanSetting(
    widget.settings,
    "showDirection",
    true,
  );

  return (
    <WeatherDataView state={weatherState}>
      {(data) => {
        const isToday =
          forecastContext.selectedDate ===
          forecastContext.todayDate;

        if (isToday) {
          return (
            <div className="flex h-full min-h-0 items-center gap-3">
              {showDirection ? (
                <WindDirectionArrow
                  fromDegrees={
                    data.current
                      .windDirectionDegrees
                  }
                  size={44}
                />
              ) : null}
              <MetricValue
                value={formatWind(
                  data.current.windSpeedMps,
                  unit,
                )}
                detail={
                  showDirection
                    ? `From ${data.current.windDirectionLabel}`
                    : "Live now"
                }
              />
            </div>
          );
        }

        const summary = summarizeWeatherDay(
          data,
          forecastContext.selectedDate,
        );

        if (
          summary.windMinimumMps === null ||
          summary.windMaximumMps === null
        ) {
          return (
            <MetricValue
              value="Unavailable"
              detail="No wind forecast for this date."
            />
          );
        }

        return (
          <MetricValue
            value={formatWindRange(
              summary.windMinimumMps,
              summary.windMaximumMps,
              unit,
            )}
            detail={
              summary.dominantWindLabel
                ? `Mostly from ${summary.dominantWindLabel}`
                : "Daily wind range"
            }
          />
        );
      }}
    </WeatherDataView>
  );
}

export function WindGustsWidget({
  widget,
  weatherState,
  forecastContext,
}: WidgetComponentProps) {
  const unit = stringSetting(
    widget.settings,
    "unit",
    "mph",
  );

  return (
    <WeatherDataView state={weatherState}>
      {(data) => {
        const isToday =
          forecastContext.selectedDate ===
          forecastContext.todayDate;

        if (isToday) {
          return (
            <MetricValue
              value={formatWind(
                data.current.windGustMps,
                unit,
              )}
              detail="Current gusts"
            />
          );
        }

        const maximumGust = summarizeWeatherDay(
          data,
          forecastContext.selectedDate,
        ).maximumGustMps;

        return (
          <MetricValue
            value={
              maximumGust === null
                ? "Unavailable"
                : formatWind(maximumGust, unit)
            }
            detail="Maximum forecast gust"
          />
        );
      }}
    </WeatherDataView>
  );
}

export function WindDirectionWidget({
  widget,
  weatherState,
  forecastContext,
}: WidgetComponentProps) {
  const showBearing = booleanSetting(
    widget.settings,
    "showBearing",
    true,
  );

  return (
    <WeatherDataView state={weatherState}>
      {(data) => {
        const isToday =
          forecastContext.selectedDate ===
          forecastContext.todayDate;

        if (isToday) {
          return (
            <div className="flex h-full min-h-0 items-center gap-3">
              <WindDirectionArrow
                fromDegrees={
                  data.current.windDirectionDegrees
                }
                size={48}
              />
              <MetricValue
                value={data.current.windDirectionLabel}
                detail={
                  showBearing
                    ? `From ${roundMeasurement(
                        data.current
                          .windDirectionDegrees,
                      )}°`
                    : "Live now"
                }
              />
            </div>
          );
        }

        const summary = summarizeWeatherDay(
          data,
          forecastContext.selectedDate,
        );
        const directions = [
          summary.morningWindLabel,
          summary.afternoonWindLabel,
          summary.eveningWindLabel,
        ].filter(
          (value): value is string => value !== null,
        );
        const uniqueDirections = [
          ...new Set(directions),
        ];

        return (
          <MetricValue
            value={
              uniqueDirections.length === 0
                ? "Unavailable"
                : uniqueDirections.join(" → ")
            }
            detail="Morning → afternoon → evening"
          />
        );
      }}
    </WeatherDataView>
  );
}

export function WindForecastWidget({
  widget,
  weatherState,
  forecastContext,
}: WidgetComponentProps) {
  const unit = stringSetting(
    widget.settings,
    "unit",
    "mph",
  );
  const hours = numberSetting(
    widget.settings,
    "hours",
    8,
  );

  return (
    <WeatherDataView state={weatherState}>
      {(data) => {
        const selectedHours =
          selectDefaultForecastHours({
            hourly: data.hourly,
            selectedDate:
              forecastContext.selectedDate,
            todayDate: forecastContext.todayDate,
            currentLocalTime: data.current.time,
            count: Math.max(
              1,
              Math.min(12, hours),
            ),
          });

        if (selectedHours.length === 0) {
          return (
            <WidgetDataMessage
              title="Wind forecast unavailable"
              detail={`No hourly wind data is available for ${formatForecastDateLabel(
                {
                  date: forecastContext.selectedDate,
                  todayDate:
                    forecastContext.todayDate,
                },
              )}.`}
            />
          );
        }

        return (
          <div
            className="grid h-full min-h-0 grid-flow-col gap-2 overflow-x-auto pb-1"
            style={{
              gridAutoColumns:
                "minmax(104px, 1fr)",
            }}
          >
            {selectedHours.map((hour) => (
              <div
                key={hour.time}
                className="flex min-w-0 flex-col items-center justify-center rounded-xl bg-[var(--surface-muted)] p-3 text-center"
              >
                <p className="text-xs text-[var(--muted)]">
                  {formatHourLabel(
                    hour.time,
                    forecastContext.todayDate,
                    forecastContext.selectedDate,
                  )}
                </p>
                <WindDirectionArrow
                  fromDegrees={
                    hour.windDirectionDegrees
                  }
                  size={40}
                />
                <p className="font-medium">
                  {formatWind(
                    hour.windSpeedMps,
                    unit,
                  )}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  From {hour.windDirectionLabel}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  Gusts {formatWind(
                    hour.windGustMps,
                    unit,
                  )}
                </p>
              </div>
            ))}
          </div>
        );
      }}
    </WeatherDataView>
  );
}

function formatWind(
  metersPerSecond: number,
  unit: string,
): string {
  if (unit === "knots") {
    return `${roundMeasurement(
      metersPerSecondToKnots(metersPerSecond),
    )} kt`;
  }

  if (unit === "kmh") {
    return `${roundMeasurement(
      metersPerSecond * 3.6,
    )} km/h`;
  }

  return `${roundMeasurement(
    metersPerSecondToMph(metersPerSecond),
  )} mph`;
}

function formatWindRange(
  minimum: number,
  maximum: number,
  unit: string,
): string {
  const first = formatWind(minimum, unit);
  const second = formatWind(maximum, unit);

  if (first === second) {
    return first;
  }

  const firstValue = first.split(" ")[0];
  return `${firstValue}–${second}`;
}

function formatHourLabel(
  localDateTime: string,
  todayDate: string,
  selectedDate: string,
): string {
  const date = dateKeyFromLocalTime(localDateTime);
  const time = formatLocalHour(localDateTime);

  return date === selectedDate
    ? time
    : `${formatCompactForecastDateLabel({
        date,
        todayDate,
      })} ${time}`;
}
