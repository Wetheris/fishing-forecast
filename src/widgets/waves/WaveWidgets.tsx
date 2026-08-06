import type { WidgetComponentProps } from "@/widgets/types";
import {
  DataList,
  MetricValue,
  WidgetDataMessage,
} from "@/widgets/shared/WidgetPrimitives";
import { LiveDataView } from "@/widgets/shared/LiveDataView";
import {
  metersToFeet,
  roundToTenth,
} from "@/lib/units";
import { stringSetting } from "@/lib/widget-settings";
import { formatForecastDateLabel } from "@/lib/forecast-selection";
import type { MarineHour } from "@/types/source-data";

export function WaveHeightWidget({
  widget,
  marineState,
  forecastContext,
}: WidgetComponentProps) {
  return (
    <LiveDataView
      state={marineState}
      sourceName="marine forecast"
      loadingDetail="Fetching the latest Open-Meteo wave forecast."
    >
      {(data) => {
        const isToday =
          forecastContext.selectedDate ===
          forecastContext.todayDate;

        if (isToday) {
          return (
            <MetricValue
              value={formatLength(
                data.current.waveHeightM,
                widget,
              )}
              detail={`${roundToTenth(
                data.resolvedGrid.distanceMiles,
              )} mi to model grid`}
            />
          );
        }

        const hours = marineHoursForDate(
          data.hourly,
          forecastContext.selectedDate,
        );

        if (hours.length === 0) {
          return missingMarineForecast(
            forecastContext.selectedDate,
            forecastContext.todayDate,
          );
        }

        return (
          <MetricValue
            value={formatLengthRange(
              hours.map(
                (hour) => hour.waveHeightM,
              ),
              widget,
            )}
            detail="Forecast wave-height range"
          />
        );
      }}
    </LiveDataView>
  );
}

export function WaveDirectionWidget({
  marineState,
  forecastContext,
}: WidgetComponentProps) {
  return (
    <LiveDataView
      state={marineState}
      sourceName="marine forecast"
      loadingDetail="Fetching wave direction."
    >
      {(data) => {
        const isToday =
          forecastContext.selectedDate ===
          forecastContext.todayDate;

        if (isToday) {
          return (
            <MetricValue
              value={
                data.current.waveDirectionLabel
              }
              detail={`${Math.round(
                data.current
                  .waveDirectionDegrees,
              )}° · Live now`}
            />
          );
        }

        const hours = marineHoursForDate(
          data.hourly,
          forecastContext.selectedDate,
        );
        const labels = dominantLabels(
          hours.map(
            (hour) =>
              hour.waveDirectionLabel,
          ),
        );

        return (
          <MetricValue
            value={
              labels.length === 0
                ? "Unavailable"
                : labels.join(" → ")
            }
            detail="Predominant direction changes"
          />
        );
      }}
    </LiveDataView>
  );
}

export function WavePeriodWidget({
  marineState,
  forecastContext,
}: WidgetComponentProps) {
  return (
    <LiveDataView
      state={marineState}
      sourceName="marine forecast"
      loadingDetail="Fetching wave period."
    >
      {(data) => {
        const isToday =
          forecastContext.selectedDate ===
          forecastContext.todayDate;

        if (isToday) {
          return (
            <MetricValue
              value={`${roundToTenth(
                data.current.wavePeriodSeconds,
              )} sec`}
              detail="Current wave period"
            />
          );
        }

        const hours = marineHoursForDate(
          data.hourly,
          forecastContext.selectedDate,
        );

        return (
          <MetricValue
            value={formatNumberRange(
              hours.map(
                (hour) =>
                  hour.wavePeriodSeconds,
              ),
              "sec",
            )}
            detail="Forecast period range"
          />
        );
      }}
    </LiveDataView>
  );
}

