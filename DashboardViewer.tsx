"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  DashboardLayout,
  DashboardSource,
  FishingDashboard,
} from "@/types/dashboard";
import type { ForecastContext } from "@/types/forecast";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { DashboardCanvas } from "@/components/dashboard/DashboardCanvas";
import { useWeatherSources } from "@/hooks/useWeatherSources";
import {
  useAstronomySources,
  useMarineSources,
  useRadarSources,
  useTideSources,
} from "@/hooks/useLiveSources";
import {
  loadCloudDashboard,
  loadLocalDashboardDraft,
  loadSharedDashboard,
} from "@/lib/dashboard-storage";
import { createMobileLayoutFromDesktop } from "@/lib/dashboard-layouts";
import { getLayoutContentHeight } from "@/lib/layout-measurements";
import { formatForecastDateLabel } from "@/lib/forecast-selection";

const EMPTY_SOURCES: DashboardSource[] = [];

type ViewerStatus =
  | "loading"
  | "ready"
  | "signin"
  | "error";

type ViewerSource =
  | { kind: "local" }
  | { kind: "cloud"; id: string }
  | { kind: "shared"; token: string };

export function DashboardViewer() {
  const { user, loading: authLoading } =
    useAuth();
  const [dashboard, setDashboard] =
    useState<FishingDashboard>();
  const [viewerSource, setViewerSource] =
    useState<ViewerSource>({ kind: "local" });
  const [status, setStatus] =
    useState<ViewerStatus>("loading");
  const [error, setError] =
    useState<string>();
  const [authOpen, setAuthOpen] =
    useState(false);
  const [preferMobile, setPreferMobile] =
    useState(false);
  const [selectedLayoutId, setSelectedLayoutId] =
    useState<string>();
  const [selectedForecastDateOverride, setSelectedForecastDateOverride] =
    useState<string>();
  const loadAttemptRef =
    useRef<string | undefined>(undefined);

  useEffect(() => {
    const media = window.matchMedia(
      "(max-width: 700px)",
    );

    const update = () => {
      setPreferMobile(media.matches);
    };

    update();
    media.addEventListener("change", update);

    return () => {
      media.removeEventListener(
        "change",
        update,
      );
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search,
    );
    const shareToken = params.get("share");
    const cloudId = params.get("dashboard");

    if (shareToken) {
      const key = `share:${shareToken}`;
      if (loadAttemptRef.current === key) {
        return;
      }

      loadAttemptRef.current = key;
      setViewerSource({
        kind: "shared",
        token: shareToken,
      });
      setStatus("loading");
      setError(undefined);

      void loadSharedDashboard(shareToken)
        .then(({ dashboard: saved }) => {
          setDashboard(saved);
          setSelectedLayoutId(undefined);
          setSelectedForecastDateOverride(
            undefined,
          );
          setStatus("ready");
        })
        .catch((caught: unknown) => {
          setStatus("error");
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load this dashboard link.",
          );
        });
      return;
    }

    if (cloudId) {
      setViewerSource({
        kind: "cloud",
        id: cloudId,
      });

      if (authLoading) {
        return;
      }

      if (!user) {
        setStatus("signin");
        return;
      }

      const key = `cloud:${cloudId}:${user.id}`;
      if (loadAttemptRef.current === key) {
        return;
      }

      loadAttemptRef.current = key;
      setStatus("loading");
      setError(undefined);

      void loadCloudDashboard(cloudId)
        .then((saved) => {
          setDashboard(saved);
          setSelectedLayoutId(undefined);
          setSelectedForecastDateOverride(
            undefined,
          );
          setStatus("ready");
        })
        .catch((caught: unknown) => {
          setStatus("error");
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load this dashboard.",
          );
        });
      return;
    }

    const draft = loadLocalDashboardDraft();
    setViewerSource({ kind: "local" });

    if (!draft) {
      setStatus("error");
      setError(
        "There is no local dashboard draft to view yet.",
      );
      return;
    }

    setDashboard(draft);
    setSelectedLayoutId(undefined);
    setStatus("ready");
  }, [authLoading, user]);

  const sources =
    dashboard?.sources ?? EMPTY_SOURCES;
  const weatherStates = useWeatherSources(sources);
  const tideStates = useTideSources(sources);
  const marineStates = useMarineSources(sources);

  const primaryWeatherSource = sources.find(
    (source) =>
      source.kind === "weather-location",
  );
  const primaryWeatherState = primaryWeatherSource
    ? weatherStates[primaryWeatherSource.id]
    : undefined;
  const primaryWeatherData =
    primaryWeatherState?.status === "success"
      ? primaryWeatherState.data
      : null;
  const fallbackTimezone =
    primaryWeatherSource?.timezone ?? "UTC";
  const todayDate =
    primaryWeatherData?.current.time.slice(0, 10) ??
    dateKeyInTimezone(
      new Date(),
      fallbackTimezone,
    );
  const availableForecastDates =
    primaryWeatherData &&
    primaryWeatherData.daily.length > 0
      ? primaryWeatherData.daily.map(
          (day) => day.date,
        )
      : [todayDate];
  const selectedForecastDate =
    selectedForecastDateOverride &&
    availableForecastDates.includes(
      selectedForecastDateOverride,
    )
      ? selectedForecastDateOverride
      : todayDate;
  const forecastContext: ForecastContext = {
    selectedDate: selectedForecastDate,
    todayDate,
    timezone:
      primaryWeatherData?.timezone ??
      primaryWeatherSource?.timezone ??
      "UTC",
  };

  const astronomyStates = useAstronomySources(
    sources,
    selectedForecastDate,
  );
  const radarStates = useRadarSources(sources);

  const automaticMobileLayout = useMemo(() => {
    if (
      !dashboard ||
      dashboard.layouts.some(
        (layout) => layout.device === "mobile",
      )
    ) {
      return undefined;
    }

    return {
      ...createMobileLayoutFromDesktop(
        dashboard.widgets,
      ),
      id: "viewer-auto-mobile",
      name: "Mobile",
    };
  }, [dashboard]);

  const viewerLayouts = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    return automaticMobileLayout
      ? [
          ...dashboard.layouts,
          automaticMobileLayout,
        ]
      : dashboard.layouts;
  }, [automaticMobileLayout, dashboard]);

  const automaticLayout = dashboard
    ? preferMobile
      ? viewerLayouts.find(
          (layout) => layout.device === "mobile",
        ) ?? viewerLayouts[0]
      : viewerLayouts.find(
          (layout) => layout.device === "desktop",
        ) ?? viewerLayouts[0]
    : undefined;

  const activeLayout =
    viewerLayouts.find(
      (layout) =>
        layout.id === selectedLayoutId,
    ) ?? automaticLayout;

  function updateWidgetSettings(
    widgetId: string,
    settings: Record<string, unknown>,
  ) {
    setDashboard((current) =>
      current
        ? {
            ...current,
            widgets: current.widgets.map(
              (widget) =>
                widget.id === widgetId
                  ? {
                      ...widget,
                      settings: {
                        ...widget.settings,
                        ...settings,
                      },
                    }
                  : widget,
            ),
          }
        : current,
    );
  }

  const editHref = getEditHref(viewerSource);

  if (status === "loading") {
    return (
      <ViewerMessage
        title="Loading dashboard…"
        message="Getting the saved layout and live fishing conditions."
      />
    );
  }

  if (status === "signin") {
    return (
      <>
        <ViewerMessage
          title="Sign in to view this dashboard"
          message="This dashboard belongs to your account."
          action={
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
            >
              Sign in
            </button>
          }
        />
        <AuthDialog
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          initialMode="signin"
          intent="View saved dashboard"
        />
      </>
    );
  }

  if (
    status === "error" ||
    !dashboard ||
    !activeLayout
  ) {
    return (
      <ViewerMessage
        title="Dashboard unavailable"
        message={
          error ??
          "This dashboard could not be loaded."
        }
        action={
          <Link
            href="/build"
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
          >
            Open dashboard builder
          </Link>
        }
      />
    );
  }

  return (
    <main className="min-h-screen bg-[var(--surface-muted)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-5">
          <div className="min-w-0">
            <Link
              href="/"
              className="text-xs font-medium text-[var(--accent)]"
            >
              Fishing Forecast
            </Link>
            <h1 className="truncate text-base font-semibold sm:text-lg">
              {dashboard.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm">
              <span className="hidden text-[var(--muted)] sm:inline">
                Forecast
              </span>
              <select
                aria-label="Forecast date"
                value={selectedForecastDate}
                onChange={(event) =>
                  setSelectedForecastDateOverride(
                    event.target.value,
                  )
                }
                className="bg-transparent font-medium"
              >
                {availableForecastDates.map(
                  (date) => (
                    <option
                      key={date}
                      value={date}
                    >
                      {formatForecastDateLabel({
                        date,
                        todayDate,
                      })}
                    </option>
                  ),
                )}
              </select>
            </label>

            {viewerLayouts.length > 1
              ? viewerLayouts.map((layout) => (
                  <button
                    key={layout.id}
                    type="button"
                    onClick={() =>
                      setSelectedLayoutId(
                        layout.id,
                      )
                    }
                    className={[
                      "rounded-xl px-3 py-2 text-sm",
                      layout.id === activeLayout.id
                        ? "bg-[var(--selection)] font-medium text-[var(--accent)]"
                        : "text-[var(--muted)] hover:bg-[var(--surface-muted)]",
                    ].join(" ")}
                  >
                    {layout.name}
                  </button>
                ))
              : null}

            <Link
              href={editHref}
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
            >
              Edit
            </Link>
          </div>
        </div>
      </header>

      <ResponsiveDashboardCanvas
        dashboard={dashboard}
        layout={activeLayout}
        weatherStates={weatherStates}
        tideStates={tideStates}
        marineStates={marineStates}
        astronomyStates={astronomyStates}
        radarStates={radarStates}
        forecastContext={forecastContext}
        onForecastDateChange={
          setSelectedForecastDateOverride
        }
        onWidgetSettingsChange={
          updateWidgetSettings
        }
      />
    </main>
  );
}

