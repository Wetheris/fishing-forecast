import type { WidgetComponentProps } from "@/widgets/types";
import {
  DataList,
  MetricValue,
} from "@/widgets/shared/WidgetPrimitives";
import { LiveDataView } from "@/widgets/shared/LiveDataView";
import {
  metersToFeet,
  roundToTenth,
} from "@/lib/units";
import { stringSetting } from "@/lib/widget-settings";

export function WaveHeightWidget({
  widget,
  marineState,
}: WidgetComponentProps) {
  return (
    <LiveDataView
      state={marineState}
      sourceName="marine forecast"
      loadingDetail="Fetching the latest Open-Meteo wave forecast."
    >
      {(data) => (
        <MetricValue
          value={formatLength(
            data.current.waveHeightM,
            widget,
          )}
          detail={`${roundToTenth(
            data.resolvedGrid.distanceMiles,
          )} mi to model grid`}
        />
      )}
    </LiveDataView>
  );
}

export function WaveDirectionWidget({
  marineState,
}: WidgetComponentProps) {
  return (
    <LiveDataView
      state={marineState}
      sourceName="marine forecast"
      loadingDetail="Fetching wave direction."
    >
      {(data) => (
        <MetricValue
          value={
            data.current.waveDirectionLabel
          }
          detail={`${Math.round(
            data.current.waveDirectionDegrees,
          )}°`}
        />
      )}
    </LiveDataView>
  );
}

export function WavePeriodWidget({
  marineState,
}: WidgetComponentProps) {
  return (
    <LiveDataView
      state={marineState}
      sourceName="marine forecast"
      loadingDetail="Fetching wave period."
    >
      {(data) => (
        <MetricValue
          value={`${roundToTenth(
            data.current.wavePeriodSeconds,
          )} sec`}
          detail="Wave period"
        />
      )}
    </LiveDataView>
  );
}

export function SwellInformationWidget({
  widget,
  marineState,
}: WidgetComponentProps) {
  return (
    <LiveDataView
      state={marineState}
      sourceName="marine forecast"
      loadingDetail="Fetching swell conditions."
    >
      {(data) => (
        <DataList
          rows={[
            {
              label: "Swell height",
              value:
                data.current.swellHeightM === null
                  ? "Unavailable"
                  : formatLength(
                      data.current.swellHeightM,
                      widget,
                    ),
            },
            {
              label: "Swell direction",
              value:
                data.current
                  .swellDirectionLabel ??
                "Unavailable",
            },
            {
              label: "Swell period",
              value:
                data.current
                  .swellPeriodSeconds === null
                  ? "Unavailable"
                  : `${roundToTenth(
                      data.current
                        .swellPeriodSeconds,
                    )} sec`,
            },
          ]}
        />
      )}
    </LiveDataView>
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
