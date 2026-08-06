"use client";

import { useState } from "react";
import type { WidgetComponentProps } from "@/widgets/types";
import {
  MetricValue,
  WidgetDataMessage,
} from "@/widgets/shared/WidgetPrimitives";
import {
  HourlyTemperatureLineChart,
  WeatherConditionIcon,
} from "@/widgets/shared/ForecastVisuals";
import { WindDirectionArrow } from "@/widgets/shared/WindDirectionArrow";
import { WeatherDataView } from "@/widgets/weather/WeatherDataView";
import {
  celsiusToFahrenheit,
  metersPerSecondToMph,
  roundMeasurement,
} from "@/lib/units";
import { formatLocalHour } from "@/lib/date-format";
import {
  dateKeyFromLocalTime,
  formatCompactForecastDateLabel,
  formatForecastDateLabel,
  selectDefaultForecastHours,
  selectExpandedForecastHours,
} from "@/lib/forecast-selection";
import { summarizeWeatherDay } from "@/lib/weather-summary";
import {
  booleanSetting,
  numberSetting,
  stringSetting,
} from "@/lib/widget-settings";
import type { ForecastMetric } from "@/types/forecast";
import type { WeatherSourceData } from "@/types/weather";

export function ForecastOverviewWidget({
  widget,
  weatherState,
  forecastContext,
}: WidgetComponentProps) {
  const unit = stringSetting(
    widget.settings,
    "unit",
    "fahrenheit",
  );
  const compact =
    stringSetting(
      widget.settings,
      "density",
      "standard",
    ) === "compact";

  return (
    <WeatherDataView state={weatherState}>
      {(data) => {
        const summary = summarizeWeatherDay(
          data,
          forecastContext.selectedDate,
        );
        const day = summary.daily;

        if (!day) {
          return (
            <WidgetDataMessage
              title="Forecast unavailable"
              detail={`Weather data is not available for ${formatForecastDateLabel(
                {
                  date: forecastContext.selectedDate,
                  todayDate:
                    forecastContext.todayDate,
                },
              )}.`}
            />
          );
        }

        const isToday =
          forecastContext.selectedDate ===
          forecastContext.todayDate;
        const symbol = unit === "celsius" ? "C" : "F";
        const high = temperatureValue(
          day.temperatureMaxC,
          unit,
        );
        const low = temperatureValue(
          day.temperatureMinC,
          unit,
        );
        const current = temperatureValue(
          data.current.temperatureC,
          unit,
        );
        const windRange = formatWindRange(
          summary.windMinimumMps,
          summary.windMaximumMps,
        );
        const maximumGust =
          summary.maximumGustMps === null
            ? "Unavailable"
            : `${roundMeasurement(
                metersPerSecondToMph(
                  summary.maximumGustMps,
                ),
              )} mph`;
        const dateLabel = formatForecastDateLabel({
          date: forecastContext.selectedDate,
          todayDate: forecastContext.todayDate,
        });

        if (compact) {
          return (
            <div className="grid h-full min-h-0 grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] items-center gap-3 overflow-hidden">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium uppercase tracking-wide text-[var(--accent)]">
                  {dateLabel}
                </p>
                <p className="truncate font-semibold">
                  {isToday
                    ? `${current}°${symbol} · ${high}°/${low}°`
                    : `${high}° / ${low}°`}
                </p>
                <p className="truncate text-xs text-[var(--muted)]">
                  {day.condition}
                </p>
              </div>

              <SummaryValue
                label="Rain"
                value={`AM ${formatPercent(
                  summary.morningRainPercent,
                )} · PM ${formatPercent(
                  summary.afternoonRainPercent,
                )}`}
              />
              <SummaryValue
                label="Wind"
                value={
                  summary.dominantWindLabel
                    ? `${windRange} ${summary.dominantWindLabel}`
                    : windRange
                }
              />
              <SummaryValue
                label="Max gust"
                value={maximumGust}
              />
            </div>
          );
        }

        return (
          <div className="grid h-full min-h-0 gap-4 overflow-hidden md:grid-cols-[minmax(220px,0.8fr)_1.4fr]">
            <div className="flex min-h-0 items-center gap-4">
              <WeatherConditionIcon
                weatherCode={day.weatherCode}
                condition={day.condition}
                size={84}
              />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--accent)]">
                  {dateLabel}
                </p>
                <p className="mt-1 text-3xl font-semibold tracking-tight">
                  {isToday
                    ? `${current}°${symbol}`
                    : `${high}° / ${low}°`}
                </p>
                <p className="mt-1 truncate font-medium">
                  {day.condition}
                </p>
                {isToday ? (
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    High {high}° · Low {low}°
                  </p>
                ) : null}
              </div>
            </div>

            <dl className="grid min-h-0 grid-cols-2 content-center gap-x-5 gap-y-3 overflow-hidden sm:grid-cols-3">
              <SummaryValue
                label="Morning rain"
                value={formatPercent(
                  summary.morningRainPercent,
                )}
              />
              <SummaryValue
                label="Afternoon rain"
                value={formatPercent(
                  summary.afternoonRainPercent,
                )}
              />
              <SummaryValue
                label="Evening rain"
                value={formatPercent(
                  summary.eveningRainPercent,
                )}
              />
              <SummaryValue
                label="Wind"
                value={
                  summary.dominantWindLabel
                    ? `${windRange} ${summary.dominantWindLabel}`
                    : windRange
                }
              />
              <SummaryValue
                label="Maximum gust"
                value={maximumGust}
              />
              <SummaryValue
                label="Forecast coverage"
                value={`${summary.hours.length} hourly points`}
              />
            </dl>
          </div>
        );
      }}
    </WeatherDataView>
  );
}

