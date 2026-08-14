import type {
  MouseEvent,
  ReactNode,
} from "react";
import type {
  DashboardSource,
  WidgetCategory,
  WidgetInstance,
} from "@/types/dashboard";
import {
  booleanSetting,
  stringSetting,
} from "@/lib/widget-settings";

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
  const showHeader = booleanSetting(
    widget.settings,
    "showHeader",
    true,
  );
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
  const density = stringSetting(
    widget.settings,
    "density",
    "standard",
  );
  const fontSize = stringSetting(
    widget.settings,
    "fontSize",
    "medium",
  );
  const compact = density === "compact";
  const effectiveShowSourceLabel =
    showSourceLabel && !compact;

  function selectFromClick(
    event: MouseEvent<HTMLElement>,
  ) {
    if (mode !== "edit") {
      return;
    }

    const target =
      event.target instanceof Element
        ? event.target
        : null;

    if (
      target?.closest(
        [
          ".widget-drag-handle",
          ".react-resizable-handle",
          "button",
          "input",
          "select",
          "textarea",
          "a",
          "[role='button']",
        ].join(","),
      )
    ) {
      return;
    }

    onSelect?.();
  }

  return (
    <article
      className={[
        "widget-card relative h-full overflow-hidden border bg-[var(--surface)]",
        compact
          ? "widget-density-compact"
          : "widget-density-standard",
        fontSize === "small"
          ? "widget-font-small"
          : fontSize === "large"
            ? "widget-font-large"
            : "widget-font-medium",
        selected
          ? "border-[var(--accent)] ring-2 ring-[var(--selection)]"
          : "border-[var(--border)]",
      ].join(" ")}
      onClick={selectFromClick}
    >
      {showHeader ? (
        <header
          className={[
            "flex items-start justify-between gap-2 border-b border-[var(--border)]",
            compact
              ? "min-h-9 px-2 py-1.5"
              : "min-h-14 px-4 py-3",
          ].join(" ")}
        >
          <div className="flex min-w-0 items-center gap-2">
            {compact ? (
              <CompactWidgetIcon
                category={widget.category}
              />
            ) : null}

            <div className="min-w-0">
              <h3 className="truncate text-sm font-medium">
                {widget.title}
              </h3>
              {effectiveShowSourceLabel ? (
                <p
                  className={[
                    "truncate text-xs text-[var(--muted)]",
                    compact ? "mt-0.5" : "mt-1",
                  ].join(" ")}
                >
                  {source.label}
                </p>
              ) : null}
            </div>
          </div>

          {mode === "edit" ? (
            <DragHandle
              title={widget.title}
              compact={compact}
            />
          ) : null}
        </header>
      ) : mode === "edit" ? (
        <div className="absolute right-2 top-2 z-30">
          <DragHandle
            title={widget.title}
            floating
            compact={compact}
          />
        </div>
      ) : null}

      <div
        className={[
          "widget-card-content builder-scrollbar min-h-0",
          compact ? "overflow-hidden" : "overflow-auto",
          showHeader
            ? compact
              ? "h-[calc(100%-2.25rem)] p-2"
              : "h-[calc(100%-3.5rem)] p-4"
            : compact
              ? "h-full p-2"
              : "h-full p-4",
        ].join(" ")}
      >
        {children}
      </div>

      {showLastUpdated && updatedAt ? (
        <p className="pointer-events-none absolute bottom-1.5 right-2 rounded bg-[var(--surface)]/85 px-1 text-[10px] text-[var(--muted)]">
          Updated {formatUpdatedTime(updatedAt)}
        </p>
      ) : null}
    </article>
  );
}

function CompactWidgetIcon({
  category,
}: {
  category: WidgetCategory;
}) {
  return (
    <span
      aria-hidden="true"
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--surface-muted)] text-[var(--accent)]"
    >
      {category === "weather" ? (
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 18h11a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.2 8.1 5 5 0 0 0 6 18Z" />
        </svg>
      ) : category === "wind" ? (
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M3 8h11c2 0 2-3 0-3" />
          <path d="M3 12h16c2 0 2 3 0 3" />
          <path d="M3 16h8" />
        </svg>
      ) : category === "tides" ? (
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 9c2-2 4-2 6 0s4 2 6 0 4-2 4-2" />
          <path d="M4 15c2-2 4-2 6 0s4 2 6 0 4-2 4-2" />
        </svg>
      ) : category === "waves" ? (
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M3 16c3 0 3-3 6-3s3 3 6 3 3-3 6-3" />
          <path d="M3 11c3 0 3-3 6-3s3 3 6 3 3-3 6-3" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 15.5A8 8 0 1 1 8.5 4 6.5 6.5 0 0 0 20 15.5Z" />
        </svg>
      )}
    </span>
  );
}

function DragHandle({
  title,
  floating = false,
  compact = false,
}: {
  title: string;
  floating?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      className={[
        "widget-drag-handle shrink-0 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-muted)]",
        compact
          ? "flex h-7 w-7 items-center justify-center p-0 text-xs"
          : "px-2 py-1 text-sm",
        floating
          ? "bg-[var(--surface)]/90 shadow-sm backdrop-blur"
          : "",
      ].join(" ")}
      aria-label={`Drag ${title}`}
      title="Drag widget"
    >
      ⠿
    </button>
  );
}

function formatUpdatedTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
