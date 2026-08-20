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
import { DashboardShareDialog } from "@/components/dashboard/DashboardShareDialog";
import { FishingReportDialog } from "@/components/dashboard/FishingReportDialog";
import { useWeatherSources } from "@/hooks/useWeatherSources";
import {
  useAstronomySources,
  useMarineSources,
  useRadarSources,
  useTideSources,
} from "@/hooks/useLiveSources";
import {
  deleteCloudDashboard,
  loadCloudDashboard,
  loadLocalDashboardDraft,
  loadSharedDashboard,
  saveSharedDashboard,
} from "@/lib/dashboard-storage";
import { createMobileLayoutFromDesktop } from "@/lib/dashboard-layouts";
import {
  celsiusToFahrenheit,
  metersPerSecondToMph,
} from "@/lib/units";

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
  const { user, loading: authLoading } = useAuth();
  const [dashboard, setDashboard] = useState<FishingDashboard>();
  const [viewerSource, setViewerSource] =
    useState<ViewerSource>({ kind: "local" });
  const [status, setStatus] = useState<ViewerStatus>("loading");
  const [error, setError] = useState<string>();
  const [authOpen, setAuthOpen] = useState(false);
  const [preferMobile, setPreferMobile] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string>();
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>();
  const [sharePreparing, setSharePreparing] = useState(false);
  const [shareError, setShareError] = useState<string>();
  const [reportOpen, setReportOpen] = useState(false);
  const [controlsHidden, setControlsHidden] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedForecastDateOverride, setSelectedForecastDateOverride] =
    useState<string>();
  const loadAttemptRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)");
    const update = () => setPreferMobile(media.matches);

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;

    function handleScroll() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const nextY = window.scrollY;
        const delta = nextY - lastY;

        if (
          actionsOpen ||
          shareOpen ||
          reportOpen ||
          nextY < 72
        ) {
          setControlsHidden(false);
        } else if (delta > 5 && nextY > 110) {
          setControlsHidden(true);
          setActionsOpen(false);
        } else if (delta < -5) {
          setControlsHidden(false);
        }

        lastY = nextY;
      });
    }

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [actionsOpen, reportOpen, shareOpen]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareToken = params.get("share");
    const cloudId = params.get("dashboard");

    if (shareToken) {
      const key = `share:${shareToken}`;
      if (loadAttemptRef.current === key) {
        return;
      }

      loadAttemptRef.current = key;
      setViewerSource({ kind: "shared", token: shareToken });
      setStatus("loading");
      setError(undefined);

      void loadSharedDashboard(shareToken)
        .then(({ dashboard: saved }) => {
          setDashboard(saved);
          setSelectedForecastDateOverride(undefined);
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
      setViewerSource({ kind: "cloud", id: cloudId });

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
          setSelectedForecastDateOverride(undefined);
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
      setError("There is no local dashboard draft to view yet.");
      return;
    }

    setDashboard(draft);
    setStatus("ready");
  }, [authLoading, user]);

  const sources = dashboard?.sources ?? EMPTY_SOURCES;
  const weatherStates = useWeatherSources(sources);
  const tideStates = useTideSources(sources);
  const marineStates = useMarineSources(sources);

  const primaryWeatherSource = sources.find(
    (source) => source.kind === "weather-location",
  );
  const primaryTideSource = sources.find(
    (source) => source.kind === "tide-station",
  );
  const primaryMarineSource = sources.find(
    (source) => source.kind === "marine-location",
  );
  const primaryAstronomySource = sources.find(
    (source) => source.kind === "astronomy-location",
  );

  const primaryWeatherState = primaryWeatherSource
    ? weatherStates[primaryWeatherSource.id]
    : undefined;
  const primaryWeatherData =
    primaryWeatherState?.status === "success"
      ? primaryWeatherState.data
      : null;

  const fallbackTimezone = primaryWeatherSource?.timezone ?? "UTC";
  const todayDate =
    primaryWeatherData?.current.time.slice(0, 10) ??
    dateKeyInTimezone(new Date(), fallbackTimezone);
  const availableForecastDates =
    primaryWeatherData && primaryWeatherData.daily.length > 0
      ? primaryWeatherData.daily.map((day) => day.date)
      : [todayDate];
  const selectedForecastDate =
    selectedForecastDateOverride &&
    availableForecastDates.includes(selectedForecastDateOverride)
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

  const primaryTideState = primaryTideSource
    ? tideStates[primaryTideSource.id]
    : undefined;
  const primaryMarineState = primaryMarineSource
    ? marineStates[primaryMarineSource.id]
    : undefined;
  const primaryAstronomyState = primaryAstronomySource
    ? astronomyStates[primaryAstronomySource.id]
    : undefined;

  const primaryTideData =
    primaryTideState?.status === "success"
      ? primaryTideState.data
      : null;
  const primaryMarineData =
    primaryMarineState?.status === "success"
      ? primaryMarineState.data
      : null;
  const primaryAstronomyData =
    primaryAstronomyState?.status === "success"
      ? primaryAstronomyState.data
      : null;

  const automaticMobileLayout = useMemo(() => {
    if (
      !dashboard ||
      dashboard.layouts.some((layout) => layout.device === "mobile")
    ) {
      return undefined;
    }

    return {
      ...createMobileLayoutFromDesktop(dashboard.widgets),
      id: "viewer-auto-mobile",
      name: "Mobile",
    };
  }, [dashboard]);

  const viewerLayouts = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    return automaticMobileLayout
      ? [...dashboard.layouts, automaticMobileLayout]
      : dashboard.layouts;
  }, [automaticMobileLayout, dashboard]);

  const activeLayout = dashboard
    ? preferMobile
      ? viewerLayouts.find((layout) => layout.device === "mobile") ??
        viewerLayouts[0]
      : viewerLayouts.find((layout) => layout.device === "desktop") ??
        viewerLayouts[0]
    : undefined;

  const shareConditionSummary = buildConditionSummary({
    weatherSource: primaryWeatherSource,
    weatherStates,
    sources,
    tideStates,
    marineStates,
  });

  function updateWidgetSettings(
    widgetId: string,
    settings: Record<string, unknown>,
  ) {
    setDashboard((current) =>
      current
        ? {
            ...current,
            widgets: current.widgets.map((widget) =>
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

  function openFishingReport() {
    setActionsOpen(false);
    setControlsHidden(false);
    setReportOpen(true);
  }

  async function openShareDialog() {
    if (!dashboard) {
      return;
    }

    setActionsOpen(false);
    setControlsHidden(false);
    setShareOpen(true);
    setSharePreparing(true);
    setShareError(undefined);

    try {
      let token: string;

      if (viewerSource.kind === "shared") {
        token = viewerSource.token;
      } else if (viewerSource.kind === "cloud") {
        const remembered = loadRememberedShareToken(
          `cloud:${viewerSource.id}`,
        );

        if (remembered) {
          const saved = await saveSharedDashboard({
            dashboard,
            existingShareToken: remembered,
          });
          token = saved.shareToken;
        } else {
          const saved = await saveSharedDashboard({ dashboard });
          token = saved.shareToken;
          rememberShareToken(`cloud:${viewerSource.id}`, token);
        }
      } else {
        const remembered = loadRememberedShareToken("local");

        if (remembered) {
          const saved = await saveSharedDashboard({
            dashboard,
            existingShareToken: remembered,
          });
          token = saved.shareToken;
        } else {
          const saved = await saveSharedDashboard({ dashboard });
          token = saved.shareToken;
          rememberShareToken("local", token);
        }
      }

      setShareUrl(
        `${window.location.origin}/view?share=${encodeURIComponent(token)}`,
      );
    } catch (caught) {
      setShareUrl(undefined);
      setShareError(
        caught instanceof Error
          ? caught.message
          : "Unable to prepare a shareable dashboard link.",
      );
    } finally {
      setSharePreparing(false);
    }
  }

  async function deleteCurrentDashboard() {
    if (viewerSource.kind !== "cloud") {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${dashboard?.name ?? "this dashboard"}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setActionMessage(undefined);

    try {
      await deleteCloudDashboard(viewerSource.id);
      window.location.assign("/dashboards");
    } catch (caught) {
      setDeleting(false);
      setActionsOpen(false);
      setActionMessage(
        caught instanceof Error
          ? caught.message
          : "Unable to delete the dashboard.",
      );
    }
  }

  const editHref = getEditHref(viewerSource);
  const sessionsHref = getSessionsHref(primaryWeatherSource);

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

  if (status === "error" || !dashboard || !activeLayout) {
    return (
      <ViewerMessage
        title="Dashboard unavailable"
        message={error ?? "This dashboard could not be loaded."}
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
      data-dashboard-controls-hidden={controlsHidden ? "true" : "false"}
      className="dashboard-theme min-h-screen text-[var(--foreground)]"
      data-theme={dashboard.theme}
      style={{
        backgroundColor:
          "var(--dashboard-background, var(--background))",
        backgroundImage: "var(--dashboard-pattern, none)",
        backgroundSize: "var(--dashboard-pattern-size, auto)",
        backgroundPosition: "center",
      }}
    >
      {actionsOpen ? (
        <button
          type="button"
          aria-label="Close dashboard actions"
          onClick={() => setActionsOpen(false)}
          className="fixed inset-0 z-[870] bg-transparent"
        />
      ) : null}

      <div
        className={[
          "fixed right-3 top-3 z-[900] flex items-center rounded-xl border border-[var(--border)] bg-white/95 shadow-md backdrop-blur transition duration-200",
          controlsHidden
            ? "-translate-y-16 opacity-0 pointer-events-none"
            : "translate-y-0 opacity-100",
        ].join(" ")}
      >
        <Link
          href={editHref}
          aria-label="Edit dashboard"
          title="Edit dashboard"
          className="flex h-10 w-11 items-center justify-center rounded-l-xl hover:bg-[var(--surface-muted)]"
        >
          <EditIcon />
        </Link>

        <div className="relative border-l border-[var(--border)]">
          <button
            type="button"
            aria-label="Dashboard actions"
            aria-expanded={actionsOpen}
            onClick={() => setActionsOpen((current) => !current)}
            className="flex h-10 w-11 items-center justify-center rounded-r-xl text-xl font-semibold tracking-[0.08em] hover:bg-[var(--surface-muted)]"
          >
            •••
          </button>

          {actionsOpen ? (
            <div className="absolute right-0 top-[calc(100%+8px)] w-64 overflow-hidden rounded-2xl border border-[var(--border)] bg-white p-1.5 text-[var(--foreground)] shadow-2xl">
              <ActionButton
                icon="↑"
                label="Share dashboard"
                detail="Preview the public link and share message"
                onClick={() => void openShareDialog()}
              />

              <ActionButton
                icon="▤"
                label="Generate fishing report"
                detail="Choose a date and optional hourly window"
                onClick={openFishingReport}
              />

              <ActionLink
                href={sessionsHref}
                icon="🎣"
                label="Sessions"
                detail="Start or review fishing sessions"
              />

              <ActionLink
                href="/sessions"
                icon="▧"
                label="Catch photos"
                detail="Photos are stored with your sessions"
              />

              <ActionLink
                href="/dashboards"
                icon="▦"
                label="My dashboards"
                detail="Open your saved dashboards"
              />

              {viewerSource.kind === "cloud" ? (
                <>
                  <div className="my-1 border-t border-[var(--border)]" />
                  <ActionButton
                    icon="⌫"
                    label={deleting ? "Deleting…" : "Delete dashboard"}
                    detail="Remove this saved dashboard"
                    danger
                    disabled={deleting}
                    onClick={() => void deleteCurrentDashboard()}
                  />
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {actionMessage ? (
        <div className="fixed bottom-4 left-1/2 z-[910] -translate-x-1/2 rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs shadow-lg">
          {actionMessage}
        </div>
      ) : null}

      <DashboardShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        preparing={sharePreparing}
        error={shareError}
        shareUrl={shareUrl}
        dashboardName={dashboard.name}
        locationLabel={primaryWeatherSource?.label}
        conditionSummary={shareConditionSummary}
      />

      <FishingReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        dashboardName={dashboard.name}
        locationLabel={primaryWeatherSource?.label}
        availableDates={availableForecastDates}
        selectedDate={selectedForecastDate}
        todayDate={todayDate}
        onDateChange={setSelectedForecastDateOverride}
        weatherData={primaryWeatherData}
        tideData={primaryTideData}
        marineData={primaryMarineData}
        astronomyData={primaryAstronomyData}
      />

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
        onForecastDateChange={setSelectedForecastDateOverride}
        onWidgetSettingsChange={updateWidgetSettings}
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
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{message}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </section>
    </main>
  );
}

function ActionLink({
  href,
  icon,
  label,
  detail,
}: {
  href: string;
  icon: string;
  label: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[var(--surface-muted)]"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-lg">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-[var(--muted)]">{detail}</span>
      </span>
    </Link>
  );
}

function ActionButton({
  icon,
  label,
  detail,
  onClick,
  danger = false,
  disabled = false,
}: {
  icon: string;
  label: string;
  detail: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left disabled:opacity-50",
        danger
          ? "text-red-700 hover:bg-red-50"
          : "hover:bg-[var(--surface-muted)]",
      ].join(" ")}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-lg">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span
          className={[
            "block text-xs",
            danger ? "text-red-500" : "text-[var(--muted)]",
          ].join(" ")}
        >
          {detail}
        </span>
      </span>
    </button>
  );
}

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function getEditHref(source: ViewerSource): string {
  if (source.kind === "cloud") {
    return `/build?dashboard=${encodeURIComponent(source.id)}`;
  }

  if (source.kind === "shared") {
    return `/build?share=${encodeURIComponent(source.token)}`;
  }

  return "/build";
}

function getSessionsHref(source?: DashboardSource): string {
  if (
    !source ||
    typeof source.latitude !== "number" ||
    typeof source.longitude !== "number"
  ) {
    return "/sessions";
  }

  return `/sessions?latitude=${encodeURIComponent(
    source.latitude,
  )}&longitude=${encodeURIComponent(
    source.longitude,
  )}&label=${encodeURIComponent(source.label)}`;
}

const VIEWER_SHARE_KEY_PREFIX = "fishing-forecast:viewer-share:";

function rememberShareToken(key: string, shareToken: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    `${VIEWER_SHARE_KEY_PREFIX}${key}`,
    shareToken,
  );

  if (key.startsWith("cloud:")) {
    window.localStorage.setItem(
      `fishing-forecast:cloud-share:${key.slice("cloud:".length)}`,
      shareToken,
    );
  }
}

function loadRememberedShareToken(key: string): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  if (key.startsWith("cloud:")) {
    const builderToken = window.localStorage.getItem(
      `fishing-forecast:cloud-share:${key.slice("cloud:".length)}`,
    );

    if (builderToken) {
      return builderToken;
    }
  }

  return (
    window.localStorage.getItem(`${VIEWER_SHARE_KEY_PREFIX}${key}`) ??
    undefined
  );
}

function buildConditionSummary({
  weatherSource,
  weatherStates,
  sources,
  tideStates,
  marineStates,
}: {
  weatherSource?: DashboardSource;
  weatherStates: ReturnType<typeof useWeatherSources>;
  sources: DashboardSource[];
  tideStates: ReturnType<typeof useTideSources>;
  marineStates: ReturnType<typeof useMarineSources>;
}): string | undefined {
  const parts: string[] = [];

  if (weatherSource) {
    const state = weatherStates[weatherSource.id];

    if (state?.status === "success") {
      const current = state.data.current;
      const temperature = Math.round(
        celsiusToFahrenheit(current.temperatureC),
      );
      const wind = Math.round(
        metersPerSecondToMph(current.windSpeedMps),
      );

      parts.push(`${temperature}°F ${current.condition}`);
      parts.push(`Wind ${current.windDirectionLabel} ${wind} mph`);
    }
  }

  const tideSource = sources.find(
    (source) => source.kind === "tide-station",
  );
  const tideState = tideSource
    ? tideStates[tideSource.id]
    : undefined;

  if (tideState?.status === "success") {
    const tide = tideState.data;
    const height =
      tide.currentHeightFt === null
        ? ""
        : ` ${tide.currentHeightFt.toFixed(1)} ft`;

    parts.push(`${titleCase(tide.currentTrend)} tide${height}`);
  }

  const marineSource = sources.find(
    (source) => source.kind === "marine-location",
  );
  const marineState = marineSource
    ? marineStates[marineSource.id]
    : undefined;

  if (
    marineState?.status === "success" &&
    marineState.data.current.seaSurfaceTemperatureC !== null
  ) {
    parts.push(
      `Water ${Math.round(
        celsiusToFahrenheit(
          marineState.data.current.seaSurfaceTemperatureC,
        ),
      )}°F`,
    );
  }

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function titleCase(value: string): string {
  if (!value) {
    return value;
  }

  return value[0].toUpperCase() + value.slice(1);
}

function dateKeyInTimezone(date: Date, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );

    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
