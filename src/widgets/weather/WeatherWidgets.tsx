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
  formatDate,
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

type ForecastSummaryMetric =
  | "rain-am-pm"
  | "morning-rain"
  | "afternoon-rain"
  | "evening-rain"
  | "wind"
  | "max-gust"
  | "high-low";

const FORECAST_SUMMARY_OPTIONS: Array<{
  value: ForecastSummaryMetric;
  label: string;
}> = [
  {
    value: "rain-am-pm",
    label: "Rain AM / PM",
  },
  {
    value: "morning-rain",
    label: "Morning rain",
  },
  {
    value: "afternoon-rain",
    label: "Afternoon rain",
  },
  {
    value: "evening-rain",
    label: "Evening rain",
  },
  {
    value: "wind",
    label: "Wind",
  },
  {
    value: "max-gust",
    label: "Max gust",
  },
  {
    value: "high-low",
    label: "High / low",
  },
];


export function ForecastOverviewWidget({
  widget,
  weatherState,
  forecastContext,
  onForecastDateChange,
  onWidgetSettingsChange,
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

  const summaryMetrics: ForecastSummaryMetric[] = [
    forecastSummaryMetricSetting(
      widget.settings,
      "summaryMetric1",
      "rain-am-pm",
    ),
    forecastSummaryMetricSetting(
      widget.settings,
      "summaryMetric2",
      "wind",
    ),
    forecastSummaryMetricSetting(
      widget.settings,
      "summaryMetric3",
      "max-gust",
    ),
    forecastSummaryMetricSetting(
      widget.settings,
      "summaryMetric4",
      "high-low",
    ),
    forecastSummaryMetricSetting(
      widget.settings,
      "summaryMetric5",
      "morning-rain",
    ),
    forecastSummaryMetricSetting(
      widget.settings,
      "summaryMetric6",
      "evening-rain",
    ),
  ];

  function changeSummaryMetric(
    index: number,
    metric: ForecastSummaryMetric,
  ) {
    onWidgetSettingsChange?.({
      [`summaryMetric${index + 1}`]: metric,
    });
  }

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
        const symbol =
          unit === "celsius" ? "C" : "F";
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

        const summaryItems =
          summaryMetrics.map((metric) =>
            getForecastSummaryItem({
              metric,
              summary,
              high,
              low,
              symbol,
              windRange,
              maximumGust,
            }),
          );

        if (compact) {
          return (
            <div className="grid h-full min-h-0 grid-cols-[minmax(110px,1.2fr)_minmax(0,2fr)] items-center gap-3 overflow-hidden">
              <div className="min-w-0">
                <ForecastDaySelector
                  daily={data.daily}
                  selectedDate={
                    forecastContext.selectedDate
                  }
                  todayDate={
                    forecastContext.todayDate
                  }
                  onChange={
                    onForecastDateChange
                  }
                  compact
                />

                <p className="truncate font-semibold">
                  {isToday
                    ? `${current}°${symbol} · ${high}°/${low}°`
                    : `${high}° / ${low}°`}
                </p>
                <p className="truncate text-xs text-[var(--muted)]">
                  {day.condition}
                </p>
              </div>

              <div className="grid min-w-0 grid-cols-3 gap-x-2 gap-y-2">
                {summaryItems.map(
                  (item, index) => (
                    <SummaryValue
                      key={`${index}-${summaryMetrics[index]}`}
                      label={item.label}
                      value={item.value}
                      metric={
                        summaryMetrics[index]
                      }
                      editable={
                        Boolean(
                          onWidgetSettingsChange,
                        )
                      }
                      onMetricChange={(metric) =>
                        changeSummaryMetric(
                          index,
                          metric,
                        )
                      }
                    />
                  ),
                )}
              </div>
            </div>
          );
        }

        return (
          <div className="grid h-full min-h-0 grid-cols-[minmax(240px,0.9fr)_minmax(0,2fr)] items-center gap-6 overflow-hidden">
            <div className="flex min-w-0 items-center gap-4 overflow-hidden">
              <WeatherConditionIcon
                weatherCode={day.weatherCode}
                condition={day.condition}
                size={68}
              />

              <div className="min-w-0">
                <ForecastDaySelector
                  daily={data.daily}
                  selectedDate={
                    forecastContext.selectedDate
                  }
                  todayDate={
                    forecastContext.todayDate
                  }
                  onChange={
                    onForecastDateChange
                  }
                />

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

            <div className="grid min-w-0 grid-cols-3 content-center gap-x-5 gap-y-4 overflow-hidden">
              {summaryItems.map(
                (item, index) => (
                  <SummaryValue
                    key={`${index}-${summaryMetrics[index]}`}
                    label={item.label}
                    value={item.value}
                    metric={
                      summaryMetrics[index]
                    }
                    editable={
                      Boolean(
                        onWidgetSettingsChange,
                      )
                    }
                    onMetricChange={(metric) =>
                      changeSummaryMetric(
                        index,
                        metric,
                      )
                    }
                  />
                ),
              )}
            </div>
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
          showIcon;
        const shouldShowText =
          showText || !effectiveShowIcon;

        return (
          <div
            className={[
              "flex h-full min-h-0 items-center overflow-hidden",
              effectiveShowIcon && shouldShowText
                ? compact
                  ? "gap-2"
                  : "gap-4"
                : "justify-center",
            ].join(" ")}
          >
            {effectiveShowIcon ? (
              <WeatherConditionIcon
                weatherCode={weatherCode}
                condition={condition}
                size={compact ? 28 : 56}
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

                  <WeatherConditionIcon
                    weatherCode={day.weatherCode}
                    condition={day.condition}
                    size={compact ? 20 : 48}
                  />

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
  selectedDate,
  compact,
}: {
  hours: WeatherSourceData["hourly"];
  metric: ForecastMetric;
  unit: string;
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
          {compact ? (
            <div className="text-[10px] leading-tight text-[var(--muted)]">
              <p className="whitespace-nowrap">
                {formatShortNumericDate(
                  dateKeyFromLocalTime(
                    hour.time,
                  ),
                )}
              </p>
              <p className="mt-0.5 whitespace-nowrap">
                {formatLocalHour(hour.time)}
              </p>
            </div>
          ) : (
            <p className="truncate text-xs text-[var(--muted)]">
              {formatHourLabel(
                hour.time,
                selectedDate,
              )}
            </p>
          )}

          {metric === "temperature" ? (
            <>
              <WeatherConditionIcon
                weatherCode={hour.weatherCode}
                condition={hour.condition}
                size={compact ? 18 : 38}
              />
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
              <WeatherConditionIcon
                weatherCode={hour.weatherCode}
                condition={hour.condition}
                size={compact ? 18 : 38}
              />
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
  metric,
  editable,
  onMetricChange,
}: {
  label: string;
  value: string;
  metric?: ForecastSummaryMetric;
  editable?: boolean;
  onMetricChange?: (
    metric: ForecastSummaryMetric,
  ) => void;
}) {
  return (
    <div className="min-w-0">
      {editable &&
      metric &&
      onMetricChange ? (
        <SummaryMetricSelect
          metric={metric}
          onChange={onMetricChange}
          compact
        />
      ) : (
        <p className="truncate text-xs text-[var(--muted)]">
          {label}
        </p>
      )}
      <p className="mt-1 truncate text-sm font-medium">
        {value}
      </p>
    </div>
  );
}

function SummaryMetricSelect({
  metric,
  onChange,
  compact = false,
}: {
  metric: ForecastSummaryMetric;
  onChange: (
    metric: ForecastSummaryMetric,
  ) => void;
  compact?: boolean;
}) {
  return (
    <select
      value={metric}
      aria-label="Forecast summary detail"
      onChange={(event) =>
        onChange(
          event.target
            .value as ForecastSummaryMetric,
        )
      }
      className={[
        "max-w-full cursor-pointer rounded-md border border-transparent bg-transparent text-[var(--muted)] outline-none hover:border-[var(--border)] hover:bg-[var(--surface-muted)]",
        compact
          ? "text-[10px]"
          : "text-xs",
      ].join(" ")}
    >
      {FORECAST_SUMMARY_OPTIONS.map(
        (option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ),
      )}
    </select>
  );
}

function ForecastDaySelector({
  daily,
  selectedDate,
  todayDate,
  onChange,
  compact = false,
}: {
  daily: WeatherSourceData["daily"];
  selectedDate: string;
  todayDate: string;
  onChange?: (date: string) => void;
  compact?: boolean;
}) {
  const label = formatForecastDateLabel({
    date: selectedDate,
    todayDate,
  });

  if (!onChange) {
    return (
      <p
        className={[
          "font-medium uppercase tracking-wide text-[var(--accent)]",
          compact
            ? "truncate text-xs"
            : "text-xs",
        ].join(" ")}
      >
        {label}
      </p>
    );
  }

  return (
    <label
      className={[
        "relative inline-flex max-w-full cursor-pointer items-center gap-1 rounded-md font-medium uppercase tracking-wide text-[var(--accent)] hover:bg-[var(--selection)]",
        compact
          ? "px-0.5 py-0.5 text-xs"
          : "-ml-1 px-1 py-0.5 text-xs",
      ].join(" ")}
      title="Choose forecast day"
    >
      <span className="truncate">
        {label}
      </span>
      <svg
        viewBox="0 0 16 16"
        className="h-3 w-3 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m4 6 4 4 4-4" />
      </svg>

      <select
        value={selectedDate}
        aria-label="Choose forecast day"
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {daily.map((day) => (
          <option
            key={day.date}
            value={day.date}
          >
            {formatForecastDayOption(
              day.date,
              todayDate,
            )}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatForecastDayOption(
  date: string,
  todayDate: string,
): string {
  const label = formatForecastDateLabel({
    date,
    todayDate,
  });
  const numeric =
    formatShortNumericDate(date);

  if (
    label === "Today" ||
    label === "Tomorrow"
  ) {
    return `${label} · ${numeric}`;
  }

  return `${formatDate(date, {
    weekday: "short",
  })} · ${numeric}`;
}

function formatShortNumericDate(
  date: string,
): string {
  return formatDate(date, {
    month: "numeric",
    day: "numeric",
  });
}

function forecastSummaryMetricSetting(
  settings: Record<string, unknown>,
  key: string,
  fallback: ForecastSummaryMetric,
): ForecastSummaryMetric {
  const value = stringSetting(
    settings,
    key,
    fallback,
  );

  return FORECAST_SUMMARY_OPTIONS.some(
    (option) => option.value === value,
  )
    ? (value as ForecastSummaryMetric)
    : fallback;
}

function getForecastSummaryItem({
  metric,
  summary,
  high,
  low,
  symbol,
  windRange,
  maximumGust,
}: {
  metric: ForecastSummaryMetric;
  summary: ReturnType<
    typeof summarizeWeatherDay
  >;
  high: number;
  low: number;
  symbol: string;
  windRange: string;
  maximumGust: string;
}): {
  label: string;
  value: string;
} {
  switch (metric) {
    case "morning-rain":
      return {
        label: "Morning rain",
        value: formatPercent(
          summary.morningRainPercent,
        ),
      };

    case "afternoon-rain":
      return {
        label: "Afternoon rain",
        value: formatPercent(
          summary.afternoonRainPercent,
        ),
      };

    case "evening-rain":
      return {
        label: "Evening rain",
        value: formatPercent(
          summary.eveningRainPercent,
        ),
      };

    case "wind":
      return {
        label: "Wind",
        value:
          summary.dominantWindLabel
            ? `${windRange} ${summary.dominantWindLabel}`
            : windRange,
      };

    case "max-gust":
      return {
        label: "Max gust",
        value: maximumGust,
      };

    case "high-low":
      return {
        label: "High / low",
        value: `${high}° / ${low}°${symbol}`,
      };

    case "rain-am-pm":
    default:
      return {
        label: "Rain",
        value: `AM ${formatPercent(
          summary.morningRainPercent,
        )} · PM ${formatPercent(
          summary.afternoonRainPercent,
        )}`,
      };
  }
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
  selectedDate: string,
): string {
  const date =
    dateKeyFromLocalTime(localDateTime);
  const time =
    formatLocalHour(localDateTime);

  if (date === selectedDate) {
    return time;
  }

  return `${formatShortNumericDate(
    date,
  )} ${time}`;
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
