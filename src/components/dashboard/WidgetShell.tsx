import type { ReactNode } from "react";
import type {
  DashboardSource,
  WidgetInstance,
} from "@/types/dashboard";
import { booleanSetting } from "@/lib/widget-settings";

export function WidgetShell({
  widget,
  source,
  updatedAt,
  mode,
  selected,
  onSelect,
  children,
}: {
  widget: WidgetInstance;
  source: DashboardSource;
  updatedAt?: string | null;
  mode: "edit" | "view";
  selected: boolean;
  onSelect?: () => void;
  children: ReactNode;
}) {
  const showSourceLabel = booleanSetting(
    widget.settings,
    "showSourceLabel",
    true,
  );
  const showLastUpdated = booleanSetting(
    widget.settings,
    "showLastUpdated",
    false,
  );

  return (
    <article
      className={[
        "relative h-full overflow-hidden rounded-2xl border bg-white",
        selected
          ? "border-[var(--accent)] ring-2 ring-[var(--selection)]"
          : "border-[var(--border)]",
      ].join(" ")}
      onMouseDown={
        mode === "edit" ? onSelect : undefined
      }
    >
      <header className="flex min-h-14 items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium">
            {widget.title}
          </h3>
          {showSourceLabel ? (
            <p className="mt-1 truncate text-xs text-[var(--muted)]">
              {source.label}
            </p>
          ) : null}
        </div>

        {mode === "edit" ? (
          <button
            type="button"
            className="widget-drag-handle shrink-0 rounded-lg border border-[var(--border)] px-2 py-1 text-sm text-[var(--muted)] hover:bg-[var(--surface-muted)]"
            aria-label={`Drag ${widget.title}`}
            title="Drag widget"
          >
            ⠿
          </button>
        ) : null}
      </header>

      <div className="h-[calc(100%-3.5rem)] overflow-hidden p-4">
        {children}
      </div>

      {showLastUpdated && updatedAt ? (
        <p className="absolute bottom-2 right-3 text-[10px] text-[var(--muted)]">
          Updated{" "}
          {new Intl.DateTimeFormat("en-US", {
            hour: "numeric",
            minute: "2-digit",
          }).format(new Date(updatedAt))}
        </p>
      ) : null}
    </article>
  );
}
