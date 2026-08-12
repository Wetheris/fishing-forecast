import type {
  MouseEvent,
  ReactNode,
} from "react";
import type {
  DashboardSource,
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

    /*
     * Do not select/open the tools drawer when the user is
     * dragging, resizing, or interacting with controls inside
     * a widget. A normal click on the card still selects it.
     */
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
            "flex items-start justify-between gap-3 border-b border-[var(--border)]",
            compact
              ? "min-h-9 px-2.5 py-1.5"
              : "min-h-14 px-4 py-3",
          ].join(" ")}
        >
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

          {mode === "edit" ? (
            <DragHandle title={widget.title} />
          ) : null}
        </header>
      ) : mode === "edit" ? (
        <div className="absolute right-2 top-2 z-30">
          <DragHandle title={widget.title} floating />
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

function DragHandle({
  title,
  floating = false,
}: {
  title: string;
  floating?: boolean;
}) {
  return (
    <button
      type="button"
      className={[
        "widget-drag-handle shrink-0 rounded-lg border border-[var(--border)] px-2 py-1 text-sm text-[var(--muted)] hover:bg-[var(--surface-muted)]",
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