function ResponsiveDashboardCanvas({
  dashboard,
  layout,
  weatherStates,
  tideStates,
  marineStates,
  astronomyStates,
  radarStates,
  forecastContext,
  onForecastDateChange,
  onWidgetSettingsChange,
}: {
  dashboard: FishingDashboard;
  layout: DashboardLayout;
  weatherStates: ReturnType<
    typeof useWeatherSources
  >;
  tideStates: ReturnType<
    typeof useTideSources
  >;
  marineStates: ReturnType<
    typeof useMarineSources
  >;
  astronomyStates: ReturnType<
    typeof useAstronomySources
  >;
  radarStates: ReturnType<
    typeof useRadarSources
  >;
  forecastContext: ForecastContext;
  onForecastDateChange: (date: string) => void;
  onWidgetSettingsChange: (
    widgetId: string,
    settings: Record<string, unknown>,
  ) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] =
    useState(layout.viewport.width);

  useEffect(() => {
    const element = stageRef.current;

    if (!element) {
      return;
    }

    let frame = 0;
    const measure = () => {
      setStageWidth(element.clientWidth);
    };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });

    observer.observe(element);
    measure();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const contentHeight =
    getLayoutContentHeight(layout);
  const horizontalPadding =
    layout.device === "mobile" ? 20 : 48;
  const scale = Math.min(
    1,
    Math.max(
      0.2,
      (stageWidth - horizontalPadding) /
        layout.viewport.width,
    ),
  );
  const displayedWidth = Math.round(
    layout.viewport.width * scale,
  );
  const displayedHeight = Math.round(
    contentHeight * scale,
  );

  return (
    <div
      ref={stageRef}
      className="min-h-[calc(100vh-70px)] overflow-x-auto py-3 sm:py-6"
    >
      <div
        className="mx-auto shrink-0 overflow-hidden border border-[var(--border)] bg-white shadow-sm"
        style={{
          width: displayedWidth,
          height: displayedHeight,
        }}
      >
        <div
          className="origin-top-left"
          style={{
            width: layout.viewport.width,
            height: contentHeight,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <DashboardCanvas
            layout={layout}
            theme={dashboard.theme}
            widgets={dashboard.widgets}
            sources={dashboard.sources}
            weatherStates={weatherStates}
            tideStates={tideStates}
            marineStates={marineStates}
            astronomyStates={astronomyStates}
            radarStates={radarStates}
            forecastContext={forecastContext}
            onForecastDateChange={
              onForecastDateChange
            }
            onWidgetSettingsChange={
              onWidgetSettingsChange
            }
            mode="view"
            scale={scale}
            showGrid={false}
          />
        </div>
      </div>
    </div>
  );
}

function ViewerMessage({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface-muted)] p-5">
      <section className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold">
          {title}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {message}
        </p>
        {action ? (
          <div className="mt-5">{action}</div>
        ) : null}
      </section>
    </main>
  );
}

function getEditHref(
  source: ViewerSource,
): string {
  if (source.kind === "cloud") {
    return `/build?dashboard=${encodeURIComponent(
      source.id,
    )}`;
  }

  if (source.kind === "shared") {
    return `/build?share=${encodeURIComponent(
      source.token,
    )}`;
  }

  return "/build";
}

function dateKeyInTimezone(
  date: Date,
  timezone: string,
): string {
  try {
    const parts = new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(date);
    const values = Object.fromEntries(
      parts.map((part) => [
        part.type,
        part.value,
      ]),
    );

    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