export function CurrentTemperatureWidget({
  widget,
  weatherState,
  forecastContext,
}: WidgetComponentProps) {
  const unit = stringSetting(
    widget.settings,
    "unit",
    "fahrenheit",
  );
  const showFeelsLike = booleanSetting(
    widget.settings,
    "showFeelsLike",
    true,
  );

  return (
    <WeatherDataView state={weatherState}>
      {(data) => {
        const symbol = unit === "celsius" ? "C" : "F";
        const isToday =
          forecastContext.selectedDate ===
          forecastContext.todayDate;

        if (!isToday) {
          const day = data.daily.find(
            (item) =>
              item.date ===
              forecastContext.selectedDate,
          );

          return day ? (
            <MetricValue
              value={`${temperatureValue(
                day.temperatureMaxC,
                unit,
              )}° / ${temperatureValue(
                day.temperatureMinC,
                unit,
              )}°`}
              detail="Forecast high / low"
            />
          ) : (
            <MetricValue
              value="Unavailable"
              detail="No temperature forecast for this date."
            />
          );
        }

        const temperature = temperatureValue(
          data.current.temperatureC,
          unit,
        );
        const feelsLike = temperatureValue(
          data.current.apparentTemperatureC,
          unit,
        );

        return (
          <MetricValue
            value={`${temperature}°${symbol}`}
            detail={
              showFeelsLike
                ? `Feels like ${feelsLike}°${symbol}`
                : undefined
            }
          />
        );
      }}
    </WeatherDataView>
  );
}

export function CurrentConditionsWidget({
  widget,
  weatherState,
  forecastContext,
}: WidgetComponentProps) {
  const showIcon = booleanSetting(
    widget.settings,
    "showIcon",
    true,
  );
  const showText = booleanSetting(
    widget.settings,
    "showText",
    true,
  );
  const compact =
    stringSetting(
      widget.settings,
      "density",
      "standard",
    ) === "compact";

  return (
    <WeatherDataView state={weatherState}>
      {(data) => {
        const isToday =
          forecastContext.selectedDate ===
          forecastContext.todayDate;
        const futureDay = data.daily.find(
          (day) =>
            day.date ===
            forecastContext.selectedDate,
        );
        const condition = isToday
          ? data.current.condition
          : futureDay?.condition;
        const weatherCode = isToday
          ? data.current.weatherCode
          : futureDay?.weatherCode;

        if (
          condition === undefined ||
          weatherCode === undefined
        ) {
          return (
            <MetricValue
              value="Unavailable"
              detail="No conditions forecast for this date."
            />
          );
        }

        const effectiveShowIcon =
          showIcon && !compact;
        const shouldShowText =
          showText || !effectiveShowIcon;

        return (
          <div
            className={[
              "flex h-full min-h-0 items-center overflow-hidden",
              effectiveShowIcon && shouldShowText
                ? "gap-4"
                : "justify-center",
            ].join(" ")}
          >
            {effectiveShowIcon ? (
              <WeatherConditionIcon
                weatherCode={weatherCode}
                condition={condition}
              />
            ) : null}

            {shouldShowText ? (
              <MetricValue
                value={condition}
                detail={
                  isToday
                    ? "Live now"
                    : formatForecastDateLabel({
                        date:
                          forecastContext.selectedDate,
                        todayDate:
                          forecastContext.todayDate,
                      })
                }
              />
            ) : null}
          </div>
        );
      }}
    </WeatherDataView>
  );
}

