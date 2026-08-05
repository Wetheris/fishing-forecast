import type { DashboardSource } from "@/types/dashboard";
import type { WeatherLocationSelection } from "@/types/geocoding";
import { WeatherSourceEditor } from "@/components/sources/WeatherSourceEditor";

export function SourcesPanel({
  sources,
  onWeatherLocationChange,
}: {
  sources: DashboardSource[];
  onWeatherLocationChange: (
    location: WeatherLocationSelection,
  ) => void;
}) {
  const weatherSource = sources.find(
    (source) => source.kind === "weather-location",
  );

  return (
    <div>
      <header>
        <h2 className="font-medium">Data sources</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Widgets reference reusable sources, so matching widgets
          share one request.
        </p>
      </header>

      {weatherSource ? (
        <div className="mt-5">
          <WeatherSourceEditor
            source={weatherSource}
            onLocationChange={onWeatherLocationChange}
          />
        </div>
      ) : null}

      <hr className="my-5 border-[var(--border)]" />

      <div className="space-y-3">
        {sources
          .filter(
            (source) =>
              source.kind !== "weather-location",
          )
          .map((source) => (
            <article
              key={source.id}
              className="rounded-xl border border-[var(--border)] p-3"
            >
              <p className="font-medium">{source.label}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {sourceKindLabel(source.kind)}
              </p>
              <span className="mt-2 inline-block rounded-full bg-[var(--surface-muted)] px-2 py-1 text-xs text-[var(--muted)]">
                Mock source
              </span>
            </article>
          ))}
      </div>
    </div>
  );
}

function sourceKindLabel(
  kind: DashboardSource["kind"],
): string {
  const labels: Record<
    DashboardSource["kind"],
    string
  > = {
    "weather-location": "Weather & wind location",
    "tide-station": "NOAA tide station",
    "marine-location": "Marine coordinate",
    "astronomy-location": "Moon & sun location",
  };

  return labels[kind];
}
