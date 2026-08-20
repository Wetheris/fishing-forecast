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

type ReportItem = {
  metric: ReportMetric;
  label: string;
  value: string;
};

type GeneratedReport = {
  imageUrl: string;
  imageBlob: Blob;
  text: string;
  filename: string;
};

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
  const [generated, setGenerated] =
    useState<GeneratedReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string>();

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

  useEffect(() => {
    return () => {
      if (generated?.imageUrl) {
        URL.revokeObjectURL(generated.imageUrl);
      }
    };
  }, [generated]);

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

  const reportItems = useMemo<ReportItem[]>(
    () =>
      metrics.map((metric) => ({
        metric,
        label: reportMetricLabel(metric),
        value: getReportMetric({
          metric,
          selectedDate,
          daySummary,
          tideData,
          marineData,
          astronomyData: dateAstronomy,
        }),
      })),
    [
      dateAstronomy,
      daySummary,
      marineData,
      metrics,
      selectedDate,
      tideData,
    ],
  );

  useEffect(() => {
    setGenerated(null);
    setMessage(undefined);
  }, [
    selectedDate,
    metrics,
    timeFrame,
    customStart,
    customEnd,
    weatherData,
    tideData,
    marineData,
    dateAstronomy,
  ]);

  if (!open) {
    return null;
  }

  const selectedDay = daySummary?.daily ?? null;
  const condition = selectedDay?.condition ?? "Forecast unavailable";
  const reportLocation = locationLabel ?? dashboardName;
  const timeFrameLabel = formatTimeFrameLabel(
    timeFrame,
    customStart,
    customEnd,
  );

  async function generateReport() {
    if (!selectedDay) {
      setMessage("Weather data is not available for this date yet.");
      return;
    }

    setGenerating(true);
    setMessage(undefined);

    try {
      const text = buildPlainTextReport({
        location: reportLocation,
        selectedDate,
        todayDate,
        condition,
        highF: roundMeasurement(
          celsiusToFahrenheit(selectedDay.temperatureMaxC),
        ),
        lowF: roundMeasurement(
          celsiusToFahrenheit(selectedDay.temperatureMinC),
        ),
        timeFrameLabel,
        items: reportItems,
        hourlyRows,
        includeHourly: Boolean(hourlyWindow),
      });

      const imageBlob = await renderReportImage({
        location: reportLocation,
        selectedDate,
        todayDate,
        condition,
        highF: roundMeasurement(
          celsiusToFahrenheit(selectedDay.temperatureMaxC),
        ),
        lowF: roundMeasurement(
          celsiusToFahrenheit(selectedDay.temperatureMinC),
        ),
        timeFrameLabel,
        items: reportItems,
        hourlyRows,
        includeHourly: Boolean(hourlyWindow),
      });

      const filename = `tidehawk-fishing-report-${selectedDate}.png`;
      const imageUrl = URL.createObjectURL(imageBlob);

      setGenerated({
        imageUrl,
        imageBlob,
        text,
        filename,
      });
      setMessage("Report generated.");
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : "Unable to generate the report.",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function copyTextReport() {
    if (!generated) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generated.text);
      setMessage("Plain-text report copied.");
    } catch {
      setMessage("Copy failed. You can select the text manually below.");
    }
  }

  async function shareGeneratedReport() {
    if (!generated) {
      return;
    }

    if (!navigator.share) {
      setMessage("Native sharing is not available in this browser. Use Save image or Copy text instead.");
      return;
    }

    const file = new File(
      [generated.imageBlob],
      generated.filename,
      { type: "image/png" },
    );

    try {
      if (
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({
          title: "TideHawk Fishing Report",
          text: generated.text,
          files: [file],
        });
      } else {
        await navigator.share({
          title: "TideHawk Fishing Report",
          text: generated.text,
        });
      }
    } catch (caught) {
      if (
        caught instanceof DOMException &&
        caught.name === "AbortError"
      ) {
        return;
      }
      setMessage("Unable to open the share sheet.");
    }
  }

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
      <section className="dashboard-theme flex max-h-[96dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-2xl sm:max-h-[92vh] sm:rounded-3xl">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border)] px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ReportIcon />
              <div>
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  Fishing report
                </h2>
                <p className="text-xs font-medium text-[var(--accent)]">
                  Configure, then generate a shareable image + text report
                </p>
              </div>
            </div>
            <p className="mt-1 truncate text-sm text-[var(--muted)]">
              {reportLocation}
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
              {reportItems.map((item, index) => (
                <div
                  key={`${index}-${item.metric}`}
                  className="min-w-0 bg-[var(--surface)] p-3 sm:p-4"
                >
                  <select
                    value={item.metric}
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
                    {item.value}
                  </p>
                </div>
              ))}
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
              Choose a morning, afternoon, evening, or custom time frame to include hourly temperature, rain, wind, and gusts in the generated report.
            </p>
          )}

          <div className="sticky bottom-0 z-10 -mx-4 mt-5 border-t border-[var(--border)] bg-[var(--surface)]/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
            <button
              type="button"
              onClick={() => void generateReport()}
              disabled={generating || !selectedDay}
              className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating
                ? "Generating report…"
                : "Generate report image + text"}
            </button>
            <p className="mt-2 text-center text-[11px] text-[var(--muted)]">
              Creates a mobile-format PNG and matching plain-text report in your browser.
            </p>
          </div>

          {message ? (
            <p className="mt-3 rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-center text-xs text-[var(--muted)]">
              {message}
            </p>
          ) : null}

          {generated ? (
            <section className="mt-5 space-y-4 border-t border-[var(--border)] pt-5">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold">Shareable image</h3>
                    <p className="text-xs text-[var(--muted)]">
                      Portrait/mobile layout, ready for messages or social sharing.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={generated.imageUrl}
                      download={generated.filename}
                      className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-medium hover:bg-[var(--surface-muted)]"
                    >
                      Save image
                    </a>
                    <button
                      type="button"
                      onClick={() => void shareGeneratedReport()}
                      className="rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-medium text-white"
                    >
                      Share report
                    </button>
                  </div>
                </div>

                <div className="mx-auto mt-3 max-w-[390px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] shadow-sm">
                  <img
                    src={generated.imageUrl}
                    alt="Generated TideHawk fishing report preview"
                    className="block h-auto w-full"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold">Plain-text report</h3>
                    <p className="text-xs text-[var(--muted)]">
                      Same data, formatted for text messages, posts, or notes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyTextReport()}
                    className="shrink-0 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-medium hover:bg-[var(--surface-muted)]"
                  >
                    Copy text
                  </button>
                </div>
                <textarea
                  readOnly
                  value={generated.text}
                  rows={12}
                  className="mt-3 w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 font-mono text-xs leading-5 outline-none"
                />
              </div>
            </section>
          ) : null}
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
        ).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function reportMetricLabel(metric: ReportMetric): string {
  return (
    METRIC_OPTIONS.find((option) => option.value === metric)?.label ??
    metric
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
  return (
    marineData?.hourly.filter(
      (hour) => hour.time.slice(0, 10) === selectedDate,
    ) ?? []
  );
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

function formatTimeFrameLabel(
  frame: TimeFrame,
  customStart: number,
  customEnd: number,
): string {
  const window = getTimeWindow(frame, customStart, customEnd);
  if (!window) {
    return "All-day summary";
  }

  const label =
    frame === "morning"
      ? "Morning"
      : frame === "afternoon"
        ? "Afternoon"
        : frame === "evening"
          ? "Evening"
          : "Custom";

  return `${label} · ${formatClockHour(window.start)}–${formatClockHour(
    window.end,
  )}`;
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

function buildPlainTextReport({
  location,
  selectedDate,
  todayDate,
  condition,
  highF,
  lowF,
  timeFrameLabel,
  items,
  hourlyRows,
  includeHourly,
}: {
  location: string;
  selectedDate: string;
  todayDate: string;
  condition: string;
  highF: number;
  lowF: number;
  timeFrameLabel: string;
  items: ReportItem[];
  hourlyRows: WeatherSourceData["hourly"];
  includeHourly: boolean;
}): string {
  const lines = [
    "TideHawk Fishing Report",
    location,
    `${formatReportDateHeading(selectedDate, todayDate)} · ${formatDateValue(
      selectedDate,
      { month: "short", day: "numeric", year: "numeric" },
    )}`,
    timeFrameLabel,
    "",
    `${condition} · High ${highF}°F · Low ${lowF}°F`,
    "",
    ...items.map((item) => `${item.label}: ${item.value}`),
  ];

  if (includeHourly) {
    lines.push("", "Hourly conditions:");

    if (hourlyRows.length === 0) {
      lines.push("No hourly forecast points are available for this window.");
    } else {
      for (const hour of hourlyRows) {
        lines.push(
          `${formatHourFromLocalTime(hour.time)} — ${roundMeasurement(
            celsiusToFahrenheit(hour.temperatureC),
          )}°F · Rain ${formatPercent(hour.rainChancePercent)} · Wind ${roundMeasurement(
            metersPerSecondToMph(hour.windSpeedMps),
          )} mph ${hour.windDirectionLabel} · Gust ${roundMeasurement(
            metersPerSecondToMph(hour.windGustMps),
          )} mph`,
        );
      }
    }
  }

  lines.push("", "Generated with TideHawk · tidehawk.app");
  return lines.join("\n");
}

async function renderReportImage({
  location,
  selectedDate,
  todayDate,
  condition,
  highF,
  lowF,
  timeFrameLabel,
  items,
  hourlyRows,
  includeHourly,
}: {
  location: string;
  selectedDate: string;
  todayDate: string;
  condition: string;
  highF: number;
  lowF: number;
  timeFrameLabel: string;
  items: ReportItem[];
  hourlyRows: WeatherSourceData["hourly"];
  includeHourly: boolean;
}): Promise<Blob> {
  const width = 1080;
  const padding = 64;
  const cardGap = 22;
  const summaryColumns = 2;
  const summaryRows = Math.ceil(items.length / summaryColumns);
  const summaryCardHeight = 150;
  const hourlyColumns = 3;
  const hourlyCardHeight = 210;
  const hourlyRowsCount = includeHourly
    ? Math.max(1, Math.ceil(hourlyRows.length / hourlyColumns))
    : 0;

  const headerHeight = 360;
  const summaryHeight =
    summaryRows * summaryCardHeight +
    Math.max(0, summaryRows - 1) * cardGap;
  const hourlyHeight = includeHourly
    ? 140 +
      hourlyRowsCount * hourlyCardHeight +
      Math.max(0, hourlyRowsCount - 1) * cardGap
    : 0;
  const footerHeight = 120;
  const height = Math.max(
    1350,
    padding * 2 +
      headerHeight +
      summaryHeight +
      hourlyHeight +
      footerHeight,
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Image generation is not available in this browser.");
  }

  const background = "#f3f8f8";
  const surface = "#ffffff";
  const surfaceMuted = "#eaf3f3";
  const foreground = "#12282b";
  const muted = "#6b8083";
  const accent = "#0b8793";
  const border = "#cfe0e0";

  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  let y = padding;

  context.fillStyle = accent;
  context.font = "700 38px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  context.fillText("TideHawk", padding, y + 36);

  context.fillStyle = foreground;
  context.font = "700 58px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  context.fillText("Fishing Report", padding, y + 108);

  context.fillStyle = muted;
  context.font = "500 28px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  drawTextWrapped(context, location, padding, y + 158, width - padding * 2, 36, 2);

  context.fillStyle = accent;
  context.font = "700 24px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  context.fillText(
    `${formatReportDateHeading(selectedDate, todayDate).toUpperCase()} · ${formatDateValue(
      selectedDate,
      { month: "short", day: "numeric", year: "numeric" },
    )}`,
    padding,
    y + 236,
  );

  context.fillStyle = muted;
  context.font = "600 24px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  context.fillText(timeFrameLabel, padding, y + 278);

  context.fillStyle = foreground;
  context.font = "700 36px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  drawTextWrapped(
    context,
    `${condition} · High ${highF}° · Low ${lowF}°F`,
    padding,
    y + 334,
    width - padding * 2,
    42,
    2,
  );

  y += headerHeight;

  const summaryCardWidth =
    (width - padding * 2 - cardGap) / summaryColumns;

  items.forEach((item, index) => {
    const column = index % summaryColumns;
    const row = Math.floor(index / summaryColumns);
    const x = padding + column * (summaryCardWidth + cardGap);
    const cardY = y + row * (summaryCardHeight + cardGap);

    drawRoundedRect(
      context,
      x,
      cardY,
      summaryCardWidth,
      summaryCardHeight,
      24,
      surface,
      border,
    );

    context.fillStyle = muted;
    context.font = "600 22px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    drawTextWrapped(
      context,
      item.label,
      x + 24,
      cardY + 40,
      summaryCardWidth - 48,
      28,
      2,
    );

    context.fillStyle = foreground;
    context.font = fitCanvasFont(
      context,
      item.value,
      summaryCardWidth - 48,
      31,
      23,
      700,
    );
    drawTextWrapped(
      context,
      item.value,
      x + 24,
      cardY + 100,
      summaryCardWidth - 48,
      34,
      2,
    );
  });

  y += summaryHeight;

  if (includeHourly) {
    y += 72;
    context.fillStyle = foreground;
    context.font = "700 34px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    context.fillText("Hourly conditions", padding, y);

    context.fillStyle = muted;
    context.font = "500 22px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    context.fillText(
      "Temperature · rain · wind · gusts",
      padding,
      y + 38,
    );
    y += 70;

    const hourlyCardWidth =
      (width - padding * 2 - cardGap * (hourlyColumns - 1)) /
      hourlyColumns;

    if (hourlyRows.length === 0) {
      drawRoundedRect(
        context,
        padding,
        y,
        width - padding * 2,
        hourlyCardHeight,
        24,
        surfaceMuted,
        border,
      );
      context.fillStyle = muted;
      context.font = "600 26px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
      context.textAlign = "center";
      context.fillText(
        "No hourly forecast points for this window",
        width / 2,
        y + hourlyCardHeight / 2,
      );
      context.textAlign = "start";
    } else {
      hourlyRows.forEach((hour, index) => {
        const column = index % hourlyColumns;
        const row = Math.floor(index / hourlyColumns);
        const x =
          padding + column * (hourlyCardWidth + cardGap);
        const cardY = y + row * (hourlyCardHeight + cardGap);

        drawRoundedRect(
          context,
          x,
          cardY,
          hourlyCardWidth,
          hourlyCardHeight,
          22,
          surface,
          border,
        );

        context.fillStyle = accent;
        context.font = "700 24px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
        context.fillText(
          formatHourFromLocalTime(hour.time),
          x + 20,
          cardY + 36,
        );

        context.fillStyle = foreground;
        context.font = "700 36px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
        context.fillText(
          `${roundMeasurement(celsiusToFahrenheit(hour.temperatureC))}°F`,
          x + 20,
          cardY + 86,
        );

        context.fillStyle = muted;
        context.font = "600 19px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
        context.fillText(
          `Rain ${formatPercent(hour.rainChancePercent)}`,
          x + 20,
          cardY + 124,
        );
        context.fillText(
          `Wind ${roundMeasurement(
            metersPerSecondToMph(hour.windSpeedMps),
          )} mph ${hour.windDirectionLabel}`,
          x + 20,
          cardY + 156,
        );
        context.fillText(
          `Gust ${roundMeasurement(
            metersPerSecondToMph(hour.windGustMps),
          )} mph`,
          x + 20,
          cardY + 188,
        );
      });
    }

    y +=
      hourlyRowsCount * hourlyCardHeight +
      Math.max(0, hourlyRowsCount - 1) * cardGap;
  }

  context.fillStyle = accent;
  context.font = "700 22px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  context.fillText("tidehawk.app", padding, height - 58);

  context.fillStyle = muted;
  context.font = "500 20px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  context.textAlign = "right";
  context.fillText("Generated with TideHawk", width - padding, height - 58);
  context.textAlign = "start";

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Unable to create the report image."));
        }
      },
      "image/png",
      0.95,
    );
  });
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
  stroke?: string,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fillStyle = fill;
  context.fill();
  if (stroke) {
    context.strokeStyle = stroke;
    context.lineWidth = 2;
    context.stroke();
  }
}

function drawTextWrapped(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (
      context.measureText(candidate).width <= maxWidth ||
      !line
    ) {
      line = candidate;
      continue;
    }

    lines.push(line);
    line = word;
    if (lines.length === maxLines - 1) {
      break;
    }
  }

  if (line && lines.length < maxLines) {
    lines.push(line);
  }

  lines.slice(0, maxLines).forEach((value, index) => {
    let output = value;
    if (
      index === maxLines - 1 &&
      context.measureText(output).width > maxWidth
    ) {
      while (
        output.length > 1 &&
        context.measureText(`${output}…`).width > maxWidth
      ) {
        output = output.slice(0, -1);
      }
      output += "…";
    }
    context.fillText(output, x, y + index * lineHeight);
  });
}

function fitCanvasFont(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  preferredSize: number,
  minimumSize: number,
  weight: number,
): string {
  let size = preferredSize;
  while (size > minimumSize) {
    context.font = `${weight} ${size}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    if (context.measureText(text).width <= maxWidth) {
      break;
    }
    size -= 1;
  }
  return `${weight} ${size}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
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
