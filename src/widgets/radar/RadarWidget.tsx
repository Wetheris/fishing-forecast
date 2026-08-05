import type {
  WidgetComponentProps,
} from "@/widgets/types";
import { numberSetting, booleanSetting } from "@/lib/widget-settings";
import { LiveDataView } from "@/widgets/shared/LiveDataView";
import { RadarMap } from "@/widgets/radar/RadarMap";

export function RadarWidget({
  widget,
  source,
  radarState,
}: WidgetComponentProps) {
  const zoom = numberSetting(
    widget.settings,
    "zoom",
    7,
  );
  const opacity = numberSetting(
    widget.settings,
    "opacity",
    0.72,
  );
  const animate = booleanSetting(
    widget.settings,
    "animate",
    true,
  );
  const frameDurationMs = numberSetting(
    widget.settings,
    "frameDurationMs",
    750,
  );
  const showLocationMarker = booleanSetting(
    widget.settings,
    "showLocationMarker",
    true,
  );

  return (
    <LiveDataView
      state={radarState}
      sourceName="radar"
      loadingDetail="Loading recent radar frames."
    >
      {(data) => (
        <RadarMap
          source={source}
          data={data}
          zoom={Math.min(
            7,
            Math.max(3, zoom),
          )}
          opacity={Math.min(
            1,
            Math.max(0.2, opacity),
          )}
          animate={animate}
          frameDurationMs={Math.min(
            2500,
            Math.max(
              300,
              frameDurationMs,
            ),
          )}
          showLocationMarker={
            showLocationMarker
          }
        />
      )}
    </LiveDataView>
  );
}