export function RainChanceWidget({
  weatherState,
  forecastContext,
}: WidgetComponentProps) {
  return (
    <WeatherDataView state={weatherState}>
      {(data) => {
        const isToday =
          forecastContext.selectedDate ===
          forecastContext.todayDate;

        if (isToday) {
          return (
            <MetricValue
              value={formatPercent(
                data.current.rainChancePercent,
              )}
              detail="Current hour"
            />
          );
        }

        const summary = summarizeWeatherDay(
          data,
          forecastContext.selectedDate,
        );
        const dailyMaximum =
          summary.daily?.rainChancePercent ?? null;

        return (
          <MetricValue
            value={formatPercent(dailyMaximum)}
            detail={`AM ${formatPercent(
              summary.morningRainPercent,
            )} · PM ${formatPercent(
              summary.afternoonRainPercent,
            )}`}
          />
        );
      }}
    </WeatherDataView>
  );
}

export function HourlyForecastWidget({
  widget,
  weatherState,
  forecastContext,
}: WidgetComponentProps) {
  const [metric, setMetric] =
    useState<ForecastMetric>("temperature");
  const [expanded, setExpanded] = useState(false);
  const hours = numberSetting(
    widget.settings,
    "hours",
    8,
  );
  const unit = stringSetting(
    widget.settings,
    "unit",
    "fahrenheit",
  );
  const displayMode = stringSetting(
    widget.settings,
    "displayMode",
    "cards",
  );
  const showPointLabels = booleanSetting(
    widget.settings,
    "showPointLabels",
    true,
  );
  const showRainChance = booleanSetting(
    widget.settings,
    "showRainChance",
    false,
  );
  const compact =
    stringSetting(
      widget.settings,
      "density",
      "standard",
    ) === "compact";

  return (
    <WeatherDataView state={weatherState}>
      {(data) => {
        const selectedHours = expanded
          ? selectExpandedForecastHours({
              hourly: data.hourly,
              selectedDate:
                forecastContext.selectedDate,
              todayDate: forecastContext.todayDate,
              currentLocalTime: data.current.time,
            })
          : selectDefaultForecastHours({
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
              title="Hourly forecast unavailable"
              detail={`No hourly weather data is available for ${formatForecastDateLabel(
                {
                  date: forecastContext.selectedDate,
                  todayDate:
                    forecastContext.todayDate,
                },
              )}.`}
            />
          );
        }

        const temperatureUnit =
          unit === "celsius" ? "C" : "F";

        return (
          <div
            className={[
              "flex h-full min-h-0 flex-col overflow-hidden",
              compact ? "gap-1.5" : "gap-3",
            ].join(" ")}
          >
            <div className="flex shrink-0 flex-nowrap items-center justify-between gap-2 overflow-x-auto">
              <div
                className={[
                  "flex shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]",
                  compact ? "p-0.5" : "p-1",
                ].join(" ")}
              >
                <MetricTab
                  compact={compact}
                  active={metric === "temperature"}
                  onClick={() =>
                    setMetric("temperature")
                  }
                >
                  Temperature
                </MetricTab>
                <MetricTab
                  compact={compact}
                  active={metric === "precipitation"}
                  onClick={() =>
                    setMetric("precipitation")
                  }
                >
                  Precipitation
                </MetricTab>
                <MetricTab
                  compact={compact}
                  active={metric === "wind"}
                  onClick={() => setMetric("wind")}
                >
                  Wind
                </MetricTab>
              </div>

              <button
                type="button"
                onClick={() =>
                  setExpanded((current) => !current)
                }
                className={[
                  "shrink-0 rounded-lg border border-[var(--border)] font-medium hover:bg-[var(--surface-muted)]",
                  compact
                    ? "px-2 py-1 text-[10px]"
                    : "px-3 py-1.5 text-xs",
                ].join(" ")}
              >
                {expanded
                  ? "8 points"
                  : "Full day"}
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              {!compact &&
              metric === "temperature" &&
              displayMode === "line" ? (
                <HourlyTemperatureLineChart
                  temperatureUnit={temperatureUnit}
                  showPointLabels={showPointLabels}
                  showRainChance={showRainChance}
                  points={selectedHours.map((hour) => ({
                    label: formatHourLabel(
                      hour.time,
                      forecastContext.todayDate,
                      forecastContext.selectedDate,
                    ),
                    temperature:
                      unit === "celsius"
                        ? hour.temperatureC
                        : celsiusToFahrenheit(
                            hour.temperatureC,
                          ),
                    rainChancePercent:
                      hour.rainChancePercent,
                  }))}
                />
              ) : (
                <HourlyForecastStrip
                  hours={selectedHours}
                  metric={metric}
                  unit={unit}
                  todayDate={
                    forecastContext.todayDate
                  }
                  selectedDate={
                    forecastContext.selectedDate
                  }
                  compact={compact}
                />
              )}
            </div>
          </div>
        );
      }}
    </WeatherDataView>
  );
}

