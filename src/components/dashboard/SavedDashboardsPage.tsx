"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  deleteCloudDashboard,
  listCloudDashboards,
  type CloudDashboardSummary,
} from "@/lib/dashboard-storage";

export function SavedDashboardsPage() {
  const {
    user,
    loading: authLoading,
  } = useAuth();
  const [authOpen, setAuthOpen] =
    useState(false);
  const [dashboards, setDashboards] =
    useState<CloudDashboardSummary[]>([]);
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState<string>();

  useEffect(() => {
    if (!user) {
      setDashboards([]);
      return;
    }

    let active = true;
    setLoading(true);
    setError(undefined);

    void listCloudDashboards()
      .then((items) => {
        if (active) {
          setDashboards(items);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load dashboards.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user]);

  async function removeDashboard(
    id: string,
  ) {
    const confirmed = window.confirm(
      "Delete this saved dashboard?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteCloudDashboard(id);
      setDashboards((current) =>
        current.filter(
          (dashboard) =>
            dashboard.id !== id,
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to delete dashboard.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-[var(--surface-muted)]">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link
            href="/"
            className="font-medium text-[var(--accent)]"
          >
            Fishing Forecast
          </Link>

          <Link
            href="/build"
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
          >
            New dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-8">
        <h1 className="text-2xl font-semibold">
          My dashboards
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Open a saved dashboard and continue
          editing it.
        </p>

        {authLoading ? (
          <p className="mt-8 text-[var(--muted)]">
            Checking your account…
          </p>
        ) : !user ? (
          <div className="mt-8 max-w-lg rounded-2xl border border-[var(--border)] bg-white p-5">
            <h2 className="font-semibold">
              Sign in to see your dashboards
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Dashboards saved to your account
              are protected by your Supabase login.
            </p>
            <button
              type="button"
              onClick={() =>
                setAuthOpen(true)
              }
              className="mt-4 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
            >
              Sign in
            </button>
          </div>
        ) : null}

        {error ? (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        {user && loading ? (
          <p className="mt-8 text-[var(--muted)]">
            Loading dashboards…
          </p>
        ) : null}

        {user &&
        !loading &&
        dashboards.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] bg-white p-8 text-center">
            <p className="font-medium">
              No saved dashboards yet
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Build one and press Save.
            </p>
            <Link
              href="/build"
              className="mt-4 inline-block rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
            >
              Build a dashboard
            </Link>
          </div>
        ) : null}

        {user && dashboards.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dashboards.map(
              (dashboard) => (
                <article
                  key={dashboard.id}
                  className="rounded-2xl border border-[var(--border)] bg-white p-5"
                >
                  <h2 className="truncate font-semibold">
                    {dashboard.name}
                  </h2>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Updated{" "}
                    {formatUpdatedAt(
                      dashboard.updatedAt,
                    )}
                  </p>

                  <div className="mt-5 flex items-center gap-2">
                    <Link
                      href={`/build?dashboard=${encodeURIComponent(
                        dashboard.id,
                      )}`}
                      className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white"
                    >
                      Open
                    </Link>

                    <button
                      type="button"
                      onClick={() =>
                        void removeDashboard(
                          dashboard.id,
                        )
                      }
                      className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface-muted)]"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ),
            )}
          </div>
        ) : null}
      </section>

      <AuthDialog
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode="signin"
        intent="My dashboards"
      />
    </main>
  );
}

function formatUpdatedAt(
  value: string,
): string {
  try {
    return new Intl.DateTimeFormat(
      "en-US",
      {
        dateStyle: "medium",
        timeStyle: "short",
      },
    ).format(new Date(value));
  } catch {
    return value;
  }
}
