"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type {
  DashboardLayout,
  DashboardSource,
  DashboardThemeKey,
  FishingDashboard,
  LayoutDevice,
  WidgetInstance,
  WidgetPlacement,
} from "@/types/dashboard";
import type { WeatherLocationSelection } from "@/types/geocoding";
import type { TideStationOption } from "@/types/tide-stations";
import type { ForecastContext } from "@/types/forecast";
import { useWeatherSources } from "@/hooks/useWeatherSources";
import {
  useAstronomySources,
  useMarineSources,
  useRadarSources,
  useTideSources,
} from "@/hooks/useLiveSources";
import {
  addWidgetToLayout,
  applyPreset,
  autoArrangeLayout,
  createInitialDashboard,
  createLayoutFromPreset,
  createMobileLayoutFromDesktop,
  createWidgetInstance,
  getRecommendedPreset,
  layoutPresets,
  normalizePlacementsForLayout,
} from "@/lib/dashboard-layouts";
import type { WidgetDefinition } from "@/widgets/types";
import { formatForecastDateLabel } from "@/lib/forecast-selection";
import {
  BuilderToolbar,
  type BuilderPanel,
} from "@/components/builder/BuilderToolbar";
import {
  BuilderPreview,
  type PreviewZoom,
} from "@/components/builder/BuilderPreview";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { SaveOptionsDialog } from "@/components/auth/SaveOptionsDialog";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  hasPendingCloudSave,
  loadCloudDashboard,
  loadLocalDashboardDraft,
  loadSharedDashboard,
  saveCloudDashboard,
  saveLocalDashboardDraft,
  saveSharedDashboard,
  setPendingCloudSave,
} from "@/lib/dashboard-storage";