export function DailyForecastWidget({
  widget,
  weatherState,
  forecastContext,
  onForecastDateChange,
}: WidgetComponentProps) {
  const days = numberSetting(
    widget.settings,
    "days",
    7,
  );
  const compact =
    stringSetting(
      widget.settings,
      "density",
      "standard",
    ) === "compact";

  return (
    <WeatherDataView state={weatherState}>
      {(data) => (
        <div
          className={[
            "grid h-full min-h-0 grid-flow-col overflow-x-auto",
            compact
              ? "auto-cols-[minmax(68px,1fr)] gap-1"
              : "auto-cols-[minmax(104px,1fr)] gap-2 pb-1",
          ].join(" ")}
        >
          {data.daily
            .slice(0, days)
            .map((day) => {
              const selected =
                day.date ===
                  forecastContext.selectedDate;

              return (
                <button
                  key={day.date}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${formatCompactForecastDateLabel(
                    {
                      date: day.date,
                      todayDate:
                        forecastContext.todayDate,
                    },
                  )}: ${day.condition}, ${roundMeasurement(
                    celsiusToFahrenheit(
                      day.temperatureMaxC,
                    ),
                  )} degree high and ${roundMeasurement(
                    celsiusToFahrenheit(
                      day.temperatureMinC,
                    ),
                  )} degree low`}
                  title={day.condition}
                  onClick={() =>
                    onForecastDateChange?.(day.date)
                  }
                  className={[
                    "flex min-h-0 min-w-0 flex-col items-center justify-center overflow-hidden rounded-xl border text-center transition",
                    compact ? "px-1 py-0.5" : "p-3",
                    selected
                      ? "border-[var(--accent)] bg-[var(--selection)]"
                      : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)]",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "truncate font-medium",
                      compact
                        ? "text-[10px]"
                        : "text-sm",
                    ].join(" ")}
                  >
                    {formatCompactForecastDateLabel({
                      date: day.date,
                      todayDate:
                        forecastContext.todayDate,
                    })}
                  </span>

                  {!compact ? (
                    <WeatherConditionIcon
                      weatherCode={day.weatherCode}
                      condition={day.condition}
                      size={48}
                    />
                  ) : null}

                  <span
                    className={[
                      "truncate font-medium",
                      compact
                        ? "text-xs"
                        : "text-sm",
                    ].join(" ")}
                  >
                    {roundMeasurement(
                      celsiusToFahrenheit(
                        day.temperatureMaxC,
                      ),
                    )}
                    °/{roundMeasurement(
                      celsiusToFahrenheit(
                        day.temperatureMinC,
                      ),
                    )}
                    °
                  </span>

                  {!compact ? (
                    <span className="mt-1 text-xs text-[var(--muted)]">
                      {formatPercent(
                        day.rainChancePercent,
                      )} rain
                    </span>
                  ) : null}
                </button>
              );
            })}
        </div>
      )}
    </WeatherDataView>
  );
}

function HourlyForecastStrip({
  hours,
  metric,
  unit,
  todayDate,
  selectedDate,
  compact,
}: {
  hours: WeatherSourceData["hourly"];
  metric: ForecastMetric;
  unit: string;
  todayDate: string;
  selectedDate: string;
  compact: boolean;
}) {
  return (
    <div
      className={[
        "grid h-full min-h-0 grid-flow-col overflow-x-auto",
        compact ? "gap-1" : "gap-2 pb-1",
      ].join(" ")}
      style={{
        gridAutoColumns: compact
          ? "minmax(70px, 1fr)"
          : "minmax(94px, 1fr)",
      }}
    >
      {hours.map((hour) => (
        <div
          key={`${metric}-${hour.time}`}
          className={[
            "flex min-h-0 min-w-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-[var(--surface-muted)] text-center",
            compact ? "px-1 py-0.5" : "p-3",
          ].join(" ")}
        >
          <p
            className={[
              "truncate text-[var(--muted)]",
              compact ? "text-[10px]" : "text-xs",
            ].join(" ")}
          >
            {formatHourLabel(
              hour.time,
              todayDate,
              selectedDate,
            )}
          </p>

          {metric === "temperature" ? (
            <>
              {!compact ? (
                <WeatherConditionIcon
                  weatherCode={hour.weatherCode}
                  condition={hour.condition}
                  size={38}
                />
              ) : null}
              <p
                className={
                  compact
                    ? "truncate text-xs font-medium"
                    : "font-medium"
                }
              >
                {roundMeasurement(
                  unit === "celsius"
                    ? hour.temperatureC
                    : celsiusToFahrenheit(
                        hour.temperatureC,
                      ),
                )}
                °{unit === "celsius" ? "C" : "F"}
              </p>
              {!compact ? (
                <p className="mt-1 max-w-full truncate text-xs text-[var(--muted)]">
                  {hour.condition}
                </p>
              ) : null}
            </>
          ) : null}

          {metric === "precipitation" ? (
            <>
              {!compact ? (
                <WeatherConditionIcon
                  weatherCode={hour.weatherCode}
                  condition={hour.condition}
                  size={38}
                />
              ) : null}
              <p
                className={
                  compact
                    ? "truncate text-xs font-medium"
                    : "font-medium"
                }
              >
                {formatPercent(
                  hour.rainChancePercent,
                )}
              </p>
              {!compact ? (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  chance of rain
                </p>
              ) : null}
            </>
          ) : null}

          {metric === "wind" ? (
            <>
              <WindDirectionArrow
                fromDegrees={
                  hour.windDirectionDegrees
                }
                size={compact ? 20 : 38}
              />
              <p
                className={
                  compact
                    ? "truncate text-[10px] font-medium"
                    : "font-medium"
                }
              >
                {formatMph(hour.windSpeedMps)}
              </p>
              {!compact ? (
                <>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    From {hour.windDirectionLabel}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    Gust {formatMph(hour.windGustMps)}
                  </p>
                </>
              ) : null}
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function MetricTab({
  active,
  onClick,
  compact = false,
  children,
}: {
  active: boolean;
  onClick: () => void;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-lg",
        compact
          ? "px-2 py-1 text-[10px]"
          : "px-3 py-1.5 text-xs",
        active
          ? "bg-[var(--surface)] font-medium text-[var(--foreground)] shadow-sm"
          : "text-[var(--muted)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SummaryValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm font-medium">
        {value}
      </dd>
    </div>
  );
}

function temperatureValue(
  celsius: number,
  unit: string,
): number {
  return roundMeasurement(
    unit === "celsius"
      ? celsius
      : celsiusToFahrenheit(celsius),
  );
}

function formatHourLabel(
  localDateTime: string,
  todayDate: string,
  selectedDate: string,
): string {
  const date = dateKeyFromLocalTime(localDateTime);
  const time = formatLocalHour(localDateTime);

  if (date === selectedDate) {
    return time;
  }

  return `${formatCompactForecastDateLabel({
    date,
    todayDate,
  })} ${time}`;
}

function formatPercent(
  value: number | null,
): string {
  return value === null
    ? "Unavailable"
    : `${roundMeasurement(value)}%`;
}

function formatMph(
  metersPerSecond: number,
): string {
  return `${roundMeasurement(
    metersPerSecondToMph(metersPerSecond),
  )} mph`;
}

function formatWindRange(
  minimumMps: number | null,
  maximumMps: number | null,
): string {
  if (
    minimumMps === null ||
    maximumMps === null
  ) {
    return "Unavailable";
  }

  const minimum = roundMeasurement(
    metersPerSecondToMph(minimumMps),
  );
  const maximum = roundMeasurement(
    metersPerSecondToMph(maximumMps),
  );

  return minimum === maximum
    ? `${minimum} mph`
    : `${minimum}–${maximum} mph`;
}
