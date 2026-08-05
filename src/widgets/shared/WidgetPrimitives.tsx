export function MetricValue({
  value,
  detail,
}: {
  value: string;
  detail?: string;
}) {
  return (
    <div>
      <p className="text-3xl font-semibold tracking-tight">{value}</p>
      {detail ? (
        <p className="mt-1 text-sm text-[var(--muted)]">{detail}</p>
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
    <dl className="grid gap-2">
      {rows.map((row) => (
        <div
          key={`${row.label}-${row.value}`}
          className="flex items-center justify-between gap-4 border-b border-[var(--border)] py-2 last:border-b-0"
        >
          <dt className="text-sm text-[var(--muted)]">{row.label}</dt>
          <dd className="text-sm font-medium">{row.value}</dd>
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
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
      {columns.map((column) => (
        <div
          key={`${column.label}-${column.primary}`}
          className="rounded-xl bg-[var(--surface-muted)] p-3"
        >
          <p className="text-xs text-[var(--muted)]">{column.label}</p>
          <p className="mt-1 font-medium">{column.primary}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {column.secondary}
          </p>
        </div>
      ))}
    </div>
  );
}
