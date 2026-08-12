import type { WidgetComponentProps } from "@/widgets/types";
import {
  CompactTimeline,
  DataList,
  MetricValue,
  WidgetDataMessage,
} from "@/widgets/shared/WidgetPrimitives";
import { LiveDataView } from "@/widgets/shared/LiveDataView";
import { TideChart } from "@/widgets/tides/TideChart";
import {
  booleanSetting,
  stringSetting,
} from "@/lib/widget-settings";
import {
  feetToMeters,
  roundToTenth,
} from "@/lib/units";
import {
  formatCompactForecastDateLabel,
  formatForecastDateLabel,
} from "@/lib/forecast-selection";
import type {
  TideEvent,
  TideSourceData,
} from "@/types/source-data";

export function NextHighTideWidget({
  widget,
  tideState,
  forecastContext,
}: WidgetComponentProps) {
  return (
    <LiveDataView
      state={tideState}
      sourceName="NOAA tides"
      loadingDetail="Fetching NOAA tide predictions."
    >
      {(data) => {
        const event = findSelectedEvent(
          data,
          forecastContext.selectedDate,
          forecastContext.todayDate,
          "high",
        );

        return event ? (
          <MetricValue
            value={event.displayTime}
            detail={formatHeight(
              event.heightFt,
              widget,
            )}
          />
        ) : (
          <MetricValue
            value="Unavailable"
            detail="No high tide prediction for this date."
          />
        );
      }}
    </LiveDataView>
  );
}

export function NextLowTideWidget({
  widget,
  tideState,
  forecastContext,
}: WidgetComponentProps) {
  return (
    <LiveDataView
      state={tideState}
      sourceName="NOAA tides"
      loadingDetail="Fetching NOAA tide predictions."
    >
      {(data) => {
        const event = findSelectedEvent(
          data,
          forecastContext.selectedDate,
          forecastContext.todayDate,
          "low",
        );

        return event ? (
          <MetricValue
            value={event.displayTime}
            detail={formatHeight(
              event.heightFt,
              widget,
            )}
          />
        ) : (
          <MetricValue
            value="Unavailable"
            detail="No low tide prediction for this date."
          />
        );
      }}
    </LiveDataView>
  );
}

export function TideStatusWidget({
  tideState,
  forecastContext,
}: WidgetComponentProps) {
  return (
    <LiveDataView
      state={tideState}
      sourceName="NOAA tides"
      loadingDetail="Loading tide movement and turns."
    >
      {(data) => {
        const isToday =
          forecastContext.selectedDate ===
          forecastContext.todayDate;

        if (isToday) {
          return (
            <MetricValue
              value={capitalize(data.currentTrend)}
              detail={formatTurnCountdown(
                data.minutesUntilTurn,
              )}
            />
          );
        }

        const events = eventsForDate(
          data,
          forecastContext.selectedDate,
        );

        return (
          <MetricValue
            value={
              events.length === 0
                ? "Unavailable"
                : `${events.length} tide turns`
            }
            detail={
              events.length > 0
                ? events
                    .map(
                      (event) =>
                        `${capitalize(
                          event.type,
                        )} ${event.displayTime}`,
                    )
                    .join(" · ")
                : "No tide events were returned for this date."
            }
          />
        );
      }}
    </LiveDataView>
  );
}

