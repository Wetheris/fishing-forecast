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
  const marineSources = sources.filter(
    (source) =>
      source.kind === "marine-location",
  );
  const astronomySources = sources.filter(
    (source) =>
      source.kind === "astronomy-location",
  );

  return (
    <div>
      <header>
        <h2 className="font-medium">
          Data sources
        </h2>
        <p className="mt-1 text-sm leading-5 text-[var(--muted)]">
          Sources are grouped by what they power. Widgets can reuse
          the same source or select a different compatible source.
        </p>
      </header>

      <div className="mt-5 space-y-4">
        <SourceGroup
          step="1"
          label="Weather & radar"
          detail="Location used by weather, wind, forecast, and radar widgets."
        >
          {weatherSource ? (
            <>
              <WeatherSourceEditor
                source={weatherSource}
                onLocationChange={
                  onWeatherLocationChange
                }
              />

              <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
                <SourceBadge
                  label="Weather live"
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
            </>
          ) : (
            <MissingSource>
              No weather location is configured.
            </MissingSource>
          )}
        </SourceGroup>

        <SourceGroup
          step="2"
          label="Tides"
          detail="NOAA stations used by tide widgets. You can keep more than one station."
        >
          <TideStationEditor
            sources={sources}
            widgets={widgets}
            referenceSource={weatherSource}
            tideStates={tideStates}
            onAddSource={onAddTideSource}
            onRemoveSource={onRemoveSource}
          />
        </SourceGroup>

        <SourceGroup
          step="3"
          label="Marine"
          detail="Coordinates used for waves, swell, and modeled water temperature."
        >
          <SourceList
            sources={marineSources}
            emptyMessage="No marine source is configured."
            getStatus={(source) =>
              marineStates[source.id]?.status
            }
          />
        </SourceGroup>

        <SourceGroup
          step="4"
          label="Moon & sun"
          detail="Location used for moon phase, illumination, sunrise, sunset, moonrise, and moonset."
        >
          <SourceList
            sources={astronomySources}
            emptyMessage="No astronomy source is configured."
            getStatus={(source) =>
              astronomyStates[source.id]?.status
            }
          />
        </SourceGroup>
      </div>

      <p className="mt-5 rounded-xl bg-[var(--surface-muted)] p-3 text-xs leading-5 text-[var(--muted)]">
        Radar imagery is provided by RainViewer over OpenStreetMap.
        Marine forecasts are model guidance and are not suitable for
        navigation.
      </p>
    </div>
  );
}

function SourceGroup({
  step,
  label,
  detail,
  children,
}: {
  step: string;
  label: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
      <header className="border-b border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-xs font-semibold text-[var(--accent)]">
            {step}
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold">
              {label}
            </h3>
            <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">
              {detail}
            </p>
          </div>
        </div>
      </header>
      <div className="p-4">
        {children}
      </div>
    </section>
  );
}

function SourceList({
  sources,
  emptyMessage,
  getStatus,
}: {
  sources: DashboardSource[];
  emptyMessage: string;
  getStatus: (
    source: DashboardSource,
  ) =>
    | "idle"
    | "loading"
    | "success"
    | "error"
    | undefined;
}) {
  if (sources.length === 0) {
    return (
      <MissingSource>
        {emptyMessage}
      </MissingSource>
    );
  }

  return (
    <div className="space-y-3">
      {sources.map((source) => (
        <article
          key={source.id}
          className="rounded-xl border border-[var(--border)] p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">
                {source.label}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {sourceKindLabel(source.kind)}
              </p>
              {typeof source.latitude === "number" &&
              typeof source.longitude === "number" ? (
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  {source.latitude.toFixed(4)},{" "}
                  {source.longitude.toFixed(4)}
                </p>
              ) : null}
            </div>
            <SourceBadge
              label={providerLabel(source.kind)}
              status={getStatus(source)}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

function MissingSource({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="rounded-xl border border-dashed border-[var(--border)] p-3 text-sm text-[var(--muted)]">
      {children}
    </p>
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
        "inline-block shrink-0 rounded-full px-2 py-1 text-xs",
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

function providerLabel(
  kind: DashboardSource["kind"],
): string {
  const labels: Record<
    DashboardSource["kind"],
    string
  > = {
    "weather-location": "Open-Meteo",
    "tide-station": "NOAA",
    "marine-location": "Marine live",
    "astronomy-location": "Calculated",
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
    "marine-location":
      "Wave, swell, and water-temperature coordinate",
    "astronomy-location":
      "Moon and sun location",
  };

  return labels[kind];
}
