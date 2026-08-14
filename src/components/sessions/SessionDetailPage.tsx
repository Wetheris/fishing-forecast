"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { LogCatchDialog } from "@/components/sessions/LogCatchDialog";
import {
  createCatchPhotoSignedUrl,
  endFishingSession,
  loadFishingSession,
  reopenFishingSession,
} from "@/lib/session-storage";
import type {
  FishingCatch,
  FishingSessionDetail,
  SessionConditionSnapshot,
} from "@/types/sessions";

export function SessionDetailPage() {
  const params = useParams<{
    id: string;
  }>();
  const id =
    Array.isArray(params.id)
      ? params.id[0]
      : params.id;
  const {
    user,
    loading: authLoading,
  } = useAuth();
  const [session, setSession] =
    useState<FishingSessionDetail>();
  const [photoUrls, setPhotoUrls] =
    useState<Record<string, string>>(
      {},
    );
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string>();
  const [logCatchOpen, setLogCatchOpen] =
    useState(false);
  const [authOpen, setAuthOpen] =
    useState(false);
  const [ending, setEnding] =
    useState(false);

  const refresh = useCallback(
    async () => {
      if (!user || !id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(undefined);

      try {
        const loaded =
          await loadFishingSession(
            id,
          );
        setSession(loaded);

        const urls =
          await loadCatchPhotoUrls(
            loaded.catches,
          );
        setPhotoUrls(urls);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load this fishing session.",
        );
      } finally {
        setLoading(false);
      }
    },
    [id, user],
  );

  useEffect(() => {
    if (!authLoading) {
      void refresh();
    }
  }, [
    authLoading,
    refresh,
  ]);

  async function toggleEnded() {
    if (!session) {
      return;
    }

    setEnding(true);
    setError(undefined);

    try {
      if (session.endedAt) {
        await reopenFishingSession(
          session.id,
        );
      } else {
        await endFishingSession(
          session.id,
        );
      }

      await refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update the session.",
      );
    } finally {
      setEnding(false);
    }
  }

  if (authLoading || loading) {
    return (
      <PageShell>
        <StatusCard>
          Loading fishing session…
        </StatusCard>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <section className="rounded-2xl border border-[var(--border)] bg-white p-6 text-center">
          <h1 className="text-xl font-semibold">
            Sign in to view this session
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Fishing sessions and catch photos are private to your account.
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
            intent="Fishing Sessions"
          />
        </section>
      </PageShell>
    );
  }

  if (!session) {
    return (
      <PageShell>
        <StatusCard error>
          {error ??
            "Session not found."}
        </StatusCard>
      </PageShell>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link
            href="/sessions"
            className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium"
          >
            ‹ Sessions
          </Link>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">
              {session.locationName ||
                "Fishing session"}
            </h1>
            <p className="text-xs text-[var(--muted)]">
              {formatDateTime(
                session.startedAt,
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setLogCatchOpen(true)
            }
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
          >
            + Catch
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-4 p-4 sm:p-6">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">
                  {session.locationName ||
                    "Fishing session"}
                </h2>
                <span
                  className={[
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    session.endedAt
                      ? "bg-slate-100 text-slate-600"
                      : "bg-emerald-50 text-emerald-700",
                  ].join(" ")}
                >
                  {session.endedAt
                    ? "Ended"
                    : "Active"}
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {session.latitude.toFixed(
                  5,
                )}
                ,{" "}
                {session.longitude.toFixed(
                  5,
                )}
              </p>
              {session.endedAt ? (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Ended{" "}
                  {formatDateTime(
                    session.endedAt,
                  )}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() =>
                void toggleEnded()
              }
              disabled={ending}
              className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium"
            >
              {ending
                ? "Saving…"
                : session.endedAt
                  ? "Reopen"
                  : "End session"}
            </button>
          </div>

          {session.notes ? (
            <p className="mt-4 rounded-xl bg-[var(--surface-muted)] p-3 text-sm">
              {session.notes}
            </p>
          ) : null}

          <Link
            href={`/sessions/${session.id}/drone`}
            className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 transition hover:border-amber-300 hover:bg-amber-100/70"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
              ◎
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">
                  Drone Fishing
                </h3>
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                  Beta
                </span>
              </div>
              <p className="mt-1 text-sm text-amber-950/70">
                Plan and track rod drops, coordinates, soak time, bites, and fish on a map.
              </p>
            </div>
            <span className="text-xl text-amber-900/60">
              ›
            </span>
          </Link>
        </section>

        <ConditionsCard
          title="Session start conditions"
          conditions={
            session.startingConditions
          }
        />

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                Catches
              </h2>
              <p className="text-sm text-[var(--muted)]">
                {session.catches.length}{" "}
                {session.catches.length ===
                1
                  ? "catch"
                  : "catches"}{" "}
                logged
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setLogCatchOpen(true)
              }
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
            >
              Log catch
            </button>
          </div>

          {session.catches.length ===
          0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white p-8 text-center">
              <div className="text-4xl">
                🐟
              </div>
              <h3 className="mt-3 font-semibold">
                Nothing logged yet
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                When you catch something, save its photo, exact location, and conditions here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {session.catches.map(
                (catchItem) => (
                  <CatchCard
                    key={catchItem.id}
                    catchItem={
                      catchItem
                    }
                    photoUrl={
                      photoUrls[
                        catchItem.id
                      ]
                    }
                  />
                ),
              )}
            </div>
          )}
        </section>
      </div>

      {logCatchOpen ? (
        <LogCatchDialog
          session={session}
          onClose={() =>
            setLogCatchOpen(false)
          }
          onSaved={() => {
            setLogCatchOpen(false);
            void refresh();
          }}
        />
      ) : null}
    </main>
  );
}

