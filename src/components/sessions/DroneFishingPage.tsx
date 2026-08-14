"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useParams,
} from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { DroneDropMap } from "@/components/sessions/DroneDropMap";
import {
  createDroneFishingDrop,
  listDroneFishingDrops,
  loadFishingSession,
  updateDroneFishingDrop,
} from "@/lib/session-storage";
import {
  collectSessionConditions,
} from "@/lib/session-conditions";
import type {
  DroneFishingDrop,
  FishingSessionDetail,
  SessionConditionSnapshot,
} from "@/types/sessions";

type Point = {
  latitude: number;
  longitude: number;
};

const BETA_KEY =
  "fishing-forecast-drone-beta-v1";

export function DroneFishingPage() {
  const params = useParams<{
    id: string;
  }>();
  const sessionId =
    Array.isArray(params.id)
      ? params.id[0]
      : params.id;

  const {
    user,
    loading: authLoading,
  } = useAuth();

  const [session, setSession] =
    useState<FishingSessionDetail>();
  const [drops, setDrops] =
    useState<DroneFishingDrop[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string>();
  const [authOpen, setAuthOpen] =
    useState(false);

  const [betaAccepted, setBetaAccepted] =
    useState<boolean | null>(null);

  const [userLocation, setUserLocation] =
    useState<Point>();
  const [locationStatus, setLocationStatus] =
    useState("Waiting for GPS permission…");
  const [
    selectedLocation,
    setSelectedLocation,
  ] = useState<Point>();
  const [liveConditions, setLiveConditions] =
    useState<SessionConditionSnapshot>();
  const [
    conditionsLoading,
    setConditionsLoading,
  ] = useState(false);

  const [rodLabel, setRodLabel] =
    useState("Rod 1");
  const [bait, setBait] =
    useState("");
  const [sinkerOz, setSinkerOz] =
    useState("");
  const [estimatedDepthFt, setEstimatedDepthFt] =
    useState("");
  const [notes, setNotes] =
    useState("");
  const [saving, setSaving] =
    useState(false);
  const [status, setStatus] =
    useState<string>();

  const [now, setNow] =
    useState(() => Date.now());

  useEffect(() => {
    const timer =
      window.setInterval(
        () => setNow(Date.now()),
        30000,
      );

    return () =>
      window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      setBetaAccepted(
        window.localStorage.getItem(
          BETA_KEY,
        ) === "accepted",
      );
    } catch {
      setBetaAccepted(false);
    }
  }, []);

  const refresh = useCallback(
    async () => {
      if (!user || !sessionId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(undefined);

      try {
        const [
          loadedSession,
          loadedDrops,
        ] = await Promise.all([
          loadFishingSession(
            sessionId,
          ),
          listDroneFishingDrops(
            sessionId,
          ),
        ]);

        setSession(loadedSession);
        setDrops(loadedDrops);

        if (!userLocation) {
          setUserLocation({
            latitude:
              loadedSession.latitude,
            longitude:
              loadedSession.longitude,
          });
        }

        if (!liveConditions) {
          setLiveConditions(
            loadedSession.startingConditions,
          );
        }
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load Drone Fishing.",
        );
      } finally {
        setLoading(false);
      }
    },
    [
      liveConditions,
      sessionId,
      user,
      userLocation,
    ],
  );

  useEffect(() => {
    if (!authLoading) {
      void refresh();
    }
  }, [
    authLoading,
    refresh,
  ]);

  useEffect(() => {
    if (
      authLoading ||
      !user ||
      !sessionId ||
      betaAccepted !== true
    ) {
      return;
    }

    void requestGps();
    // Request once after the Beta warning is accepted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    authLoading,
    betaAccepted,
    sessionId,
    user,
  ]);

  const nextDropNumber =
    useMemo(() => {
      const sameRod =
        drops.filter(
          (drop) =>
            drop.rodLabel === rodLabel,
        );

      return (
        sameRod.reduce(
          (maximum, drop) =>
            Math.max(
              maximum,
              drop.dropNumber,
            ),
          0,
        ) + 1
      );
    }, [
      drops,
      rodLabel,
    ]);

  const selectedGeometry =
    userLocation &&
    selectedLocation
      ? calculateDropGeometry(
          userLocation,
          selectedLocation,
        )
      : null;

  async function requestGps() {
    setLocationStatus(
      "Getting your current location…",
    );

    try {
      const location =
        await getDeviceLocation();

      const next = {
        latitude:
          location.latitude,
        longitude:
          location.longitude,
      };

      setUserLocation(next);
      setLocationStatus(
        `GPS accuracy ±${Math.round(
          location.accuracy,
        )} m`,
      );

      setConditionsLoading(true);

      try {
        setLiveConditions(
          await collectSessionConditions({
            latitude:
              next.latitude,
            longitude:
              next.longitude,
          }),
        );
      } catch {
        // Keep the session-start snapshot.
      } finally {
        setConditionsLoading(false);
      }
    } catch {
      setLocationStatus(
        "GPS unavailable. Using the session start point.",
      );
    }
  }

  async function refreshConditions() {
    if (!userLocation) {
      return;
    }

    setConditionsLoading(true);

    try {
      setLiveConditions(
        await collectSessionConditions({
          latitude:
            userLocation.latitude,
          longitude:
            userLocation.longitude,
        }),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to refresh conditions.",
      );
    } finally {
      setConditionsLoading(false);
    }
  }

  async function saveDrop() {
    if (
      !user ||
      !session ||
      !userLocation ||
      !selectedLocation ||
      !selectedGeometry
    ) {
      setError(
        "Tap the map to choose a drop point first.",
      );
      return;
    }

    setSaving(true);
    setError(undefined);
    setStatus(
      "Capturing conditions at the drop…",
    );

    try {
      const droppedAt =
        new Date().toISOString();

      const conditions =
        await collectSessionConditions({
          latitude:
            selectedLocation.latitude,
          longitude:
            selectedLocation.longitude,
          eventTime: droppedAt,
        });

      await createDroneFishingDrop({
        user,
        sessionId:
          session.id,
        draft: {
          rodLabel,
          dropNumber:
            nextDropNumber,
          droppedAt,
          originLatitude:
            userLocation.latitude,
          originLongitude:
            userLocation.longitude,
          latitude:
            selectedLocation.latitude,
          longitude:
            selectedLocation.longitude,
          distanceYards:
            selectedGeometry.distanceYards,
          bearingDegrees:
            selectedGeometry.bearingDegrees,
          bait:
            bait.trim() ||
            undefined,
          sinkerOz:
            parsePositiveNumber(
              sinkerOz,
            ),
          estimatedDepthFt:
            parsePositiveNumber(
              estimatedDepthFt,
            ),
          conditions,
          notes:
            notes.trim() ||
            undefined,
        },
      });

      setLiveConditions(conditions);
      setStatus(
        `${rodLabel} drop ${nextDropNumber} saved.`,
      );
      setSelectedLocation(undefined);
      setNotes("");
      await refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to save this drop.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function markDrop(
    drop: DroneFishingDrop,
    action:
      | "bite"
      | "fish"
      | "retrieve",
  ) {
    setError(undefined);

    try {
      const eventTime =
        new Date().toISOString();

      if (action === "bite") {
        await updateDroneFishingDrop(
          drop.id,
          {
            biteAt:
              drop.biteAt
                ? null
                : eventTime,
          },
        );
      }

      if (action === "fish") {
        await updateDroneFishingDrop(
          drop.id,
          {
            caughtFishAt:
              drop.caughtFishAt
                ? null
                : eventTime,
          },
        );
      }

      if (action === "retrieve") {
        await updateDroneFishingDrop(
          drop.id,
          {
            retrievedAt:
              drop.retrievedAt
                ? null
                : eventTime,
          },
        );
      }

      await refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update this drop.",
      );
    }
  }

  function acceptBeta() {
    try {
      window.localStorage.setItem(
        BETA_KEY,
        "accepted",
      );
    } catch {
      // Continue even if storage is disabled.
    }

    setBetaAccepted(true);
  }

  if (
    authLoading ||
    loading ||
    betaAccepted === null
  ) {
    return (
      <PageShell
        sessionId={sessionId}
      >
        <StatusCard>
          Loading Drone Fishing beta…
        </StatusCard>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell
        sessionId={sessionId}
      >
        <section className="rounded-2xl border border-[var(--border)] bg-white p-6 text-center">
          <h1 className="text-xl font-semibold">
            Sign in to use Drone Fishing
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Drone drop history is private to your account.
          </p>
          <button
            type="button"
            onClick={() =>
              setAuthOpen(true)
            }
            className="mt-5 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
          >
            Sign in
          </button>

          <AuthDialog
            open={authOpen}
            onClose={() =>
              setAuthOpen(false)
            }
            initialMode="signin"
            intent="Drone Fishing"
          />
        </section>
      </PageShell>
    );
  }

  if (!session) {
    return (
      <PageShell
        sessionId={sessionId}
      >
        <StatusCard error>
          {error ??
            "Session not found."}
        </StatusCard>
      </PageShell>
    );
  }

  const mapLocation =
    userLocation ?? {
      latitude:
        session.latitude,
      longitude:
        session.longitude,
    };

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link
            href={`/sessions/${session.id}`}
            className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium"
          >
            ‹ Session
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-semibold">
                Drone Fishing
              </h1>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                Beta
              </span>
            </div>
            <p className="truncate text-xs text-[var(--muted)]">
              {session.locationName ||
                "Fishing session"}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void requestGps()
            }
            className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-medium"
          >
            GPS
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-4 p-4 sm:p-6">
        <BetaNotice />

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {status ? (
          <div className="rounded-2xl border border-[var(--border)] bg-white p-3 text-sm text-[var(--muted)]">
            {status}
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,.75fr)]">
          <div className="grid gap-3">
            <DroneDropMap
              userLocation={mapLocation}
              selectedLocation={
                selectedLocation
              }
              drops={drops}
              windFromDegrees={
                liveConditions
                  ?.weather
                  ?.windDirectionDegrees
              }
              onSelect={
                setSelectedLocation
              }
            />

            <p className="text-xs text-[var(--muted)]">
              Tap the map to place the next drop. Existing drops stay on the map so you can compare Rod 1, Rod 2, and previous attempts.
            </p>
          </div>

          <div className="grid content-start gap-4">
            <ConditionsPanel
              conditions={
                liveConditions ??
                session.startingConditions
              }
              loading={
                conditionsLoading
              }
              onRefresh={() =>
                void refreshConditions()
              }
            />

            <section className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">
                    New drop
                  </h2>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {locationStatus}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-medium">
                  {rodLabel} · #{nextDropNumber}
                </span>
              </div>

              {!selectedLocation ||
              !selectedGeometry ? (
                <div className="mt-4 rounded-xl border border-dashed border-[var(--border)] p-5 text-center text-sm text-[var(--muted)]">
                  Tap a point on the map to choose your drop.
                </div>
              ) : (
                <div className="mt-4 grid gap-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Stat
                      label="Distance"
                      value={
                        selectedGeometry.distanceYards >=
                        1760
                          ? `${(
                              selectedGeometry.distanceYards /
                              1760
                            ).toFixed(2)} mi`
                          : `${Math.round(
                              selectedGeometry.distanceYards,
                            )} yd`
                      }
                    />
                    <Stat
                      label="Bearing"
                      value={`${Math.round(
                        selectedGeometry.bearingDegrees,
                      )}° ${compassDirection(
                        selectedGeometry.bearingDegrees,
                      )}`}
                    />
                  </div>

                  <div className="rounded-xl bg-[var(--surface-muted)] p-3">
                    <p className="text-xs text-[var(--muted)]">
                      Drop coordinates
                    </p>
                    <p className="mt-1 break-all font-mono text-sm font-semibold">
                      {selectedLocation.latitude.toFixed(
                        6,
                      )}
                      ,{" "}
                      {selectedLocation.longitude.toFixed(
                        6,
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        void copyCoordinates(
                          selectedLocation,
                        ).then(() =>
                          setStatus(
                            "Coordinates copied.",
                          ),
                        )
                      }
                      className="mt-2 text-xs font-medium text-[var(--accent)]"
                    >
                      Copy coordinates
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-sm">
                      <span className="font-medium">
                        Rod
                      </span>
                      <select
                        value={rodLabel}
                        onChange={(event) =>
                          setRodLabel(
                            event.target.value,
                          )
                        }
                        className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5"
                      >
                        <option>Rod 1</option>
                        <option>Rod 2</option>
                        <option>Rod 3</option>
                        <option>Rod 4</option>
                      </select>
                    </label>

                    <label className="text-sm">
                      <span className="font-medium">
                        Weight
                      </span>
                      <div className="relative mt-1.5">
                        <input
                          inputMode="decimal"
                          value={sinkerOz}
                          onChange={(event) =>
                            setSinkerOz(
                              event.target.value,
                            )
                          }
                          placeholder="8"
                          className="w-full rounded-xl border border-[var(--border)] px-3 py-2.5 pr-9"
                        />
                        <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-[var(--muted)]">
                          oz
                        </span>
                      </div>
                    </label>
                  </div>

                  <label className="text-sm">
                    <span className="font-medium">
                      Bait
                    </span>
                    <input
                      value={bait}
                      onChange={(event) =>
                        setBait(
                          event.target.value,
                        )
                      }
                      placeholder="Bunker chunk, mullet, clam..."
                      className="mt-1.5 w-full rounded-xl border border-[var(--border)] px-3 py-2.5"
                    />
                  </label>

                  <label className="text-sm">
                    <span className="font-medium">
                      Estimated depth
                      <span className="ml-1 font-normal text-[var(--muted)]">
                        (optional)
                      </span>
                    </span>
                    <div className="relative mt-1.5">
                      <input
                        inputMode="decimal"
                        value={
                          estimatedDepthFt
                        }
                        onChange={(event) =>
                          setEstimatedDepthFt(
                            event.target.value,
                          )
                        }
                        placeholder="Manual for beta"
                        className="w-full rounded-xl border border-[var(--border)] px-3 py-2.5 pr-8"
                      />
                      <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-[var(--muted)]">
                        ft
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-4 text-[var(--muted)]">
                      Bathymetry lookup is not connected yet. Any value entered here is your own estimate.
                    </p>
                  </label>

                  <label className="text-sm">
                    <span className="font-medium">
                      Notes
                    </span>
                    <textarea
                      value={notes}
                      onChange={(event) =>
                        setNotes(
                          event.target.value,
                        )
                      }
                      rows={2}
                      placeholder="Rig, target, trough/bar notes..."
                      className="mt-1.5 w-full resize-none rounded-xl border border-[var(--border)] px-3 py-2.5"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      void saveDrop()
                    }
                    disabled={saving}
                    className="rounded-xl bg-[var(--accent)] px-4 py-3 font-medium text-white disabled:opacity-50"
                  >
                    {saving
                      ? "Saving drop…"
                      : `Save ${rodLabel} drop`}
                  </button>
                </div>
              )}
            </section>
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-lg font-semibold">
              Drop history
            </h2>
            <p className="text-sm text-[var(--muted)]">
              {drops.length}{" "}
              {drops.length === 1
                ? "drop"
                : "drops"}{" "}
              recorded in this session
            </p>
          </div>

          {drops.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white p-8 text-center">
              <h3 className="font-semibold">
                No drops yet
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Pick a point on the map and save your first drone drop.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {drops.map((drop) => (
                <DropCard
                  key={drop.id}
                  drop={drop}
                  now={now}
                  onAction={
                    markDrop
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {!betaAccepted ? (
        <BetaGate
          onAccept={
            acceptBeta
          }
          onBackHref={`/sessions/${session.id}`}
        />
      ) : null}
    </main>
  );
}

function ConditionsPanel({
  conditions,
  loading,
  onRefresh,
}: {
  conditions: SessionConditionSnapshot;
  loading: boolean;
  onRefresh: () => void;
}) {
  const wind =
    conditions.weather;
  const tide =
    conditions.tide;

  const windToward =
    wind
      ? normalizeDegrees(
          wind.windDirectionDegrees +
            180,
        )
      : null;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">
            Conditions
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Wind vector + tide state
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium"
        >
          {loading
            ? "Refreshing…"
            : "Refresh"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[var(--surface-muted)] p-3">
          <p className="text-xs text-[var(--muted)]">
            Wind
          </p>
          {wind &&
          windToward !== null ? (
            <>
              <div className="mt-2 flex items-center gap-3">
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl font-bold text-[var(--accent)] shadow-sm"
                  style={{
                    transform: `rotate(${windToward}deg)`,
                  }}
                  aria-hidden="true"
                >
                  ↑
                </span>
                <div>
                  <p className="font-semibold">
                    {wind.windMph.toFixed(
                      1,
                    )}{" "}
                    mph
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    From{" "}
                    {wind.windDirection} · blowing{" "}
                    {compassDirection(
                      windToward,
                    )}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">
              Unavailable
            </p>
          )}
        </div>

        <div className="rounded-xl bg-[var(--surface-muted)] p-3">
          <p className="text-xs text-[var(--muted)]">
            Tide state
          </p>
          {tide ? (
            <div className="mt-2 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl font-bold text-[var(--accent)] shadow-sm">
                {tide.trend ===
                "rising"
                  ? "↑"
                  : tide.trend ===
                      "falling"
                    ? "↓"
                    : "↔"}
              </span>
              <div>
                <p className="font-semibold capitalize">
                  {tide.trend}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {tide.heightFt ===
                  null
                    ? tide.stationName
                    : `${tide.heightFt.toFixed(
                        1,
                      )} ft · ${tide.stationName}`}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">
              Unavailable
            </p>
          )}
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-4 text-[var(--muted)]">
        Tide arrow shows water-level trend only. It does not yet represent the geographic direction of tidal current.
      </p>
    </section>
  );
}

function DropCard({
  drop,
  now,
  onAction,
}: {
  drop: DroneFishingDrop;
  now: number;
  onAction: (
    drop: DroneFishingDrop,
    action:
      | "bite"
      | "fish"
      | "retrieve",
  ) => Promise<void>;
}) {
  const endTime =
    drop.retrievedAt
      ? new Date(
          drop.retrievedAt,
        ).getTime()
      : now;

  const soak =
    Math.max(
      0,
      endTime -
        new Date(
          drop.droppedAt,
        ).getTime(),
    );

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--selection)] font-bold text-[var(--accent)]">
          {drop.rodLabel.replace(
            "Rod ",
            "R",
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">
              {drop.rodLabel} · Drop{" "}
              {drop.dropNumber}
            </h3>
            <DropStatus drop={drop} />
          </div>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Soak{" "}
            <strong className="font-medium text-[var(--foreground)]">
              {formatDuration(soak)}
            </strong>
            {" · "}
            {Math.round(
              drop.distanceYards,
            )}{" "}
            yd ·{" "}
            {Math.round(
              drop.bearingDegrees,
            )}
            °{" "}
            {compassDirection(
              drop.bearingDegrees,
            )}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Stat
          label="Coordinates"
          value={`${drop.latitude.toFixed(
            5,
          )}, ${drop.longitude.toFixed(
            5,
          )}`}
          small
        />
        <Stat
          label="Depth"
          value={
            drop.estimatedDepthFt ===
            null
              ? "Not recorded"
              : `~${drop.estimatedDepthFt} ft`
          }
        />
        <Stat
          label="Bait"
          value={
            drop.bait ??
            "Not recorded"
          }
        />
        <Stat
          label="Weight"
          value={
            drop.sinkerOz === null
              ? "Not recorded"
              : `${drop.sinkerOz} oz`
          }
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            void onAction(
              drop,
              "bite",
            )
          }
          className={[
            "rounded-xl border px-3 py-2 text-xs font-medium",
            drop.biteAt
              ? "border-amber-300 bg-amber-50 text-amber-800"
              : "border-[var(--border)]",
          ].join(" ")}
        >
          {drop.biteAt
            ? "✓ Bite"
            : "Bite"}
        </button>

        <button
          type="button"
          onClick={() =>
            void onAction(
              drop,
              "fish",
            )
          }
          className={[
            "rounded-xl border px-3 py-2 text-xs font-medium",
            drop.caughtFishAt
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-[var(--border)]",
          ].join(" ")}
        >
          {drop.caughtFishAt
            ? "✓ Fish"
            : "Caught fish"}
        </button>

        <button
          type="button"
          onClick={() =>
            void onAction(
              drop,
              "retrieve",
            )
          }
          className={[
            "rounded-xl border px-3 py-2 text-xs font-medium",
            drop.retrievedAt
              ? "border-slate-300 bg-slate-100 text-slate-700"
              : "border-[var(--border)]",
          ].join(" ")}
        >
          {drop.retrievedAt
            ? "Reopen drop"
            : "Reel in"}
        </button>
      </div>

      {drop.conditions.weather ||
      drop.conditions.tide ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--border)] pt-3 text-[11px] text-[var(--muted)]">
          {drop.conditions.weather ? (
            <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1">
              Wind{" "}
              {
                drop.conditions
                  .weather
                  .windDirection
              }{" "}
              {drop.conditions.weather.windMph.toFixed(
                1,
              )}{" "}
              mph
            </span>
          ) : null}
          {drop.conditions.tide ? (
            <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 capitalize">
              Tide{" "}
              {
                drop.conditions
                  .tide.trend
              }
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function DropStatus({
  drop,
}: {
  drop: DroneFishingDrop;
}) {
  const classes =
    drop.caughtFishAt
      ? "bg-green-50 text-green-700"
      : drop.biteAt
        ? "bg-amber-50 text-amber-700"
        : drop.retrievedAt
          ? "bg-slate-100 text-slate-600"
          : "bg-emerald-50 text-emerald-700";

  const label =
    drop.caughtFishAt
      ? "Fish"
      : drop.biteAt
        ? "Bite"
        : drop.retrievedAt
          ? "Retrieved"
          : "Soaking";

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${classes}`}
    >
      {label}
    </span>
  );
}

function BetaNotice() {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
      <div className="flex items-start gap-3">
        <span className="rounded-full bg-amber-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wide">
          Beta
        </span>
        <div>
          <h2 className="font-semibold">
            Experimental Drone Fishing tools
          </h2>
          <p className="mt-1 text-sm leading-6 text-amber-900/80">
            Verify GPS coordinates, distances, conditions, and any depth information independently before using them for a real drone drop.
          </p>
        </div>
      </div>
    </section>
  );
}

function BetaGate({
  onAccept,
  onBackHref,
}: {
  onAccept: () => void;
  onBackHref: string;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <section className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
            Beta
          </span>
          <h2 className="text-xl font-semibold">
            Drone Fishing is being tested
          </h2>
        </div>

        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          Drop locations, distance, wind/tide information, GPS coordinates, and depth information may be inaccurate or incomplete.
        </p>

        <p className="mt-3 text-sm font-medium leading-6">
          Verify coordinates and conditions independently before using them for an actual drone drop. Follow applicable drone, fishing, and local regulations.
        </p>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Link
            href={onBackHref}
            className="rounded-xl border border-[var(--border)] px-4 py-3 text-center text-sm font-medium"
          >
            Back to session
          </Link>
          <button
            type="button"
            onClick={onAccept}
            className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white"
          >
            Continue to Drone Mode
          </button>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  small = false,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-[var(--surface-muted)] p-3">
      <p className="text-[11px] text-[var(--muted)]">
        {label}
      </p>
      <p
        className={[
          "mt-1 font-medium",
          small
            ? "break-all text-xs"
            : "text-sm",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function PageShell({
  sessionId,
  children,
}: {
  sessionId?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[var(--background)] p-4 sm:p-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href={
            sessionId
              ? `/sessions/${sessionId}`
              : "/sessions"
          }
          className="mb-4 inline-flex rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium"
        >
          ‹ Session
        </Link>
        {children}
      </div>
    </main>
  );
}

function StatusCard({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-5 text-sm",
        error
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-[var(--border)] bg-white text-[var(--muted)]",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function getDeviceLocation(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
}> {
  return new Promise(
    (resolve, reject) => {
      if (!navigator.geolocation) {
        reject(
          new Error(
            "Geolocation is not available.",
          ),
        );
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude:
              position.coords.latitude,
            longitude:
              position.coords.longitude,
            accuracy:
              position.coords.accuracy,
          });
        },
        reject,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 15000,
        },
      );
    },
  );
}

function calculateDropGeometry(
  origin: Point,
  target: Point,
): {
  distanceYards: number;
  bearingDegrees: number;
} {
  const earthRadiusM =
    6371008.8;
  const lat1 =
    degreesToRadians(
      origin.latitude,
    );
  const lat2 =
    degreesToRadians(
      target.latitude,
    );
  const deltaLat =
    degreesToRadians(
      target.latitude -
        origin.latitude,
    );
  const deltaLon =
    degreesToRadians(
      target.longitude -
        origin.longitude,
    );

  const a =
    Math.sin(
      deltaLat / 2,
    ) **
      2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(
        deltaLon / 2,
      ) **
        2;

  const distanceM =
    earthRadiusM *
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a),
    );

  const y =
    Math.sin(deltaLon) *
    Math.cos(lat2);
  const x =
    Math.cos(lat1) *
      Math.sin(lat2) -
    Math.sin(lat1) *
      Math.cos(lat2) *
      Math.cos(deltaLon);

  return {
    distanceYards:
      distanceM *
      1.0936132983,
    bearingDegrees:
      normalizeDegrees(
        (Math.atan2(y, x) *
          180) /
          Math.PI,
      ),
  };
}

function compassDirection(
  degrees: number,
): string {
  const labels = [
    "N",
    "NE",
    "E",
    "SE",
    "S",
    "SW",
    "W",
    "NW",
  ];

  return labels[
    Math.round(
      normalizeDegrees(
        degrees,
      ) / 45,
    ) % 8
  ];
}

function degreesToRadians(
  value: number,
): number {
  return (
    (value * Math.PI) /
    180
  );
}

function normalizeDegrees(
  value: number,
): number {
  return (
    ((value % 360) + 360) % 360
  );
}

function parsePositiveNumber(
  value: string,
): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) &&
    parsed >= 0
    ? parsed
    : undefined;
}

async function copyCoordinates(
  point: Point,
): Promise<void> {
  const value =
    `${point.latitude.toFixed(
      6,
    )}, ${point.longitude.toFixed(
      6,
    )}`;

  await navigator.clipboard.writeText(
    value,
  );
}

function formatDuration(
  milliseconds: number,
): string {
  const totalMinutes =
    Math.floor(
      milliseconds / 60000,
    );
  const hours =
    Math.floor(
      totalMinutes / 60,
    );
  const minutes =
    totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return "<1m";
}
