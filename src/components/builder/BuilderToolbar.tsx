"use client";

import type {
  DashboardLayout,
  DashboardSource,
  LayoutDevice,
  WidgetInstance,
  WidgetPlacement,
} from "@/types/dashboard";
import type { WeatherLocationSelection } from "@/types/geocoding";
import type { WidgetDefinition } from "@/widgets/types";
import { LayoutPanel } from "@/components/builder/LayoutPanel";
import { WidgetLibraryPanel } from "@/components/builder/WidgetLibraryPanel";
import { SourcesPanel } from "@/components/builder/SourcesPanel";
import { SelectedWidgetPanel } from "@/components/builder/SelectedWidgetPanel";

export type BuilderPanel =
  | "layouts"
  | "widgets"
  | "sources"
  | "selected";

export function BuilderToolbar({
  panel,
  onPanelChange,
  layouts,
  activeLayout,
  sources,
  selectedWidget,
  selectedPlacement,
  onSelectLayout,
  onCreateLayout,
  onDeleteLayout,
  onApplyLayoutPreset,
  onUpdateLayout,
  onResetLayout,
  onAddWidget,
  onWeatherLocationChange,
  onUpdateWidget,
  onUpdatePlacement,
  onDuplicateWidget,
  onRemoveWidget,
}: {
  panel: BuilderPanel;
  onPanelChange: (panel: BuilderPanel) => void;
  layouts: DashboardLayout[];
  activeLayout: DashboardLayout;
  sources: DashboardSource[];
  selectedWidget?: WidgetInstance;
  selectedPlacement?: WidgetPlacement;
  onSelectLayout: (layoutId: string) => void;
  onCreateLayout: (device: LayoutDevice) => void;
  onDeleteLayout: (layoutId: string) => void;
  onApplyLayoutPreset: (presetKey: string) => void;
  onUpdateLayout: (
    updates: Partial<DashboardLayout>,
  ) => void;
  onResetLayout: () => void;
  onAddWidget: (definition: WidgetDefinition) => void;
  onWeatherLocationChange: (
    location: WeatherLocationSelection,
  ) => void;
  onUpdateWidget: (
    updates: Partial<WidgetInstance>,
  ) => void;
  onUpdatePlacement: (
    updates: Partial<WidgetPlacement>,
  ) => void;
  onDuplicateWidget: () => void;
  onRemoveWidget: () => void;
}) {
  return (
    <aside className="flex min-h-0 w-full flex-col border-r border-[var(--border)] bg-white lg:w-[360px] lg:shrink-0">
      <nav className="grid grid-cols-4 border-b border-[var(--border)] p-2">
        <PanelButton
          active={panel === "layouts"}
          onClick={() => onPanelChange("layouts")}
        >
          Layouts
        </PanelButton>
        <PanelButton
          active={panel === "widgets"}
          onClick={() => onPanelChange("widgets")}
        >
          Widgets
        </PanelButton>
        <PanelButton
          active={panel === "sources"}
          onClick={() => onPanelChange("sources")}
        >
          Sources
        </PanelButton>
        <PanelButton
          active={panel === "selected"}
          onClick={() => onPanelChange("selected")}
        >
          Selected
        </PanelButton>
      </nav>

      <div className="builder-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        {panel === "layouts" ? (
          <LayoutPanel
            layouts={layouts}
            activeLayout={activeLayout}
            onSelectLayout={onSelectLayout}
            onCreateLayout={onCreateLayout}
            onDeleteLayout={onDeleteLayout}
            onApplyPreset={onApplyLayoutPreset}
            onUpdateLayout={onUpdateLayout}
            onResetLayout={onResetLayout}
          />
        ) : null}

        {panel === "widgets" ? (
          <WidgetLibraryPanel onAddWidget={onAddWidget} />
        ) : null}

        {panel === "sources" ? (
          <SourcesPanel
            sources={sources}
            onWeatherLocationChange={
              onWeatherLocationChange
            }
          />
        ) : null}

        {panel === "selected" ? (
          <SelectedWidgetPanel
            widget={selectedWidget}
            placement={selectedPlacement}
            activeLayout={activeLayout}
            sources={sources}
            onUpdateWidget={onUpdateWidget}
            onUpdatePlacement={onUpdatePlacement}
            onDuplicate={onDuplicateWidget}
            onRemove={onRemoveWidget}
          />
        ) : null}
      </div>
    </aside>
  );
}

function PanelButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-lg px-2 py-2 text-xs",
        active
          ? "bg-[var(--surface-muted)] font-medium text-[var(--foreground)]"
          : "text-[var(--muted)] hover:bg-[var(--surface-muted)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
