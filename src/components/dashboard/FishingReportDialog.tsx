"use client";

import { useEffect, useMemo, useState } from "react";
import { summarizeWeatherDay } from "@/lib/weather-summary";
import {
  celsiusToFahrenheit,
  metersPerSecondToMph,
  metersToFeet,
  roundMeasurement,
  roundToTenth,
} from "@/lib/units";
import type {
  AstronomySourceData,
  MarineSourceData,
  TideEvent,
  TideSourceData,
} from "@/types/source-data";
import type { WeatherSourceData } from "@/types/weather";

type ReportMetric =
  | "rain-am-pm"
  | "wind"
  | "max-gust"
  | "high-low"
  | "high-tide-am-pm"
  | "low-tide-am-pm"
  | "sunrise-sunset"
  | "moon-illumination"
  | "wave-height"
  | "water-temperature";

type TimeFrame =
  | "all"
  | "morning"
  | "afternoon"
  | "evening"
  | "custom";

const DEFAULT_METRICS: ReportMetric[] = [
  "rain-am-pm",
  "wind",
  "max-gust",
  "high-low",
  "high-tide-am-pm",
  "sunrise-sunset",
];

const METRIC_OPTIONS: Array<{
  value: ReportMetric;
  label: string;
}> = [
  { value: "rain-am-pm", label: "Rain AM / PM" },
  { value: "wind", label: "Wind" },
  { value: "max-gust", label: "Max gust" },
  { value: "high-low", label: "High / low" },
  { value: "high-tide-am-pm", label: "High tide AM / PM" },
  { value: "low-tide-am-pm", label: "Low tide AM / PM" },
  { value: "sunrise-sunset", label: "Sunrise / sunset" },
  { value: "moon-illumination", label: "Moon illumination" },
  { value: "wave-height", label: "Wave height" },
  { value: "water-temperature", label: "Water temperature" },
];

const TIME_FRAME_OPTIONS: Array<{
  value: TimeFrame;
  label: string;
}> = [
  { value: "all", label: "All-day summary" },
  { value: "morning", label: "Morning · 6 AM–12 PM" },
  { value: "afternoon", label: "Afternoon · 12 PM–6 PM" },
  { value: "evening", label: "Evening · 6 PM–midnight" },
  { value: "custom", label: "Custom time window" },
];

const HOUR_OPTIONS = Array.from({ length: 25 }, (_, hour) => ({
  value: hour,
  label: formatClockHour(hour),
}));

