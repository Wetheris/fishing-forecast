import type { WidgetComponentProps } from "@/widgets/types";
import {
  CompactTimeline,
  DataList,
  MetricValue,
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

export function NextHighTideWidget({
  widget,
  tideState,
}: WidgetComponentProps) {
  return (
    <LiveDataView
      state={tideState}
      sourceName="NOAA tides"
      loadingDetail="Fetching the latest NOAA tide predictions."
    >
      {(data) =>
        data.nextHigh ? (
          <MetricValue
            value={data.nextHigh.displayTime}
            detail={formatHeight(
              data.nextHigh.heightFt,
              widget,
            )}
          />
        ) : (
          <MetricValue
            value="Unavailable"
            detail="No upcoming high tide was returned."
          />
        )
      }
    </LiveDataView>
  );
}

export function NextLowTideWidget({
  widget,
  tideState,
}: WidgetComponentProps) {
  return (
    <LiveDataView
      state={tideState}
      sourceName="NOAA tides"
      loadingDetail="Fetching the latest NOAA tide predictions."
    >
      {(data) =>
        data.nextLow ? (
          <MetricValue
            value={data.nextLow.displayTime}
            detail={formatHeight(
              data.nextLow.heightFt,
              widget,
            )}
          />
        ) : (
          <MetricValue
            value="Unavailable"
            detail="No upcoming low tide was returned."
          />
        )
      }
    </LiveDataView>
  );
}

export function TideStatusWidget({
  tideState,
}: WidgetComponentProps) {
  return (
    <LiveDataView
      state={tideState}
      sourceName="NOAA tides"
      loadingDetail="Determining the current tide movement."
    >
      {(data) => (
        <MetricValue
          value={capitalize(data.currentTrend)}
          detail={formatTurnCountdown(
            data.minutesUntilTurn,
          )}
        />
      )}
    </LiveDataView>
  );
}

export function TideTimelineWidget({
  widget,
  tideState,
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

  return (
    <LiveDataView
      state={tideState}
      sourceName="NOAA tides"
      loadingDetail="Loading high, low, and six-minute predictions."
    >
      {(data) =>
        displayMode === "chart" ? (
          <TideChart
            events={data.events}
            timeline={data.timeline}
            currentLocalTime={
              data.currentLocalTime
            }
            showCurrentMarker={
              showCurrentMarker
            }
            showHighLowLabels={
              showHighLowLabels
            }
          />
        ) : (
          <CompactTimeline
            columns={data.events
              .filter(
                (event) =>
                  event.localTime >
                  data.currentLocalTime,
              )
              .slice(0, 4)
              .map((event) => ({
                label:
                  event.type === "high"
                    ? "High"
                    : "Low",
                primary: event.displayTime,
                secondary: formatHeight(
                  event.heightFt,
                  widget,
                ),
              }))}
          />
        )
      }
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