export function TideTimelineWidget({
  widget,
  tideState,
  forecastContext,
}: WidgetComponentProps) {
  const displayMode = stringSetting(
    widget.settings,
    "displayMode",
    "list",
  );
  const showCurrentMarker = booleanSetting(
    widget.settings,
    "showCurrentMarker",
    true,
  );
  const showHighLowLabels = booleanSetting(
    widget.settings,
    "showHighLowLabels",
    true,
  );
  const compact =
    stringSetting(
      widget.settings,
      "density",
      "standard",
    ) === "compact";

  return (
    <LiveDataView
      state={tideState}
      sourceName="NOAA tides"
      loadingDetail="Loading high, low, and six-minute predictions."
    >
      {(data) => {
        const isToday =
          forecastContext.selectedDate ===
          forecastContext.todayDate;
        const dateEvents = eventsForDate(
          data,
          forecastContext.selectedDate,
        );
        const upcomingEvents = data.events.filter(
          (event) =>
            event.localTime >=
            data.currentLocalTime,
        );
        const chartEvents = isToday
          ? upcomingEvents.slice(0, 5)
          : dateEvents;
        const visibleEvents =
          chartEvents.slice(0, 4);
        const chartEnd =
          chartEvents.at(-1)?.localTime;
        const timeline = data.timeline.filter(
          (point) => {
            if (!isToday) {
              return (
                point.localTime.slice(0, 10) ===
                forecastContext.selectedDate
              );
            }

            return (
              point.localTime >=
                data.currentLocalTime &&
              (!chartEnd ||
                point.localTime <= chartEnd)
            );
          },
        );

        if (chartEvents.length === 0) {
          return (
            <WidgetDataMessage
              title="Tide forecast unavailable"
              detail={`This NOAA station did not return tide predictions for ${formatForecastDateLabel(
                {
                  date: forecastContext.selectedDate,
                  todayDate:
                    forecastContext.todayDate,
                },
              )}.`}
            />
          );
        }

        const canShowChart =
          displayMode === "chart" &&
          !compact &&
          (timeline.length >= 2 ||
            chartEvents.length >= 2);

        if (canShowChart) {
          const approximate =
            timeline.length < 2;

          return (
            <div className="flex h-full min-h-0 flex-col gap-1.5">
              <div className="min-h-0 flex-1">
                <TideChart
                  events={chartEvents}
                  timeline={timeline}
                  currentLocalTime={
                    data.currentLocalTime
                  }
                  showCurrentMarker={
                    isToday &&
                    showCurrentMarker
                  }
                  showHighLowLabels={
                    showHighLowLabels
                  }
                  compact={false}
                />
              </div>

              {approximate ? (
                <p className="shrink-0 text-center text-[10px] text-[var(--muted)]">
                  Approximate curve from NOAA high/low predictions.
                </p>
              ) : null}
            </div>
          );
        }

        return (
          <CompactTimeline
            columns={visibleEvents.map(
              (event) => ({
                label: tideEventLabel(
                  event,
                  forecastContext.todayDate,
                  isToday,
                ),
                primary: event.displayTime,
                secondary: formatHeight(
                  event.heightFt,
                  widget,
                ),
              }),
            )}
          />
        );
      }}
    </LiveDataView>
  );
}

export function TideStationWidget({
  tideState,
}: WidgetComponentProps) {
  return (
    <LiveDataView
      state={tideState}
      sourceName="NOAA station"
      loadingDetail="Loading NOAA station metadata."
    >
      {(data) => (
        <DataList
          rows={[
            {
              label: "Station",
              value: data.station.name,
            },
            {
              label: "NOAA ID",
              value: data.station.id,
            },
            {
              label: "Datum",
              value: data.datum,
            },
            ...(data.station.distanceMiles !== null
              ? [
                  {
                    label: "Distance",
                    value: `${roundToTenth(
                      data.station.distanceMiles,
                    )} miles`,
                  },
                ]
              : []),
          ]}
        />
      )}
    </LiveDataView>
  );
}

function eventsForDate(
  data: TideSourceData,
  date: string,
): TideEvent[] {
  return data.events.filter(
    (event) =>
      event.localTime.slice(0, 10) === date,
  );
}

function findSelectedEvent(
  data: TideSourceData,
  selectedDate: string,
  todayDate: string,
  type: TideEvent["type"],
): TideEvent | null {
  if (selectedDate === todayDate) {
    return (
      data.events.find(
        (event) =>
          event.type === type &&
          event.localTime >=
            data.currentLocalTime,
      ) ?? null
    );
  }

  return (
    eventsForDate(data, selectedDate).find(
      (event) => event.type === type,
    ) ?? null
  );
}

function tideEventLabel(
  event: TideEvent,
  todayDate: string,
  showDate: boolean,
): string {
  const tideLabel =
    event.type === "high" ? "High" : "Low";

  if (!showDate) {
    return tideLabel;
  }

  const eventDate =
    event.localTime.slice(0, 10);

  if (eventDate === todayDate) {
    return tideLabel;
  }

  return `${tideLabel} · ${formatCompactForecastDateLabel(
    {
      date: eventDate,
      todayDate,
    },
  )}`;
}

function formatHeight(
  heightFt: number,
  widget: WidgetComponentProps["widget"],
): string {
  const unit = stringSetting(
    widget.settings,
    "heightUnit",
    "feet",
  );

  return unit === "meters"
    ? `${roundToTenth(
        feetToMeters(heightFt),
      )} m`
    : `${roundToTenth(heightFt)} ft`;
}

function formatTurnCountdown(
  minutes: number | null,
): string | undefined {
  if (minutes === null) {
    return undefined;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours === 0) {
    return `${remainder} min until the next turn`;
  }

  return `${hours} hr ${remainder} min until the next turn`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() +
    value.slice(1);
}