function CatchCard({
  catchItem,
  photoUrl,
}: {
  catchItem: FishingCatch;
  photoUrl?: string;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
      {photoUrl ? (
        <div className="bg-slate-950">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt={
              catchItem.species
                ? `${catchItem.species} catch`
                : "Fishing catch"
            }
            className="max-h-[520px] w-full object-contain"
          />
        </div>
      ) : null}

      <div className="p-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold">
              {catchItem.species ||
                "Catch"}
            </h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {formatDateTime(
                catchItem.caughtAt,
              )}
            </p>
          </div>

          {catchItem.lengthValue !==
            null ||
          catchItem.weightValue !==
            null ? (
            <div className="text-right text-sm">
              {catchItem.lengthValue !==
              null ? (
                <div>
                  {catchItem.lengthValue} in
                </div>
              ) : null}
              {catchItem.weightValue !==
              null ? (
                <div>
                  {catchItem.weightValue} lb
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
          <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1">
            📍{" "}
            {catchItem.locationName ||
              `${catchItem.latitude.toFixed(
                4,
              )}, ${catchItem.longitude.toFixed(
                4,
              )}`}
          </span>
          {catchItem.lureBait ? (
            <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1">
              🎣 {catchItem.lureBait}
            </span>
          ) : null}
        </div>

        <div className="mt-4">
          <ConditionsInline
            conditions={
              catchItem.conditions
            }
          />
        </div>

        {catchItem.notes ? (
          <p className="mt-4 border-t border-[var(--border)] pt-3 text-sm">
            {catchItem.notes}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function ConditionsCard({
  title,
  conditions,
}: {
  title: string;
  conditions: SessionConditionSnapshot;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
      <h2 className="font-semibold">
        {title}
      </h2>
      <div className="mt-3">
        <ConditionsInline
          conditions={conditions}
        />
      </div>
      {conditions.unavailable.length >
      0 ? (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Unavailable when captured:{" "}
          {conditions.unavailable.join(
            ", ",
          )}
        </p>
      ) : null}
    </section>
  );
}

function ConditionsInline({
  conditions,
}: {
  conditions: SessionConditionSnapshot;
}) {
  const items: Array<{
    label: string;
    value: string;
  }> = [];

  if (conditions.weather) {
    items.push(
      {
        label: "Weather",
        value:
          conditions.weather.condition,
      },
      {
        label: "Air",
        value: `${conditions.weather.temperatureF.toFixed(
          1,
        )}°F`,
      },
      {
        label: "Wind",
        value: `${conditions.weather.windDirection} ${conditions.weather.windMph.toFixed(
          1,
        )} mph`,
      },
    );
  }

  if (
    conditions.marine
      ?.waterTemperatureF !== null &&
    conditions.marine
      ?.waterTemperatureF !== undefined
  ) {
    items.push({
      label: "Water",
      value: `${conditions.marine.waterTemperatureF.toFixed(
        1,
      )}°F`,
    });
  }

  if (conditions.marine) {
    items.push({
      label: "Waves",
      value: `${conditions.marine.waveHeightFt.toFixed(
        1,
      )} ft · ${conditions.marine.wavePeriodSeconds.toFixed(
        1,
      )} sec`,
    });
  }

  if (conditions.tide) {
    items.push({
      label: "Tide",
      value: `${
        conditions.tide.trend
          .charAt(0)
          .toUpperCase() +
        conditions.tide.trend.slice(1)
      }${
        conditions.tide.heightFt ===
        null
          ? ""
          : ` · ${conditions.tide.heightFt.toFixed(
              1,
            )} ft`
      }`,
    });
  }

  if (conditions.moon) {
    items.push({
      label: "Moon",
      value: `${conditions.moon.phaseName} · ${conditions.moon.illuminationPercent.toFixed(
        0,
      )}%`,
    });
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Conditions were unavailable for this entry.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div
          key={`${item.label}-${item.value}`}
          className="rounded-xl bg-[var(--surface-muted)] p-3"
        >
          <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
            {item.label}
          </p>
          <p className="mt-1 text-sm font-medium">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

async function loadCatchPhotoUrls(
  catches: FishingCatch[],
): Promise<Record<string, string>> {
  const pairs =
    await Promise.all(
      catches.map(async (catchItem) => {
        const path =
          catchItem.stampedPhotoPath ??
          catchItem.originalPhotoPath;

        if (!path) {
          return null;
        }

        try {
          const url =
            await createCatchPhotoSignedUrl(
              path,
              3600,
            );
          return [
            catchItem.id,
            url,
          ] as const;
        } catch {
          return null;
        }
      }),
    );

  return Object.fromEntries(
    pairs.filter(
      (
        pair,
      ): pair is readonly [
        string,
        string,
      ] => pair !== null,
    ),
  );
}

function PageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[var(--background)] p-4 sm:p-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/sessions"
          className="mb-4 inline-flex rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium"
        >
          ‹ Sessions
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
