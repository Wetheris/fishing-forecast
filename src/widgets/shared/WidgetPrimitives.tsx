export function MetricValue({
  value,
  detail,
}: {
  value: string;
  detail?: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col justify-center">
      <p className="text-3xl font-semibold tracking-tight">
        {value}
      </p>
      {detail ? (
        <p className="mt-1 text-sm text-[var(--muted)]">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

export function DataList({
  rows,
}: {
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <dl className="grid gap-1 overflow-hidden">
      {rows.map((row) => (
        <div
          key={`${row.label}-${row.value}`}
          className="flex items-center justify-between gap-4 border-b border-[var(--border)] py-2 last:border-b-0"
        >
          <dt className="truncate text-sm text-[var(--muted)]">
            {row.label}
          </dt>
          <dd className="shrink-0 text-sm font-medium">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function CompactTimeline({
  columns,
}: {
  columns: Array<{
    label: string;
    primary: string;
    secondary: string;
  }>;
}) {
  return (
    <div className="grid h-full auto-cols-fr grid-flow-col gap-2 overflow-hidden">
      {columns.map((column) => (
        <div
          key={`${column.label}-${column.primary}`}
          className="min-w-0 rounded-xl bg-[var(--surface-muted)] p-3"
        >
          <p className="truncate text-xs text-[var(--muted)]">
            {column.label}
          </p>
          <p className="mt-1 truncate font-medium">
            {column.primary}
          </p>
          <p className="mt-1 truncate text-xs text-[var(--muted)]">
            {column.secondary}
          </p>
        </div>
      ))}
    </div>
  );
}

export function WidgetDataMessage({
  title,
  detail,
  tone = "neutral",
}: {
  title: string;
  detail: string;
  tone?: "neutral" | "error";
}) {
  return (
    <div
      className={
        tone === "error"
          ? "rounded-xl border border-red-200 bg-red-50 p-3 text-red-800"
          : "rounded-xl bg-[var(--surface-muted)] p-3"
      }
      role={tone === "error" ? "alert" : "status"}
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm opacity-80">
        {detail}
      </p>
    </div>
  );
}