export function FishingReportDialog({
  open,
  onClose,
  dashboardName,
  locationLabel,
  availableDates,
  selectedDate,
  todayDate,
  onDateChange,
  weatherData,
  tideData,
  marineData,
  astronomyData,
}: {
  open: boolean;
  onClose: () => void;
  dashboardName: string;
  locationLabel?: string;
  availableDates: string[];
  selectedDate: string;
  todayDate: string;
  onDateChange: (date: string) => void;
  weatherData: WeatherSourceData | null;
  tideData: TideSourceData | null;
  marineData: MarineSourceData | null;
  astronomyData: AstronomySourceData | null;
}) {
  const [metrics, setMetrics] =
    useState<ReportMetric[]>(DEFAULT_METRICS);
  const [timeFrame, setTimeFrame] =
    useState<TimeFrame>("all");
  const [customStart, setCustomStart] = useState(6);
  const [customEnd, setCustomEnd] = useState(18);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  const daySummary = useMemo(
    () =>
      weatherData
        ? summarizeWeatherDay(weatherData, selectedDate)
        : null,
    [selectedDate, weatherData],
  );

  const dateAstronomy =
    astronomyData?.date === selectedDate
      ? astronomyData
      : null;

  const hourlyWindow = getTimeWindow(
    timeFrame,
    customStart,
    customEnd,
  );

  const hourlyRows = useMemo(() => {
    if (!weatherData || !hourlyWindow) {
      return [];
    }

    return weatherData.hourly.filter((hour) => {
      if (hour.time.slice(0, 10) !== selectedDate) {
        return false;
      }

      const hourValue = localHour(hour.time);
      return (
        hourValue >= hourlyWindow.start &&
        hourValue < hourlyWindow.end
      );
    });
  }, [hourlyWindow, selectedDate, weatherData]);

  if (!open) {
    return null;
  }

  const selectedDay = daySummary?.daily ?? null;
  const condition = selectedDay?.condition ?? "Forecast unavailable";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fishing report"
      className="fixed inset-0 z-[980] flex items-end justify-center bg-black/35 sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          onClose();
        }
      }}
    >
      <section className="dashboard-theme flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-2xl sm:max-h-[90vh] sm:rounded-3xl">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border)] px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ReportIcon />
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Fishing report
              </h2>
            </div>
            <p className="mt-1 truncate text-sm text-[var(--muted)]">
              {locationLabel ?? dashboardName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] text-xl text-[var(--muted)] hover:bg-[var(--surface-muted)]"
            aria-label="Close fishing report"
          >
            ×
          </button>
        </header>

        <div className="builder-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Date
              </span>
              <select
                value={selectedDate}
                onChange={(event) => onDateChange(event.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm font-medium outline-none focus:border-[var(--accent)]"
              >
                {availableDates.map((date) => (
                  <option key={date} value={date}>
                    {formatReportDateOption(date, todayDate)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Time frame
              </span>
              <select
                value={timeFrame}
                onChange={(event) =>
                  setTimeFrame(event.target.value as TimeFrame)
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm font-medium outline-none focus:border-[var(--accent)]"
              >
                {TIME_FRAME_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {timeFrame === "custom" ? (
            <div className="mt-3 grid grid-cols-2 gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
              <HourSelect
                label="From"
                value={customStart}
                maximum={23}
                onChange={(next) => {
                  setCustomStart(next);
                  if (next >= customEnd) {
                    setCustomEnd(Math.min(24, next + 1));
                  }
                }}
              />
              <HourSelect
                label="To"
                value={customEnd}
                minimum={customStart + 1}
                onChange={setCustomEnd}
              />
            </div>
          ) : null}

          <section className="mt-5 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                  {formatReportDateHeading(selectedDate, todayDate)}
                </p>
                <p className="mt-0.5 truncate text-lg font-semibold">
                  {condition}
                </p>
              </div>

              {selectedDay ? (
                <div className="shrink-0 text-right">
                  <p className="text-lg font-semibold">
                    {roundMeasurement(
                      celsiusToFahrenheit(selectedDay.temperatureMaxC),
                    )}° / {roundMeasurement(
                      celsiusToFahrenheit(selectedDay.temperatureMinC),
                    )}°F
                  </p>
                  <p className="text-xs text-[var(--muted)]">High / low</p>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-px bg-[var(--border)] sm:grid-cols-3">
              {metrics.map((metric, index) => {
                const item = getReportMetric({
                  metric,
                  selectedDate,
                  daySummary,
                  tideData,
                  marineData,
                  astronomyData: dateAstronomy,
                });

                return (
                  <div
                    key={`${index}-${metric}`}
                    className="min-w-0 bg-[var(--surface)] p-3 sm:p-4"
                  >
                    <select
                      value={metric}
                      aria-label={`Report metric ${index + 1}`}
                      onChange={(event) => {
                        const next = [...metrics];
                        next[index] = event.target.value as ReportMetric;
                        setMetrics(next);
                      }}
                      className="max-w-full cursor-pointer bg-transparent text-xs font-medium text-[var(--muted)] outline-none sm:text-sm"
                    >
                      {METRIC_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 truncate text-base font-semibold sm:text-lg">
                      {item}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {hourlyWindow ? (
            <section className="mt-5">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold">Hourly conditions</h3>
                  <p className="text-xs text-[var(--muted)]">
                    {formatClockHour(hourlyWindow.start)}–{formatClockHour(hourlyWindow.end)} · temperature, rain and wind
                  </p>
                </div>
                <span className="rounded-full bg-[var(--selection)] px-2.5 py-1 text-xs font-medium text-[var(--accent)]">
                  {hourlyRows.length} hourly points
                </span>
              </div>

              {hourlyRows.length > 0 ? (
                <div className="builder-scrollbar mt-3 flex gap-2 overflow-x-auto pb-2">
                  {hourlyRows.map((hour) => (
                    <article
                      key={hour.time}
                      className="w-[128px] shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-center"
                    >
                      <p className="text-sm font-semibold">
                        {formatHourFromLocalTime(hour.time)}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-[var(--muted)]">
                        {hour.condition}
                      </p>
                      <p className="mt-2 text-lg font-semibold">
                        {roundMeasurement(
                          celsiusToFahrenheit(hour.temperatureC),
                        )}°F
                      </p>
                      <div className="mt-2 space-y-1 border-t border-[var(--border)] pt-2 text-xs">
                        <p>
                          <span className="text-[var(--muted)]">Rain </span>
                          <span className="font-medium">{formatPercent(hour.rainChancePercent)}</span>
                        </p>
                        <p className="truncate">
                          <span className="text-[var(--muted)]">Wind </span>
                          <span className="font-medium">
                            {roundMeasurement(
                              metersPerSecondToMph(hour.windSpeedMps),
                            )} mph {hour.windDirectionLabel}
                          </span>
                        </p>
                        <p className="truncate text-[10px] text-[var(--muted)]">
                          Gust {roundMeasurement(
                            metersPerSecondToMph(hour.windGustMps),
                          )} mph
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-dashed border-[var(--border)] p-5 text-center text-sm text-[var(--muted)]">
                  No hourly forecast points are available inside this time window.
                </div>
              )}
            </section>
          ) : (
            <p className="mt-4 text-xs text-[var(--muted)]">
              Choose a morning, afternoon, evening, or custom time frame to add an hourly temperature, rain, and wind breakdown.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function HourSelect({
  label,
  value,
  minimum = 0,
  maximum = 24,
  onChange,
}: {
  label: string;
  value: number;
  minimum?: number;
  maximum?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--muted)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none"
      >
        {HOUR_OPTIONS.filter(
          (option) =>
            option.value >= minimum &&
            option.value <= maximum,
        ).map(
          (option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ),
        )}
      </select>
    </label>
  );
}

function getReportMetric({
  metric,
  selectedDate,
  daySummary,
  tideData,
  marineData,
  astronomyData,
}: {
  metric: ReportMetric;
  selectedDate: string;
  daySummary: ReturnType<typeof summarizeWeatherDay> | null;
  tideData: TideSourceData | null;
  marineData: MarineSourceData | null;
  astronomyData: AstronomySourceData | null;
}): string {
  const daily = daySummary?.daily ?? null;

  switch (metric) {
    case "rain-am-pm":
      return daySummary
        ? `AM ${formatPercent(daySummary.morningRainPercent)} · PM ${formatPercent(daySummary.afternoonRainPercent)}`
        : "Unavailable";

    case "wind": {
      if (!daySummary) {
        return "Unavailable";
      }

      const minimum = daySummary.windMinimumMps;
      const maximum = daySummary.windMaximumMps;
      if (minimum === null || maximum === null) {
        return "Unavailable";
      }

      const direction = daySummary.dominantWindLabel
        ? ` ${daySummary.dominantWindLabel}`
        : "";
      return `${roundMeasurement(
        metersPerSecondToMph(minimum),
      )}–${roundMeasurement(
        metersPerSecondToMph(maximum),
      )} mph${direction}`;
    }

    case "max-gust":
      return daySummary?.maximumGustMps === null ||
        daySummary?.maximumGustMps === undefined
        ? "Unavailable"
        : `${roundMeasurement(
            metersPerSecondToMph(daySummary.maximumGustMps),
          )} mph`;

    case "high-low":
      return daily
        ? `${roundMeasurement(
            celsiusToFahrenheit(daily.temperatureMaxC),
          )}° / ${roundMeasurement(
            celsiusToFahrenheit(daily.temperatureMinC),
          )}°F`
        : "Unavailable";

    case "high-tide-am-pm":
      return formatTideAmPm(tideData, selectedDate, "high");

    case "low-tide-am-pm":
      return formatTideAmPm(tideData, selectedDate, "low");

    case "sunrise-sunset":
      return astronomyData
        ? `${astronomyData.sunrise?.displayTime ?? "—"} · ${
            astronomyData.sunset?.displayTime ?? "—"
          }`
        : "Unavailable";

    case "moon-illumination":
      return astronomyData
        ? `${roundMeasurement(astronomyData.illuminationPercent)}%`
        : "Unavailable";

    case "wave-height": {
      const points = marineHoursForDate(marineData, selectedDate).filter(
        (hour) => Number.isFinite(hour.waveHeightM),
      );
      if (points.length === 0) {
        return "Unavailable";
      }
      const heights = points.map((hour) => metersToFeet(hour.waveHeightM));
      const minimum = Math.min(...heights);
      const maximum = Math.max(...heights);
      return minimum === maximum
        ? `${roundToTenth(minimum)} ft`
        : `${roundToTenth(minimum)}–${roundToTenth(maximum)} ft`;
    }

    case "water-temperature": {
      const values = marineHoursForDate(marineData, selectedDate)
        .map((hour) => hour.seaSurfaceTemperatureC)
        .filter((value): value is number => value !== null);
      if (values.length === 0) {
        return "Unavailable";
      }
      const average =
        values.reduce((sum, value) => sum + value, 0) / values.length;
      return `${roundMeasurement(celsiusToFahrenheit(average))}°F`;
    }
  }
}

function marineHoursForDate(
  marineData: MarineSourceData | null,
  selectedDate: string,
) {
  return marineData?.hourly.filter(
    (hour) => hour.time.slice(0, 10) === selectedDate,
  ) ?? [];
}

function formatTideAmPm(
  data: TideSourceData | null,
  selectedDate: string,
  type: TideEvent["type"],
): string {
  if (!data) {
    return "Unavailable";
  }

  const matching = data.events.filter(
    (event) =>
      event.type === type &&
      event.localTime.startsWith(selectedDate),
  );
  const am = matching.find((event) => tideHour(event) < 12);
  const pm = matching.find((event) => tideHour(event) >= 12);

  if (!am && !pm) {
    return "Unavailable";
  }

  return `AM ${am?.displayTime ?? "—"} · PM ${pm?.displayTime ?? "—"}`;
}

function tideHour(event: TideEvent): number {
  const match = event.localTime.match(/(?:T|\s)(\d{2}):/);
  return match ? Number(match[1]) : 0;
}

function getTimeWindow(
  frame: TimeFrame,
  customStart: number,
  customEnd: number,
): { start: number; end: number } | null {
  switch (frame) {
    case "morning":
      return { start: 6, end: 12 };
    case "afternoon":
      return { start: 12, end: 18 };
    case "evening":
      return { start: 18, end: 24 };
    case "custom":
      return {
        start: customStart,
        end: Math.max(customStart + 1, customEnd),
      };
    case "all":
    default:
      return null;
  }
}

function localHour(localDateTime: string): number {
  const match = localDateTime.match(/T(\d{2}):/);
  return match ? Number(match[1]) : 0;
}

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)}%`;
}

function formatClockHour(hour: number): string {
  if (hour === 24) {
    return "Midnight";
  }
  const normalized = hour % 24;
  const suffix = normalized >= 12 ? "PM" : "AM";
  const display = normalized % 12 || 12;
  return `${display} ${suffix}`;
}

function formatHourFromLocalTime(value: string): string {
  return formatClockHour(localHour(value));
}

function formatReportDateHeading(
  date: string,
  todayDate: string,
): string {
  if (date === todayDate) {
    return "Today";
  }
  return formatDateValue(date, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatReportDateOption(
  date: string,
  todayDate: string,
): string {
  const formatted = formatDateValue(date, {
    weekday: "short",
    month: "numeric",
    day: "numeric",
  });
  return date === todayDate ? `Today · ${formatted}` : formatted;
}

function formatDateValue(
  date: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat("en-US", options).format(
    new Date(`${date}T12:00:00`),
  );
}

function ReportIcon() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--selection)] text-[var(--accent)]">
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 3h10l4 4v14H5Z" />
        <path d="M15 3v5h5" />
        <path d="M8 12h8" />
        <path d="M8 16h5" />
      </svg>
    </span>
  );
}