export function SwellInformationWidget({
  widget,
  marineState,
  forecastContext,
}: WidgetComponentProps) {
  return (
    <LiveDataView
      state={marineState}
      sourceName="marine forecast"
      loadingDetail="Fetching swell conditions."
    >
      {(data) => {
        const isToday =
          forecastContext.selectedDate ===
          forecastContext.todayDate;
        const hours = isToday
          ? [data.current]
          : marineHoursForDate(
              data.hourly,
              forecastContext.selectedDate,
            );

        if (hours.length === 0) {
          return missingMarineForecast(
            forecastContext.selectedDate,
            forecastContext.todayDate,
          );
        }

        const swellHeights = hours
          .map((hour) => hour.swellHeightM)
          .filter(
            (value): value is number =>
              value !== null,
          );
        const swellPeriods = hours
          .map(
            (hour) =>
              hour.swellPeriodSeconds,
          )
          .filter(
            (value): value is number =>
              value !== null,
          );
        const directionLabels = dominantLabels(
          hours
            .map(
              (hour) =>
                hour.swellDirectionLabel,
            )
            .filter(
              (value): value is string =>
                value !== null,
            ),
        );

        return (
          <DataList
            rows={[
              {
                label: "Swell height",
                value:
                  swellHeights.length === 0
                    ? "Unavailable"
                    : formatLengthRange(
                        swellHeights,
                        widget,
                      ),
              },
              {
                label: "Swell direction",
                value:
                  directionLabels.length === 0
                    ? "Unavailable"
                    : directionLabels.join(
                        " → ",
                      ),
              },
              {
                label: "Swell period",
                value: formatNumberRange(
                  swellPeriods,
                  "sec",
                ),
              },
            ]}
          />
        );
      }}
    </LiveDataView>
  );
}

function marineHoursForDate(
  hours: MarineHour[],
  date: string,
): MarineHour[] {
  return hours.filter(
    (hour) => hour.time.slice(0, 10) === date,
  );
}

function missingMarineForecast(
  date: string,
  todayDate: string,
) {
  return (
    <WidgetDataMessage
      title="Wave forecast unavailable"
      detail={`Marine forecast data is not available for ${formatForecastDateLabel(
        { date, todayDate },
      )}.`}
    />
  );
}

function formatLength(
  meters: number,
  widget: WidgetComponentProps["widget"],
): string {
  const unit = stringSetting(
    widget.settings,
    "lengthUnit",
    "feet",
  );

  return unit === "meters"
    ? `${roundToTenth(meters)} m`
    : `${roundToTenth(
        metersToFeet(meters),
      )} ft`;
}

function formatLengthRange(
  values: number[],
  widget: WidgetComponentProps["widget"],
): string {
  if (values.length === 0) {
    return "Unavailable";
  }

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const first = formatLength(minimum, widget);
  const second = formatLength(maximum, widget);

  if (first === second) {
    return first;
  }

  return `${first.split(" ")[0]}–${second}`;
}

function formatNumberRange(
  values: number[],
  unit: string,
): string {
  if (values.length === 0) {
    return "Unavailable";
  }

  const minimum = roundToTenth(
    Math.min(...values),
  );
  const maximum = roundToTenth(
    Math.max(...values),
  );

  return minimum === maximum
    ? `${minimum} ${unit}`
    : `${minimum}–${maximum} ${unit}`;
}

function dominantLabels(
  labels: string[],
): string[] {
  if (labels.length === 0) {
    return [];
  }

  const sections = [
    labels.slice(
      0,
      Math.max(1, Math.floor(labels.length / 3)),
    ),
    labels.slice(
      Math.floor(labels.length / 3),
      Math.max(
        2,
        Math.floor((labels.length * 2) / 3),
      ),
    ),
    labels.slice(
      Math.floor((labels.length * 2) / 3),
    ),
  ];

  return sections
    .map(mostCommon)
    .filter(
      (value): value is string => value !== null,
    )
    .filter(
      (value, index, all) =>
        index === 0 || value !== all[index - 1],
    );
}

function mostCommon(
  labels: string[],
): string | null {
  const counts = new Map<string, number>();

  for (const label of labels) {
    counts.set(
      label,
      (counts.get(label) ?? 0) + 1,
    );
  }

  return (
    [...counts.entries()].sort(
      (first, second) => second[1] - first[1],
    )[0]?.[0] ?? null
  );
}
