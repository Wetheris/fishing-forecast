"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthDialog } from "@/components/auth/AuthDialog";
import {
  createFishingSession,
  listFishingSessions,
} from "@/lib/session-storage";
import { collectSessionConditions } from "@/lib/session-conditions";
import type { FishingSessionSummary } from "@/types/sessions";

export function SessionsPage() {
  const router = useRouter();
  const {
    user,
    loading: authLoading,
  } = useAuth();
  const [sessions, setSessions] =
    useState<FishingSessionSummary[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string>();
  const [startOpen, setStartOpen] =
    useState(false);
  const [authOpen, setAuthOpen] =
    useState(false);

  const refresh = useCallback(
    async () => {
      if (!user) {
        setSessions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(undefined);

      try {
        setSessions(
          await listFishingSessions(),
        );
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load fishing sessions.",
        );
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    if (!authLoading) {
      void refresh();
    }
  }, [authLoading, refresh]);

  function startSession() {
    if (!user) {
      setAuthOpen(true);
      return;
    }

    setStartOpen(true);
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link
            href="/view"
            className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
          >
            Dashboard
          </Link>

          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold">
              Fishing Sessions
            </h1>
            <p className="text-xs text-[var(--muted)]">
              Log trips, catches, photos, and conditions.
            </p>
          </div>

          <button
            type="button"
            onClick={startSession}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
          >
            Start session
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        {authLoading ? (
          <StatusCard>
            Checking your account…
          </StatusCard>
        ) : !user ? (
          <section className="rounded-2xl border border-[var(--border)] bg-white p-6 text-center shadow-sm">
            <div className="mx-auto max-w-md">
              <div className="text-4xl">
                🎣
              </div>
              <h2 className="mt-3 text-xl font-semibold">
                Your fishing history
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Sessions are saved to your account so catches and photos remain available across devices.
              </p>
              <button
                type="button"
                onClick={() =>
                  setAuthOpen(true)
                }
                className="mt-5 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
              >
                Sign in to use Sessions
              </button>
            </div>
          </section>
        ) : loading ? (
          <StatusCard>
            Loading sessions…
          </StatusCard>
        ) : error ? (
          <StatusCard error>
            {error}
          </StatusCard>
        ) : sessions.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-[var(--border)] bg-white p-8 text-center">
            <div className="text-4xl">
              🐟
            </div>
            <h2 className="mt-3 text-lg font-semibold">
              No sessions yet
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Start one when you get to the water. Date, time, GPS, weather, marine conditions, tides, and moon data are captured automatically.
            </p>
            <button
              type="button"
              onClick={startSession}
              className="mt-5 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
            >
              Start first session
            </button>
          </section>
        ) : (
          <div className="grid gap-3">
            {sessions.map(
              (session) => (
                <Link
                  key={session.id}
                  href={`/sessions/${session.id}`}
                  className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-xl">
                      🎣
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h2 className="font-semibold">
                          {session.locationName ||
                            "Fishing session"}
                        </h2>
                        {!session.endedAt ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Active
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {formatDateTime(
                          session.startedAt,
                        )}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {session.latitude.toFixed(
                          4,
                        )}
                        ,{" "}
                        {session.longitude.toFixed(
                          4,
                        )}
                        {" · "}
                        {session.catchCount}{" "}
                        {session.catchCount === 1
                          ? "catch"
                          : "catches"}
                      </p>
                    </div>
                    <span className="text-xl text-[var(--muted)]">
                      ›
                    </span>
                  </div>
                </Link>
              ),
            )}
          </div>
        )}
      </div>

      {user && startOpen ? (
        <StartSessionDialog
          onClose={() =>
            setStartOpen(false)
          }
          onCreated={(id) => {
            setStartOpen(false);
            router.push(
              `/sessions/${id}`,
            );
          }}
        />
      ) : null}

      <AuthDialog
        open={authOpen}
        onClose={() =>
          setAuthOpen(false)
        }
        initialMode="signin"
        intent="Fishing Sessions"
      />
    </main>
  );
}

function StartSessionDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { user } = useAuth();
  const [latitude, setLatitude] =
    useState<number>();
  const [longitude, setLongitude] =
    useState<number>();
  const [locationName, setLocationName] =
    useState("");
  const [notes, setNotes] =
    useState("");
  const [locationStatus, setLocationStatus] =
    useState(
      "Getting your location…",
    );
  const [saving, setSaving] =
    useState(false);
  const [error, setError] =
    useState<string>();

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search,
      );
    const latitudeParam =
      params.get("latitude");
    const longitudeParam =
      params.get("longitude");
    const queryLatitude =
      latitudeParam === null
        ? Number.NaN
        : Number(latitudeParam);
    const queryLongitude =
      longitudeParam === null
        ? Number.NaN
        : Number(longitudeParam);
    const queryLabel =
      params.get("label");

    if (
      isValidCoordinates(
        queryLatitude,
        queryLongitude,
      )
    ) {
      setLatitude(queryLatitude);
      setLongitude(queryLongitude);
      setLocationName(
        queryLabel ?? "",
      );
      setLocationStatus(
        "Using dashboard location.",
      );
      return;
    }

    getDeviceLocation()
      .then((position) => {
        setLatitude(
          position.latitude,
        );
        setLongitude(
          position.longitude,
        );
        setLocationStatus(
          `GPS accuracy ±${Math.round(
            position.accuracy,
          )} m`,
        );
      })
      .catch(() => {
        setLocationStatus(
          "GPS unavailable. Enter coordinates below.",
        );
      });
  }, []);

  async function handleStart() {
    if (
      !user ||
      latitude === undefined ||
      longitude === undefined ||
      !isValidCoordinates(
        latitude,
        longitude,
      )
    ) {
      setError(
        "A valid location is required.",
      );
      return;
    }

    setSaving(true);
    setError(undefined);

    try {
      const eventTime =
        new Date().toISOString();
      const conditions =
        await collectSessionConditions({
          latitude,
          longitude,
          eventTime,
        });
      const id =
        await createFishingSession({
          user,
          latitude,
          longitude,
          locationName,
          notes,
          startingConditions:
            conditions,
        });

      onCreated(id);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to start the session.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <section className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">
              Start fishing session
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Conditions are captured when the session starts.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
          >
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">
              Location name
            </span>
            <input
              value={locationName}
              onChange={(event) =>
                setLocationName(
                  event.target.value,
                )
              }
              placeholder="Cape May Inlet, Back Bay, Beach..."
              className="rounded-xl border border-[var(--border)] px-3 py-2.5"
            />
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                Coordinates
              </p>
              <button
                type="button"
                onClick={() => {
                  setLocationStatus(
                    "Getting your location…",
                  );
                  void getDeviceLocation()
                    .then(
                      (position) => {
                        setLatitude(
                          position.latitude,
                        );
                        setLongitude(
                          position.longitude,
                        );
                        setLocationStatus(
                          `GPS accuracy ±${Math.round(
                            position.accuracy,
                          )} m`,
                        );
                      },
                    )
                    .catch(() =>
                      setLocationStatus(
                        "GPS unavailable.",
                      ),
                    );
                }}
                className="text-xs font-medium text-[var(--accent)]"
              >
                Use my GPS
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                inputMode="decimal"
                value={
                  latitude ?? ""
                }
                onChange={(event) =>
                  setLatitude(
                    parseOptionalNumber(
                      event.target.value,
                    ),
                  )
                }
                placeholder="Latitude"
                className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm"
              />
              <input
                inputMode="decimal"
                value={
                  longitude ?? ""
                }
                onChange={(event) =>
                  setLongitude(
                    parseOptionalNumber(
                      event.target.value,
                    ),
                  )
                }
                placeholder="Longitude"
                className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm"
              />
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {locationStatus}
            </p>
          </div>

          <label className="grid gap-1 text-sm">
            <span className="font-medium">
              Notes{" "}
              <span className="font-normal text-[var(--muted)]">
                (optional)
              </span>
            </span>
            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value,
                )
              }
              rows={3}
              placeholder="Target species, plan, launch point..."
              className="resize-none rounded-xl border border-[var(--border)] px-3 py-2.5"
            />
          </label>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() =>
            void handleStart()
          }
          disabled={
            saving ||
            latitude === undefined ||
            longitude === undefined
          }
          className="mt-5 w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          {saving
            ? "Capturing conditions…"
            : "Start session"}
        </button>
      </section>
    </div>
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
          timeout: 12000,
          maximumAge: 30000,
        },
      );
    },
  );
}

function parseOptionalNumber(
  value: string,
): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : undefined;
}

function isValidCoordinates(
  latitude: number,
  longitude: number,
): boolean {
  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function formatDateTime(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}
