import {
  categoryLabels,
  categoryOrder,
  widgetDefinitions,
} from "@/widgets/registry";
import type { WidgetDefinition } from "@/widgets/types";

export function WidgetLibraryPanel({
  onAddWidget,
}: {
  onAddWidget: (definition: WidgetDefinition) => void;
}) {
  return (
    <div>
      <header>
        <h2 className="font-medium">Add widgets</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Each value is modular. Adding a widget places it in
          every enabled layout.
        </p>
      </header>

      <div className="mt-5 space-y-6">
        {categoryOrder.map((category) => (
          <section key={category}>
            <h3 className="text-sm font-medium">
              {categoryLabels[category]}
            </h3>
            <div className="mt-2 grid gap-2">
              {widgetDefinitions
                .filter(
                  (definition) =>
                    definition.category === category,
                )
                .map((definition) => (
                  <button
                    key={definition.key}
                    type="button"
                    onClick={() => onAddWidget(definition)}
                    className="rounded-xl border border-[var(--border)] px-3 py-2 text-left hover:border-[var(--accent)] hover:bg-[var(--surface-muted)]"
                  >
                    <span className="block text-sm font-medium">
                      + {definition.name}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
                      {definition.description}
                    </span>
                  </button>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