export function DashboardBuilder() {
  const [dashboard, setDashboard] =
    useState<FishingDashboard>(() =>
      createInitialDashboard(),
    );
  const [activeLayoutId, setActiveLayoutId] =
    useState(dashboard.layouts[0].id);
  const [panel, setPanel] =
    useState<BuilderPanel>("layouts");
  const [selectedWidgetId, setSelectedWidgetId] =
    useState<string>();
  const [mode, setMode] =
    useState<"edit" | "view">("edit");
  const [zoom, setZoom] =
    useState<PreviewZoom>("fit");
  const [showGrid, setShowGrid] = useState(true);
  const [selectedForecastDateOverride, setSelectedForecastDateOverride] =
    useState<string>();
  const { user, loading: authLoading } =
    useAuth();
  const [authOpen, setAuthOpen] =
    useState(false);
  const [
    saveOptionsMode,
    setSaveOptionsMode,
  ] = useState<
    "guest" | "url-only" | null
  >(null);
  const [sharedDashboardToken, setSharedDashboardToken] =
    useState<string>();
  const [sharedUrl, setSharedUrl] =
    useState<string>();
  const [sharedExpiresAt, setSharedExpiresAt] =
    useState<string>();
  const [sharedSaveError, setSharedSaveError] =
    useState<string>();
  const [savingSharedUrl, setSavingSharedUrl] =
    useState(false);
  const [cloudDashboardId, setCloudDashboardId] =
    useState<string>();
  const [saveState, setSaveState] =
    useState<
      "idle" | "saving" | "saved" | "error"
    >("idle");
  const [saveMessage, setSaveMessage] =
    useState<string>();
  const [draftReady, setDraftReady] =
    useState(false);
  const cloudLoadAttempted =
    useRef<string | undefined>(undefined);
  const sharedLoadAttempted =
    useRef<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search,
      );
    const cloudId =
      params.get("dashboard");
    const shareToken =
      params.get("share");

    if (shareToken) {
      setSharedDashboardToken(
        shareToken,
      );
    }

    if (!cloudId && !shareToken) {
      const localDraft =
        loadLocalDashboardDraft();

      if (localDraft) {
        setDashboard(localDraft);
        setActiveLayoutId(
          localDraft.layouts[0]?.id ??
            dashboard.layouts[0].id,
        );
      }
    }

    setDraftReady(true);
    // The initial dashboard is intentionally used
    // only as a fallback for the first local restore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!draftReady) {
      return;
    }

    saveLocalDashboardDraft(dashboard);

    if (saveState === "saved") {
      setSaveState("idle");
    }
  }, [dashboard, draftReady, saveState]);

  useEffect(() => {
    if (
      !draftReady ||
      typeof window === "undefined"
    ) {
      return;
    }

    const shareToken =
      new URLSearchParams(
        window.location.search,
      ).get("share");

    if (
      !shareToken ||
      sharedLoadAttempted.current ===
        shareToken
    ) {
      return;
    }

    sharedLoadAttempted.current =
      shareToken;
    setSaveState("saving");
    setSaveMessage(
      "Loading saved URL…",
    );

    void loadSharedDashboard(shareToken)
      .then(
        ({
          dashboard: savedDashboard,
          expiresAt,
        }) => {
          setDashboard(savedDashboard);
          setActiveLayoutId(
            savedDashboard.layouts[0]?.id ??
              savedDashboard.id,
          );
          setSharedDashboardToken(
            shareToken,
          );
          setSharedExpiresAt(
            expiresAt,
          );
          setCloudDashboardId(
            undefined,
          );
          setSelectedWidgetId(
            undefined,
          );
          setSaveState("saved");
          setSaveMessage(
            "Loaded from saved URL. Its 90-day timer was renewed.",
          );
        },
      )
      .catch((caught: unknown) => {
        setSaveState("error");
        setSaveMessage(
          caught instanceof Error
            ? caught.message
            : "Unable to load this saved URL.",
        );
      });
  }, [draftReady]);

  useEffect(() => {
    if (
      authLoading ||
      !user ||
      typeof window === "undefined"
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search,
      );
    const cloudId =
      params.get("dashboard");
    const shareToken =
      params.get("share");

    if (shareToken) {
      return;
    }

    const ignoredCloudId = cloudId;

    if (
      !ignoredCloudId ||
      cloudLoadAttempted.current ===
        ignoredCloudId
    ) {
      return;
    }

    cloudLoadAttempted.current =
      ignoredCloudId;
    setSaveState("saving");
    setSaveMessage("Loading saved dashboard…");

    void loadCloudDashboard(
      ignoredCloudId,
    )
      .then((savedDashboard) => {
        setDashboard(savedDashboard);
        setActiveLayoutId(
          savedDashboard.layouts[0]?.id ??
            savedDashboard.id,
        );
        setCloudDashboardId(
          ignoredCloudId,
        );
        setSelectedWidgetId(undefined);
        setSaveState("saved");
        setSaveMessage("Loaded from your account.");
      })
      .catch((caught: unknown) => {
        setSaveState("error");
        setSaveMessage(
          caught instanceof Error
            ? caught.message
            : "Unable to load this dashboard.",
        );
      });
  }, [authLoading, user]);

  useEffect(() => {
    if (
      authLoading ||
      !user ||
      !draftReady ||
      !hasPendingCloudSave()
    ) {
      return;
    }

    void saveCurrentDashboard(user);
    // saveCurrentDashboard intentionally reads
    // the latest dashboard state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, draftReady, user]);

  const weatherStates = useWeatherSources(
    dashboard.sources,
  );
  const tideStates = useTideSources(
    dashboard.sources,
  );
  const marineStates = useMarineSources(
    dashboard.sources,
  );

  const primaryWeatherSource =
    dashboard.sources.find(
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
    dashboard.sources,
    selectedForecastDate,
  );
  const radarStates = useRadarSources(
    dashboard.sources,
  );

  const activeLayout =
    dashboard.layouts.find(
      (layout) => layout.id === activeLayoutId,
    ) ?? dashboard.layouts[0];

  const selectedWidget = dashboard.widgets.find(
    (widget) => widget.id === selectedWidgetId,
  );

  const selectedPlacement =
    activeLayout?.placements.find(
      (placement) =>
        placement.widgetId === selectedWidgetId,
    );

  function updateDashboardName(name: string) {
    setDashboard((current) => ({
      ...current,
      name,
    }));
  }

  function updateDashboardTheme(
    theme: DashboardThemeKey,
  ) {
    setDashboard((current) => ({
      ...current,
      theme,
    }));
  }

  function updateWidgetSettings(
    widgetId: string,
    settings: Record<string, unknown>,
  ) {
    setDashboard((current) => ({
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
    }));
  }

  function selectWidget(widgetId: string) {
    setSelectedWidgetId(widgetId || undefined);
    if (widgetId) {
      setPanel("selected");
    }
  }

  function updateActiveLayout(
    updater: (
      layout: DashboardLayout,
    ) => DashboardLayout,
  ) {
    setDashboard((current) => ({
      ...current,
      layouts: current.layouts.map((layout) =>
        layout.id === activeLayout.id
          ? updater(layout)
          : layout,
      ),
    }));
  }

  function updatePlacements(
    placements: WidgetPlacement[],
  ) {
    updateActiveLayout((layout) => ({
      ...layout,
      placements,
    }));
  }

  function updateLayout(
    updates: Partial<DashboardLayout>,
  ) {
    updateActiveLayout((layout) => {
      const next = {
        ...layout,
        ...updates,
      };
      return {
        ...next,
        placements: normalizePlacementsForLayout(
          next,
          layout.placements,
        ),
      };
    });
  }

  function applyLayoutPreset(presetKey: string) {
    const preset = layoutPresets.find(
      (item) => item.key === presetKey,
    );
    if (!preset) {
      return;
    }
    updateActiveLayout((layout) =>
      applyPreset(layout, preset),
    );
  }

  function createLayout(device: LayoutDevice) {
    if (
      dashboard.layouts.some(
        (layout) => layout.device === device,
      )
    ) {
      return;
    }

    const layout =
      device === "mobile"
        ? createMobileLayoutFromDesktop(
            dashboard.widgets,
          )
        : createLayoutFromPreset(
            getRecommendedPreset(device),
            dashboard.widgets,
          );

    setDashboard((current) => ({
      ...current,
      layouts: [...current.layouts, layout],
    }));
    setActiveLayoutId(layout.id);
    setPanel("layouts");
    setZoom("fit");
  }

  function deleteLayout(layoutId: string) {
    const remaining = dashboard.layouts.filter(
      (layout) => layout.id !== layoutId,
    );
    if (remaining.length === 0) {
      return;
    }

    setDashboard((current) => ({
      ...current,
      layouts: current.layouts.filter(
        (layout) => layout.id !== layoutId,
      ),
    }));
    setActiveLayoutId(remaining[0].id);
    setSelectedWidgetId(undefined);
  }

  function resetLayout() {
    updateActiveLayout((layout) =>
      autoArrangeLayout(layout, dashboard.widgets),
    );
  }

  function addWidget(definition: WidgetDefinition) {
    const widget = createWidgetInstance(
      definition.key,
      dashboard.widgets.length,
    );

    setDashboard((current) => ({
      ...current,
      widgets: [...current.widgets, widget],
      layouts: current.layouts.map((layout) =>
        addWidgetToLayout(layout, widget),
      ),
    }));
    setSelectedWidgetId(widget.id);
    setPanel("selected");
  }

  function updateSelectedWidget(
    updates: Partial<WidgetInstance>,
  ) {
    if (!selectedWidgetId) {
      return;
    }

    setDashboard((current) => ({
      ...current,
      widgets: current.widgets.map((widget) =>
        widget.id === selectedWidgetId
          ? { ...widget, ...updates }
          : widget,
      ),
    }));
  }

  function updateSelectedPlacement(
    updates: Partial<WidgetPlacement>,
  ) {
    if (!selectedWidgetId) {
      return;
    }

    updateActiveLayout((layout) => ({
      ...layout,
      placements: layout.placements.map(
        (placement) =>
          placement.widgetId === selectedWidgetId
            ? { ...placement, ...updates }
            : placement,
      ),
    }));
  }

  function duplicateSelectedWidget() {
    if (!selectedWidget) {
      return;
    }

    const duplicate: WidgetInstance = {
      ...selectedWidget,
      id: `${selectedWidget.widgetKey}-${Date.now()}`,
      title: `${selectedWidget.title} Copy`,
      settings: { ...selectedWidget.settings },
    };

    setDashboard((current) => ({
      ...current,
      widgets: [...current.widgets, duplicate],
      layouts: current.layouts.map((layout) =>
        addWidgetToLayout(layout, duplicate),
      ),
    }));
    setSelectedWidgetId(duplicate.id);
  }

  function removeSelectedWidget() {
    if (!selectedWidgetId) {
      return;
    }

    setDashboard((current) => ({
      ...current,
      widgets: current.widgets.filter(
        (widget) => widget.id !== selectedWidgetId,
      ),
      layouts: current.layouts.map((layout) => ({
        ...layout,
        placements: layout.placements.filter(
          (placement) =>
            placement.widgetId !== selectedWidgetId,
        ),
      })),
    }));
    setSelectedWidgetId(undefined);
    setPanel("widgets");
  }


  function addTideSource(
    station: TideStationOption,
  ) {
    setDashboard((current) => {
      const alreadyExists =
        current.sources.some(
          (source) =>
            source.kind === "tide-station" &&
            source.externalId === station.id,
        );

      if (alreadyExists) {
        return current;
      }

      const weatherSource =
        current.sources.find(
          (source) =>
            source.kind ===
            "weather-location",
        );

      const source: DashboardSource = {
        id: `tide-${station.id}-${createId()}`,
        kind: "tide-station",
        providerKey: "noaa-coops",
        label: station.label,
        latitude: station.latitude,
        longitude: station.longitude,
        timezone:
          weatherSource?.timezone ??
          "America/New_York",
        externalId: station.id,
        settings: {
          datum: "MLLW",
          units: "english",
          distanceMiles:
            station.distanceMiles,
          tideType: station.tideType,
          supportsDetailedPredictions:
            station.supportsDetailedPredictions,
        },
      };

      return {
        ...current,
        sources: [
          ...current.sources,
          source,
        ],
      };
    });
  }

  function removeSource(sourceId: string) {
    setDashboard((current) => {
      const isUsed = current.widgets.some(
        (widget) =>
          widget.sourceId === sourceId,
      );

      if (isUsed) {
        return current;
      }

      return {
        ...current,
        sources: current.sources.filter(
          (source) =>
            source.id !== sourceId,
        ),
      };
    });
  }

  function updateWeatherLocation(
    location: WeatherLocationSelection,
  ) {
    setSelectedForecastDateOverride(undefined);
    setDashboard((current) => ({
      ...current,
      sources: current.sources.map((source) =>
        source.kind === "weather-location"
          ? {
              ...source,
              label: location.label,
              latitude: location.latitude,
              longitude: location.longitude,
              timezone: location.timezone,
            }
          : source,
      ),
    }));
  }


  async function saveCurrentDashboard(
    authenticatedUser = user,
  ) {
    if (!authenticatedUser) {
      setPendingCloudSave(true);
      setAuthOpen(true);
      return;
    }

    setSaveState("saving");
    setSaveMessage("Saving dashboard…");

    try {
      const saved =
        await saveCloudDashboard({
          dashboard,
          user: authenticatedUser,
          cloudId: cloudDashboardId,
        });

      setCloudDashboardId(saved.id);
      setPendingCloudSave(false);
      setSaveState("saved");
      setSaveMessage("Saved to your account.");

      if (typeof window !== "undefined") {
        const url = new URL(
          window.location.href,
        );
        url.searchParams.set(
          "dashboard",
          saved.id,
        );
        url.searchParams.delete(
          "share",
        );
        setSharedDashboardToken(
          undefined,
        );
        window.history.replaceState(
          {},
          "",
          url,
        );
      }
    } catch (caught) {
      setSaveState("error");
      setSaveMessage(
        caught instanceof Error
          ? caught.message
          : "Unable to save dashboard.",
      );
    }
  }

  function handleSave() {
    /*
     * Signed-in users save their account dashboard with the
     * primary Save button. Public URL publishing remains a
     * separate action so the cloud copy cannot accidentally
     * diverge from the user's account save flow.
     */
    if (user) {
      void saveCurrentDashboard(user);
      return;
    }

    const existingShareToken =
      getCurrentShareToken(
        sharedDashboardToken,
      );

    if (existingShareToken) {
      void handleSaveToUrl(
        existingShareToken,
      );
      return;
    }

    setSharedUrl(undefined);
    setSharedSaveError(undefined);
    setSaveOptionsMode("guest");
  }

  function handleAccountSaveFromOptions() {
    setSaveOptionsMode(null);
    setPendingCloudSave(true);
    setAuthOpen(true);
  }

  function handleOpenUrlSave() {
    const currentShareToken =
      getCurrentShareToken(
        sharedDashboardToken,
      );
    const rememberedShareToken =
      cloudDashboardId
        ? loadRememberedCloudShareToken(
            cloudDashboardId,
          )
        : undefined;
    const existingShareToken =
      currentShareToken ??
      rememberedShareToken;

    if (existingShareToken) {
      setSharedDashboardToken(
        existingShareToken,
      );
      void handleSaveToUrl(
        existingShareToken,
      );
      return;
    }

    setSharedUrl(undefined);
    setSharedSaveError(undefined);
    setSaveOptionsMode("url-only");
  }

  async function handleSaveToUrl(
    shareTokenOverride?: string,
  ) {
    const existingShareToken =
      shareTokenOverride ??
      getCurrentShareToken(
        sharedDashboardToken,
      );

    setSavingSharedUrl(true);
    setSharedSaveError(undefined);
    setSaveState("saving");
    setSaveMessage(
      existingShareToken
        ? "Updating saved URL…"
        : "Saving dashboard to URL…",
    );

    try {
      /*
       * An existing shared URL is update-only. The edit
       * token is intentionally browser-local; if it is gone,
       * do not let saveSharedDashboard silently mint a
       * replacement URL.
       */
      if (
        existingShareToken &&
        !hasSharedEditToken(
          existingShareToken,
        )
      ) {
        throw new Error(
          "This browser no longer has permission to update the existing saved URL. A new URL was not created.",
        );
      }

      const saved =
        await saveSharedDashboard({
          dashboard,
          existingShareToken,
        });

      if (
        existingShareToken &&
        !saved.updatedExisting
      ) {
        throw new Error(
          "The existing saved URL could not be updated. A replacement URL will not be used automatically.",
        );
      }

      const editorUrl =
        new URL(window.location.href);
      editorUrl.pathname = "/build";
      editorUrl.searchParams.delete(
        "dashboard",
      );
      editorUrl.searchParams.set(
        "share",
        saved.shareToken,
      );

      const viewUrl = new URL(editorUrl);
      viewUrl.pathname = "/view";
      const shareUrl =
        viewUrl.toString();

      setSharedDashboardToken(
        saved.shareToken,
      );
      setSharedUrl(shareUrl);
      setSharedExpiresAt(
        saved.expiresAt,
      );

      if (cloudDashboardId) {
        rememberCloudShareToken(
          cloudDashboardId,
          saved.shareToken,
        );
      }
      setSaveState("saved");
      setSaveMessage(
        saved.updatedExisting
          ? "Saved URL updated. Its 90-day timer was renewed."
          : "Saved to an anonymous URL.",
      );

      /*
       * For guests, make the anonymous URL the current editor URL so
       * refresh/reopen keeps the saved dashboard. Signed-in users keep
       * their account-dashboard URL and receive a separate share link.
       */
      if (!user) {
        window.history.replaceState(
          {},
          "",
          editorUrl,
        );
      }
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Unable to save this dashboard to a URL.";

      setSharedSaveError(message);
      setSaveState("error");
      setSaveMessage(message);
    } finally {
      setSavingSharedUrl(false);
    }
  }

  if (!activeLayout) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] bg-white px-5 py-3">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/"
            className="shrink-0 text-sm font-medium text-[var(--accent)]"
          >
            Fishing Forecast
          </Link>
          <input
            aria-label="Dashboard name"
            value={dashboard.name}
            onChange={(event) =>
              updateDashboardName(event.target.value)
            }
            className="min-w-0 max-w-sm rounded-xl border border-transparent bg-[var(--surface-muted)] px-3 py-2 font-medium focus:border-[var(--accent)] focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm">
            <span className="text-[var(--muted)]">
              Forecast date
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
              {availableForecastDates.map((date) => (
                <option key={date} value={date}>
                  {formatForecastDateLabel({
                    date,
                    todayDate,
                  })}
                </option>
              ))}
            </select>
          </label>

          {dashboard.layouts.map((layout) => (
            <button
              key={layout.id}
              type="button"
              onClick={() => {
                setActiveLayoutId(layout.id);
                setSelectedWidgetId(undefined);
                setZoom("fit");
              }}
              className={[
                "rounded-xl px-3 py-2 text-sm",
                layout.id === activeLayout.id
                  ? "bg-[var(--selection)] font-medium text-[var(--accent)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-muted)]",
              ].join(" ")}
            >
              {layout.name}
            </button>
          ))}
          <Link
            href="/view"
            className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
          >
            View dashboard
          </Link>

          <button
            type="button"
            onClick={handleSave}
            disabled={saveState === "saving"}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saveState === "saving"
              ? "Saving..."
              : saveState === "saved"
                ? "Saved"
                : "Save"}
          </button>

          <button
            type="button"
            onClick={handleOpenUrlSave}
            className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
          >
            Save URL
          </button>

          <AccountMenu />
        </div>
      </header>

      {saveMessage ? (
        <div
          className={[
            "border-b px-5 py-2 text-center text-xs",
            saveState === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]",
          ].join(" ")}
          role="status"
        >
          {saveMessage}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col lg:h-[calc(100vh-65px)] lg:flex-row">
        <BuilderToolbar
          panel={panel}
          onPanelChange={setPanel}
          layouts={dashboard.layouts}
          activeLayout={activeLayout}
          theme={dashboard.theme}
          widgets={dashboard.widgets}
          sources={dashboard.sources}
          weatherStates={weatherStates}
          tideStates={tideStates}
          marineStates={marineStates}
          astronomyStates={astronomyStates}
          radarStates={radarStates}
          selectedWidget={selectedWidget}
          selectedPlacement={selectedPlacement}
          onSelectLayout={(layoutId) => {
            setActiveLayoutId(layoutId);
            setSelectedWidgetId(undefined);
            setZoom("fit");
          }}
          onCreateLayout={createLayout}
          onDeleteLayout={deleteLayout}
          onApplyLayoutPreset={applyLayoutPreset}
          onUpdateLayout={updateLayout}
          onResetLayout={resetLayout}
          onThemeChange={updateDashboardTheme}
          onAddWidget={addWidget}
          onWeatherLocationChange={
            updateWeatherLocation
          }
          onAddTideSource={addTideSource}
          onRemoveSource={removeSource}
          onUpdateWidget={updateSelectedWidget}
          onUpdatePlacement={
            updateSelectedPlacement
          }
          onDuplicateWidget={
            duplicateSelectedWidget
          }
          onRemoveWidget={removeSelectedWidget}
        />

        <BuilderPreview
          layout={activeLayout}
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
            setSelectedForecastDateOverride
          }
          onWidgetSettingsChange={
            updateWidgetSettings
          }
          mode={mode}
          zoom={zoom}
          showGrid={showGrid}
          selectedWidgetId={selectedWidgetId}
          onModeChange={setMode}
          onZoomChange={setZoom}
          onShowGridChange={setShowGrid}
          onSelectWidget={selectWidget}
          onPlacementsChange={updatePlacements}
        />
      </div>

      <SaveOptionsDialog
        open={saveOptionsMode !== null}
        mode={saveOptionsMode ?? "guest"}
        savingUrl={savingSharedUrl}
        sharedUrl={sharedUrl}
        expiresAt={sharedExpiresAt}
        error={sharedSaveError}
        onClose={() =>
          setSaveOptionsMode(null)
        }
        onSaveToAccount={
          handleAccountSaveFromOptions
        }
        onSaveToUrl={() =>
          void handleSaveToUrl()
        }
      />

      <AuthDialog
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode="signup"
        intent="Save your dashboard"
      />
    </main>
  );
}

