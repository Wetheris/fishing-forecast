"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  DashboardSource,
  FishingDashboard,
} from "@/types/dashboard";
import type { ForecastContext } from "@/types/forecast";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { DashboardStage } from "@/components/dashboard/DashboardStage";
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
      media.removeEventListener("change", update);
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

  const activeLayout = dashboard
    ? preferMobile
      ? viewerLayouts.find(
          (layout) =>
            layout.device === "mobile",
        ) ?? viewerLayouts[0]
      : viewerLayouts.find(
          (layout) =>
            layout.device === "desktop",
        ) ?? viewerLayouts[0]
    : undefined;

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
    <main
      className="dashboard-theme min-h-screen text-[var(--foreground)]"
      data-theme={dashboard.theme}
      style={{
        backgroundColor:
          "var(--dashboard-background, var(--background))",
        backgroundImage:
          "var(--dashboard-pattern, none)",
        backgroundSize:
          "var(--dashboard-pattern-size, auto)",
        backgroundPosition: "center",
      }}
    >
      <Link
        href={editHref}
        className="fixed right-3 top-3 z-50 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium shadow-sm hover:bg-[var(--surface-muted)]"
      >
        Edit
      </Link>

      <DashboardStage
        dashboard={dashboard}
        layout={activeLayout}
        subtitle={primaryWeatherSource?.label}
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
        mode="view"
      />
    </main>
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
