import type { ReactNode } from "react";
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

type SourceIcon =
  | "weather"
  | "tides"
  | "marine"
  | "moon";

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
          Each section controls a different kind of fishing data.
          Widgets reuse the matching source automatically.
        </p>
      </header>

      <div className="mt-5 space-y-5">
        <SourceGroup
          icon="weather"
          label="Weather & radar"
          provider="Open-Meteo + RainViewer"
          detail="Weather, wind, forecasts, and radar use this location."
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
          icon="tides"
          label="Tides"
          provider="NOAA"
          detail="Choose the tide station used by tide widgets. You can keep more than one."
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
          icon="marine"
          label="Marine"
          provider="Open-Meteo Marine"
          detail="Wave, swell, and modeled water-temperature data use these coordinates."
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
          icon="moon"
          label="Moon & sun"
          provider="Astronomy calculations"
          detail="Moon phase, illumination, sunrise, sunset, moonrise, and moonset use this location."
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
  icon,
  label,
  provider,
  detail,
  children,
}: {
  icon: SourceIcon;
  label: string;
  provider: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
      <header className="border-b border-[var(--border)] px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--selection)] text-[var(--accent)]">
            <SourceIconGraphic icon={icon} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              {provider}
            </p>
            <h3 className="mt-0.5 text-base font-semibold">
              {label}
            </h3>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
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

function SourceIconGraphic({
  icon,
}: {
  icon: SourceIcon;
}) {
  if (icon === "weather") {
    return (
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
        <path d="M6 18h11a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.2 8.1 5 5 0 0 0 6 18Z" />
      </svg>
    );
  }

  if (icon === "tides") {
    return (
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
        <path d="M4 8c2-2 4-2 6 0s4 2 6 0 4-2 4-2" />
        <path d="M4 14c2-2 4-2 6 0s4 2 6 0 4-2 4-2" />
        <path d="M12 19v-3" />
        <path d="m9.5 18.5 2.5 2.5 2.5-2.5" />
      </svg>
    );
  }

  if (icon === "marine") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M3 16c3 0 3-3 6-3s3 3 6 3 3-3 6-3" />
        <path d="M3 11c3 0 3-3 6-3s3 3 6 3 3-3 6-3" />
      </svg>
    );
  }

  return (
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
      <path d="M20 15.5A8 8 0 1 1 8.5 4 6.5 6.5 0 0 0 20 15.5Z" />
    </svg>
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
  children: ReactNode;
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
