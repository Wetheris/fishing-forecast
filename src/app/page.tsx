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
      <section className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16 lg:flex-row lg:items-center lg:gap-16 lg:py-24">
        <div className="max-w-2xl lg:flex-1">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-[var(--accent)]">
            {signedIn ? "Welcome back" : "Fishing Forecast"}
          </p>

          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {signedIn
              ? "Your fishing dashboards are ready when you are."
              : "Build the fishing dashboard that matches how you fish."}
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--muted)]">
            {signedIn
              ? "Open a saved dashboard, adjust your setup, or build another view for your next trip."
              : "Choose independent weather locations, tide stations, marine points, and astronomy locations. Add only the widgets you care about."}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={signedIn ? "/dashboards" : "/build"}
              className="rounded-xl bg-[var(--accent)] px-5 py-3 font-medium text-white transition hover:bg-[var(--accent-strong)]"
            >
              {signedIn ? "My dashboards" : "Start building"}
            </Link>

            <Link
              href={signedIn ? "/build" : "#categories"}
              className="rounded-xl border border-[var(--border)] bg-transparent px-5 py-3 font-medium transition hover:bg-[var(--surface-muted)]"
            >
              {signedIn ? "Build another dashboard" : "Explore widgets"}
            </Link>
          </div>

          {!signedIn && !loading ? (
            <p className="mt-3 text-sm text-[var(--muted)]">
              No account required to start.
            </p>
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
          <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <div>
                <p className="text-sm font-semibold">
                  Your fishing dashboard
                </p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  Drag, resize, and add only what matters.
                </p>
              </div>
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium text-[var(--muted)]">
                Customize
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 p-5">
              <Metric
                icon="temperature"
                label="Temperature"
                value="74°F"
                detail="Cape May Point"
              />
              <Metric
                icon="wind"
                label="Wind"
                value="9 mph"
                detail="NE · Gusts 15 mph"
              />
              <Metric
                icon="tides"
                label="Next high tide"
                value="2:46 PM"
                detail="4.7 ft"
              />
              <Metric
                icon="marine"
                label="Waves"
                value="2.1 ft"
                detail="7 second period"
              />

              <div className="col-span-2 flex min-h-16 items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)]/45 text-sm font-medium text-[var(--muted)]">
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

function Metric({
  icon,
  label,
  value,
  detail,
}: {
  icon: IconKind;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="relative rounded-2xl bg-[var(--surface-muted)] p-4">
      <span
        aria-hidden="true"
        className="absolute right-3 top-3 text-[var(--muted)]/70"
      >
        <DragDots />
      </span>

      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[var(--accent)] shadow-sm">
        <DataIcon kind={icon} />
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
