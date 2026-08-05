import Link from "next/link";

const categories = [
  {
    name: "Weather",
    description: "Temperature, conditions, rain, and forecasts.",
  },
  {
    name: "Wind",
    description: "Speed, gusts, direction, and hourly changes.",
  },
  {
    name: "Tides",
    description: "Highs, lows, station details, and tide movement.",
  },
  {
    name: "Waves",
    description: "Wave height, period, direction, and swell.",
  },
  {
    name: "Moon & Sun",
    description: "Moon phase, illumination, rise, and set times.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 lg:flex-row lg:items-center lg:py-24">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-[var(--accent)]">
            Fishing Forecast
          </p>

          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Build the fishing dashboard that matches how you fish.
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--muted)]">
            Choose independent weather locations, tide stations, marine points,
            and astronomy locations. Add only the widgets you care about.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/build"
              className="rounded-xl bg-[var(--accent)] px-5 py-3 font-medium text-white transition hover:bg-[var(--accent-strong)]"
            >
              Build a dashboard
            </Link>

            <a
              href="#categories"
              className="rounded-xl border border-[var(--border)] bg-white px-5 py-3 font-medium transition hover:bg-[var(--surface-muted)]"
            >
              View widget categories
            </a>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-3 rounded-3xl border border-[var(--border)] bg-white p-5">
          <Metric label="Temperature" value="74°F" detail="Cape May Point" />
          <Metric label="Wind" value="9 mph NE" detail="Gusts 15 mph" />
          <Metric label="Next high tide" value="2:46 PM" detail="4.7 ft" />
          <Metric label="Waves" value="2.1 ft" detail="7 second period" />
        </div>
      </section>

      <section id="categories" className="border-y border-[var(--border)] bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-2xl font-semibold">Modular by design</h2>
          <p className="mt-2 max-w-2xl text-[var(--muted)]">
            Every displayed value is an independent widget, while categories
            keep the builder organized and reusable sources prevent duplicate
            API requests.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {categories.map((category) => (
              <article
                key={category.name}
                className="rounded-2xl border border-[var(--border)] p-4"
              >
                <h3 className="font-medium">{category.name}</h3>
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
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl bg-[var(--surface-muted)] p-4">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{detail}</p>
    </div>
  );
}
