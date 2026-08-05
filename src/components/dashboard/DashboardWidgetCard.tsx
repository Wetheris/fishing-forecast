import type {
  DashboardSource,
  WidgetInstance,
  WidgetSize,
} from "@/types/dashboard";
import type { WeatherSourceState } from "@/types/weather";
import { WidgetRenderer } from "@/components/dashboard/WidgetRenderer";

type DashboardWidgetCardProps = {
  widget: WidgetInstance;
  source: DashboardSource;
  weatherState?: WeatherSourceState;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onSizeChange: (size: WidgetSize) => void;
};

export function DashboardWidgetCard({
  widget,
  source,
  weatherState,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRemove,
  onSizeChange,
}: DashboardWidgetCardProps) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-[var(--border)] bg-white">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div>
          <h3 className="font-medium">{widget.title}</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">{source.label}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-[var(--muted)]">
            <span className="sr-only">Widget size</span>
            <select
              value={widget.size}
              onChange={(event) =>
                onSizeChange(event.target.value as WidgetSize)
              }
              className="rounded-lg border border-[var(--border)] bg-white px-2 py-1"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </label>

          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="rounded-lg border border-[var(--border)] px-2 py-1 text-sm disabled:opacity-40"
            aria-label={`Move ${widget.title} earlier`}
          >
            ↑
          </button>

          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="rounded-lg border border-[var(--border)] px-2 py-1 text-sm disabled:opacity-40"
            aria-label={`Move ${widget.title} later`}
          >
            ↓
          </button>

          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg border border-red-200 px-2 py-1 text-sm text-red-700 hover:bg-red-50"
          >
            Remove
          </button>
        </div>
      </header>

      <div className="flex-1 p-4">
        <WidgetRenderer
          widget={widget}
          source={source}
          weatherState={weatherState}
        />
      </div>
    </article>
  );
}
