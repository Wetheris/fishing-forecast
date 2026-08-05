import type {
  DashboardSource,
  WidgetInstance,
} from "@/types/dashboard";
import type { WeatherLocationSelection } from "@/types/geocoding";
import type {
  AstronomySourceStateMap,
  MarineSourceStateMap,
  RadarSourceStateMap,
  TideSourceStateMap,
} from "@/types/source-data";
import type { TideStationOption } from "@/types/tide-stations";
import type { WeatherSourceStateMap } from "@/types/weather";
import { TideStationEditor } from "@/components/sources/TideStationEditor";
import { WeatherSourceEditor } from "@/components/sources/WeatherSourceEditor";

export function SourcesPanel({
  sources,
  widgets,
  weatherStates,
  tideStates,
  marineStates,
  astronomyStates,
  radarStates,
  onWeatherLocationChange,
  onAddTideSource,
  onRemoveSource,
}: {
  sources: DashboardSource[];
  widgets: WidgetInstance[];
  weatherStates: WeatherSourceStateMap;
  tideStates: TideSourceStateMap;
  marineStates: MarineSourceStateMap;
  astronomyStates: AstronomySourceStateMap;
  radarStates: RadarSourceStateMap;
  onWeatherLocationChange: (
    location: WeatherLocationSelection,
  ) => void;
  onAddTideSource: (
    station: TideStationOption,
  ) => void;
  onRemoveSource: (sourceId: string) => void;
}) {
  const weatherSource = sources.find(
    (source) =>
      source.kind === "weather-location",
  );

  return (
    <div>
      <header>
        <h2 className="font-medium">
          Data sources
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Widgets reference reusable sources and can
          select them independently.
        </p>
      </header>

      {weatherSource ? (
        <div className="mt-5">
          <WeatherSourceEditor
            source={weatherSource}
            onLocationChange={
              onWeatherLocationChange
            }
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <SourceBadge
              label="Open-Meteo live"
              status={
                weatherStates[weatherSource.id]
                  ?.status
              }
            />
            <SourceBadge
              label="Radar live"
              status={
                radarStates[weatherSource.id]
                  ?.status
              }
            />
          </div>
        </div>
      ) : null}

      <hr className="my-5 border-[var(--border)]" />

      <TideStationEditor
        sources={sources}
        widgets={widgets}
        referenceSource={weatherSource}
        tideStates={tideStates}
        onAddSource={onAddTideSource}
        onRemoveSource={onRemoveSource}
      />

      <hr className="my-5 border-[var(--border)]" />

      <div className="space-y-3">
        {sources
          .filter(
            (source) =>
              source.kind ===
                "marine-location" ||
              source.kind ===
                "astronomy-location",
          )
          .map((source) => (
            <article
              key={source.id}
              className="rounded-xl border border-[var(--border)] p-3"
            >
              <p className="font-medium">
                {source.label}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {sourceKindLabel(source.kind)}
              </p>
              <SourceBadge
                label={providerLabel(source.kind)}
                status={sourceStatus({
                  source,
                  marineStates,
                  astronomyStates,
                })}
              />
            </article>
          ))}
      </div>

      <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
        Radar imagery is provided by RainViewer over
        OpenStreetMap. Marine forecasts are model
        guidance and are not suitable for navigation.
      </p>
    </div>
  );
}

function SourceBadge({
  label,
  status,
}: {
  label: string;
  status?:
    | "idle"
    | "loading"
    | "success"
    | "error";
}) {
  const text =
    status === "success"
      ? label
      : status === "error"
        ? "Source error"
        : status === "loading"
          ? "Loading"
          : "Waiting";

  return (
    <span
      className={[
        "inline-block rounded-full px-2 py-1 text-xs",
        status === "error"
          ? "bg-red-50 text-red-700"
          : status === "success"
            ? "bg-emerald-50 text-emerald-700"
            : "bg-[var(--surface-muted)] text-[var(--muted)]",
      ].join(" ")}
    >
      {text}
    </span>
  );
}

function sourceStatus({
  source,
  marineStates,
  astronomyStates,
}: {
  source: DashboardSource;
  marineStates: MarineSourceStateMap;
  astronomyStates: AstronomySourceStateMap;
}) {
  switch (source.kind) {
    case "marine-location":
      return marineStates[source.id]?.status;
    case "astronomy-location":
      return astronomyStates[source.id]?.status;
    case "weather-location":
    case "tide-station":
      return undefined;
  }
}

function providerLabel(
  kind: DashboardSource["kind"],
): string {
  const labels: Record<
    DashboardSource["kind"],
    string
  > = {
    "weather-location": "Open-Meteo live",
    "tide-station": "NOAA live",
    "marine-location": "Marine live",
    "astronomy-location": "Calculated locally",
  };

  return labels[kind];
}

function sourceKindLabel(
  kind: DashboardSource["kind"],
): string {
  const labels: Record<
    DashboardSource["kind"],
    string
  > = {
    "weather-location":
      "Weather, wind, and radar location",
    "tide-station": "NOAA tide station",
    "marine-location": "Marine coordinate",
    "astronomy-location":
      "Moon & sun location",
  };

  return labels[kind];
}
