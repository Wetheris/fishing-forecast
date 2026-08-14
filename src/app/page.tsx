"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

type IconKind =
  | "temperature"
  | "wind"
  | "tides"
  | "marine"
  | "weather"
  | "moon";

type MetricSignal =
  | "temperature"
  | "wind"
  | "tide"
  | "waves";

const categories: Array<{
  name: string;
  description: string;
  icon: IconKind;
}> = [
  {
    name: "Weather",
    description: "Temperature, conditions, rain, and forecasts.",
    icon: "weather",
  },
  {
    name: "Wind",
    description: "Speed, gusts, direction, and hourly changes.",
    icon: "wind",
  },
  {
    name: "Tides",
    description: "Highs, lows, station details, and tide movement.",
    icon: "tides",
  },
  {
    name: "Marine",
    description: "Wave height, period, direction, swell, and water temperature.",
    icon: "marine",
  },
  {
    name: "Moon & Sun",
    description: "Moon phase, illumination, rise, and set times.",
    icon: "moon",
  },
];

export default function HomePage() {
  const { user, loading } = useAuth();
  const signedIn = !loading && Boolean(user);

  return (
    <main className="min-h-screen">
      <section
        className={[
          "relative overflow-hidden",
          signedIn
            ? ""
            : "border-b border-[var(--border)] bg-[linear-gradient(135deg,#f7fbfb_0%,#edf7f7_48%,#f9fbfa_100%)]",
        ].join(" ")}
      >
        {!signedIn ? <MarineAtmosphere /> : null}

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16 lg:flex-row lg:items-center lg:gap-16 lg:py-24">
          <div className="max-w-2xl lg:flex-1">
            {signedIn ? (
              <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-[var(--accent)]">
                Welcome back
              </p>
            ) : (
              <LiveConditionsBadge />
            )}

            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              {signedIn
                ? "Your fishing dashboards are ready when you are."
                : "Dial in the conditions. Fish smarter."}
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--muted)]">
              {signedIn
                ? "Open a saved dashboard, adjust your setup, or build another view for your next trip."
                : "Build a fishing dashboard around the weather, tides, wind, waves, and locations that matter to you."}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={signedIn ? "/dashboards" : "/build"}
                className="rounded-xl bg-[var(--accent)] px-5 py-3 font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--accent-strong)] hover:shadow-md"
              >
                {signedIn ? "My dashboards" : "Start building"}
              </Link>

              <Link
                href={signedIn ? "/build" : "#categories"}
                className="rounded-xl border border-[var(--border)] bg-white/55 px-5 py-3 font-medium backdrop-blur-sm transition hover:bg-white"
              >
                {signedIn ? "Build another dashboard" : "Explore widgets"}
              </Link>
            </div>

            {!signedIn && !loading ? (
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <CheckMark />
                  No account required to start
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckMark />
                  Desktop + mobile layouts
                </span>
              </div>
            ) : signedIn ? (
              <Link
                href="/sessions"
                className="mt-3 inline-flex text-sm font-medium text-[var(--accent)] hover:underline"
              >
                View fishing sessions →
              </Link>
            ) : null}
          </div>

          <div className="flex-1">
            <div
              className={[
                "overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm",
                signedIn
                  ? ""
                  : "shadow-[0_24px_70px_rgba(8,127,140,0.12)]",
              ].join(" ")}
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    </span>
                    <p className="text-sm font-semibold">
                      Your fishing dashboard
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Cape May Point · conditions at a glance
                  </p>
                </div>

                <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium text-[var(--muted)]">
                  Customize
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 p-5">
                <Metric
                  icon="temperature"
                  signal="temperature"
                  label="Temperature"
                  value="74°F"
                  detail="Feels like 75°"
                />
                <Metric
                  icon="wind"
                  signal="wind"
                  label="Wind"
                  value="9 mph"
                  detail="NE · Gusts 15 mph"
                />
                <Metric
                  icon="tides"
                  signal="tide"
                  label="Next high tide"
                  value="2:46 PM"
                  detail="4.7 ft · rising"
                />
                <Metric
                  icon="marine"
                  signal="waves"
                  label="Waves"
                  value="2.1 ft"
                  detail="7 second period"
                />

                <div className="col-span-2 flex min-h-16 items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)]/45 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
                  <span className="mr-2 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-white text-lg leading-none text-[var(--accent)]">
                    +
                  </span>
                  Add widget
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
              <DragDots />
              Arrange the dashboard around the way you fish
            </div>
          </div>
        </div>
      </section>

      <section
        id="categories"
        className="border-y border-[var(--border)] bg-white"
      >
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold">
            Modular by design
          </h2>
          <p className="mt-2 max-w-2xl text-[var(--muted)]">
            Every displayed value is an independent widget. Mix weather,
            wind, tides, marine conditions, and astronomy into the view
            that is most useful to you.
          </p>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {categories.map((category) => (
              <article
                key={category.name}
                className="group rounded-2xl border border-[var(--border)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--selection)] text-[var(--accent)]">
                  <DataIcon kind={category.icon} />
                </div>
                <h3 className="mt-4 font-medium">
                  {category.name}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {category.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function MarineAtmosphere() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute -right-24 -top-32 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(8,127,140,0.15)_0%,rgba(8,127,140,0.04)_44%,transparent_70%)]" />
      <div className="absolute -bottom-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(40,154,168,0.09)_0%,transparent_68%)]" />

      <svg
        viewBox="0 0 900 420"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-[72%] w-full text-[var(--accent)] opacity-[0.07]"
      >
        <path
          d="M-40 325c90-68 162-85 245-57 91 31 143 6 226-45 104-64 206-47 304-2 70 32 136 24 205-22"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M-60 354c112-70 190-79 273-46 85 34 144 16 224-29 105-59 192-50 285-13 82 33 158 30 246-16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M-50 383c116-59 197-65 284-31 76 30 138 21 219-16 104-47 198-43 293-11 85 29 159 28 232-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M130 245c54-45 112-60 165-43 48 16 89 8 137-26 68-49 128-53 187-22"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path
          d="M178 214c38-29 78-39 117-27 41 13 74 7 109-18 49-35 94-39 138-19"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
        />
      </svg>
    </div>
  );
}

function LiveConditionsBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)] shadow-sm backdrop-blur-sm">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      Weather · Tides · Wind · Marine
    </div>
  );
}

function CheckMark() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4 text-[var(--accent)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 10 3 3 7-7" />
    </svg>
  );
}

function Metric({
  icon,
  signal,
  label,
  value,
  detail,
}: {
  icon: IconKind;
  signal: MetricSignal;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[var(--surface-muted)] p-4">
      <span
        aria-hidden="true"
        className="absolute right-3 top-3 text-[var(--muted)]/60"
      >
        <DragDots />
      </span>

      <div className="flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[var(--accent)] shadow-sm">
          <DataIcon kind={icon} />
        </div>

        <MetricSignalGraphic signal={signal} />
      </div>

      <p className="mt-3 text-sm text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold">
        {value}
      </p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {detail}
      </p>
    </div>
  );
}

function MetricSignalGraphic({
  signal,
}: {
  signal: MetricSignal;
}) {
  if (signal === "wind") {
    return (
      <div
        className="mr-7 flex h-7 w-7 rotate-45 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--accent)] shadow-sm"
        title="Northeast wind"
      >
        <svg
          viewBox="0 0 20 20"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M10 16V4" />
          <path d="m6 8 4-4 4 4" />
        </svg>
      </div>
    );
  }

  if (signal === "tide") {
    return (
      <svg
        viewBox="0 0 52 24"
        className="mr-7 h-7 w-13 text-[var(--accent)]"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M2 20c8-1 11-7 17-8 7-1 8 5 14 3 6-2 8-9 17-12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle
          cx="50"
          cy="3"
          r="2.5"
          fill="currentColor"
          className="animate-pulse"
        />
      </svg>
    );
  }

  if (signal === "waves") {
    return (
      <svg
        viewBox="0 0 50 24"
        className="mr-7 h-7 w-12 text-[var(--accent)]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M2 11c5 0 5-5 10-5s5 5 10 5 5-5 10-5 5 5 10 5 5-5 6-5" />
        <path
          d="M2 17c5 0 5-3 10-3s5 3 10 3 5-3 10-3 5 3 10 3 5-3 6-3"
          opacity=".45"
        />
      </svg>
    );
  }

  return (
    <span className="mr-7 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 shadow-sm">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Current
    </span>
  );
}

function DragDots() {
  return (
    <span
      aria-hidden="true"
      className="grid grid-cols-2 gap-[2px]"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <span
          key={index}
          className="h-[3px] w-[3px] rounded-full bg-current"
        />
      ))}
    </span>
  );
}

function DataIcon({
  kind,
}: {
  kind: IconKind;
}) {
  const common =
    "h-5 w-5";

  if (kind === "temperature") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={common}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 14.8V5a3 3 0 0 0-6 0v9.8a5 5 0 1 0 6 0Z" />
        <path d="M11 11v6" />
      </svg>
    );
  }

  if (kind === "wind") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={common}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M3 8h11c2 0 2-3 0-3" />
        <path d="M3 12h16c2 0 2 3 0 3" />
        <path d="M3 16h8" />
      </svg>
    );
  }

  if (kind === "tides") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={common}
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

  if (kind === "marine") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={common}
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

  if (kind === "moon") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={common}
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

  return (
    <svg
      viewBox="0 0 24 24"
      className={common}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 18h11a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.2 8.1 5 5 0 0 0 6 18Z" />
      <path d="M9 6.5V4" />
      <path d="m5.5 8-1.8-1" />
    </svg>
  );
}