function createId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    "randomUUID" in globalThis.crypto
  ) {
    return globalThis.crypto
      .randomUUID()
      .slice(0, 8);
  }

  return Math.random()
    .toString(16)
    .slice(2, 10);
}


const CLOUD_SHARE_KEY_PREFIX =
  "fishing-forecast:cloud-share:";
const SHARED_EDIT_KEY_PREFIX =
  "fishing-forecast:shared-edit:";

function getCurrentShareToken(
  stateToken?: string,
): string | undefined {
  if (stateToken) {
    return stateToken;
  }

  if (typeof window === "undefined") {
    return undefined;
  }

  return (
    new URLSearchParams(
      window.location.search,
    ).get("share") ?? undefined
  );
}

function hasSharedEditToken(
  shareToken: string,
): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(
    window.localStorage.getItem(
      `${SHARED_EDIT_KEY_PREFIX}${shareToken}`,
    ),
  );
}

function rememberCloudShareToken(
  cloudDashboardId: string,
  shareToken: string,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    `${CLOUD_SHARE_KEY_PREFIX}${cloudDashboardId}`,
    shareToken,
  );
}

function loadRememberedCloudShareToken(
  cloudDashboardId: string,
): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return (
    window.localStorage.getItem(
      `${CLOUD_SHARE_KEY_PREFIX}${cloudDashboardId}`,
    ) ?? undefined
  );
}


function dateKeyInTimezone(
  date: Date,
  timezone: string,
): string {
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
