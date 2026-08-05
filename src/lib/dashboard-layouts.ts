import type {
  DashboardLayout,
  FishingDashboard,
  LayoutDevice,
  WidgetInstance,
  WidgetPlacement,
} from "@/types/dashboard";
import { mockSources } from "@/lib/mock-data";
import { getWidgetDefinition } from "@/widgets/registry";

export type LayoutPreset = {
  key: string;
  name: string;
  device: LayoutDevice;
  recommended?: boolean;
  width: number;
  height: number;
  columns: number;
  rowHeight: number;
  gap: number;
  padding: number;
};

export const layoutPresets: LayoutPreset[] = [
  {
    key: "desktop-1440x900",
    name: "1440 × 900",
    device: "desktop",
    recommended: true,
    width: 1440,
    height: 900,
    columns: 12,
    rowHeight: 72,
    gap: 16,
    padding: 24,
  },
  {
    key: "desktop-1366x768",
    name: "1366 × 768",
    device: "desktop",
    width: 1366,
    height: 768,
    columns: 12,
    rowHeight: 64,
    gap: 14,
    padding: 20,
  },
  {
    key: "desktop-1920x1080",
    name: "1920 × 1080",
    device: "desktop",
    width: 1920,
    height: 1080,
    columns: 12,
    rowHeight: 84,
    gap: 18,
    padding: 28,
  },
  {
    key: "mobile-390x844",
    name: "390 × 844",
    device: "mobile",
    recommended: true,
    width: 390,
    height: 844,
    columns: 4,
    rowHeight: 64,
    gap: 12,
    padding: 12,
  },
  {
    key: "mobile-393x852",
    name: "393 × 852",
    device: "mobile",
    width: 393,
    height: 852,
    columns: 4,
    rowHeight: 64,
    gap: 12,
    padding: 12,
  },
  {
    key: "mobile-360x800",
    name: "360 × 800",
    device: "mobile",
    width: 360,
    height: 800,
    columns: 4,
    rowHeight: 60,
    gap: 10,
    padding: 10,
  },
];

export function createInitialDashboard(): FishingDashboard {
  const initialKeys = [
    "current-temperature",
    "wind-speed",
    "next-high-tide",
    "hourly-forecast",
  ] as const;

  const widgets = initialKeys.map((key, index) =>
    createWidgetInstance(key, index),
  );

  return {
    id: "draft-dashboard",
    name: "Cape May Fishing",
    sources: mockSources,
    widgets,
    layouts: [
      createLayoutFromPreset(
        getRecommendedPreset("desktop"),
        widgets,
      ),
    ],
  };
}

export function createWidgetInstance(
  widgetKey: WidgetInstance["widgetKey"],
  sequence = Date.now(),
): WidgetInstance {
  const definition = getWidgetDefinition(widgetKey);
  const source = mockSources.find(
    (item) => item.kind === definition.sourceKind,
  );

  if (!source) {
    throw new Error(
      `No source available for ${definition.sourceKind}`,
    );
  }

  return {
    id: `${widgetKey}-${sequence}-${createRandomSuffix()}`,
    widgetKey,
    category: definition.category,
    sourceId: source.id,
    title: definition.defaultTitle,
    settings: { ...definition.defaultSettings },
  };
}

export function getRecommendedPreset(
  device: LayoutDevice,
): LayoutPreset {
  const preset = layoutPresets.find(
    (item) => item.device === device && item.recommended,
  );

  if (!preset) {
    throw new Error(`No recommended ${device} layout preset.`);
  }

  return preset;
}

export function createLayoutFromPreset(
  preset: LayoutPreset,
  widgets: WidgetInstance[],
): DashboardLayout {
  const base: DashboardLayout = {
    id: `${preset.device}-${createRandomSuffix()}`,
    name: preset.device === "desktop" ? "Desktop" : "Mobile",
    device: preset.device,
    enabled: true,
    presetKey: preset.key,
    viewport: {
      width: preset.width,
      height: preset.height,
    },
    grid: {
      columns: preset.columns,
      rowHeight: preset.rowHeight,
      gap: preset.gap,
      padding: preset.padding,
    },
    placements: [],
  };

  return {
    ...base,
    placements: widgets.reduce<WidgetPlacement[]>(
      (placements, widget) => [
        ...placements,
        createPlacement(widget, base, placements),
      ],
      [],
    ),
  };
}

export function createMobileLayoutFromDesktop(
  widgets: WidgetInstance[],
): DashboardLayout {
  return createLayoutFromPreset(
    getRecommendedPreset("mobile"),
    widgets,
  );
}

export function applyPreset(
  layout: DashboardLayout,
  preset: LayoutPreset,
): DashboardLayout {
  const next = {
    ...layout,
    presetKey: preset.key,
    viewport: {
      width: preset.width,
      height: preset.height,
    },
    grid: {
      columns: preset.columns,
      rowHeight: preset.rowHeight,
      gap: preset.gap,
      padding: preset.padding,
    },
  };

  return {
    ...next,
    placements: normalizePlacementsForLayout(
      next,
      layout.placements,
    ),
  };
}

export function addWidgetToLayout(
  layout: DashboardLayout,
  widget: WidgetInstance,
): DashboardLayout {
  return {
    ...layout,
    placements: [
      ...layout.placements,
      createPlacement(
        widget,
        layout,
        layout.placements,
      ),
    ],
  };
}

export function createPlacement(
  widget: WidgetInstance,
  layout: DashboardLayout,
  existing: WidgetPlacement[],
): WidgetPlacement {
  const definition = getWidgetDefinition(widget.widgetKey);
  const defaults = definition.defaultPlacement[layout.device];

  const w = Math.min(defaults.w, layout.grid.columns);
  const minW = Math.min(defaults.minW, w);
  const position = findAvailablePosition(
    existing,
    layout.grid.columns,
    w,
    defaults.h,
  );

  return {
    widgetId: widget.id,
    x: position.x,
    y: position.y,
    w,
    h: defaults.h,
    minW,
    minH: defaults.minH,
  };
}

export function autoArrangeLayout(
  layout: DashboardLayout,
  widgets: WidgetInstance[],
): DashboardLayout {
  const placements = widgets.reduce<WidgetPlacement[]>(
    (current, widget) => [
      ...current,
      createPlacement(widget, layout, current),
    ],
    [],
  );

  return {
    ...layout,
    placements,
  };
}

export function normalizePlacementsForLayout(
  layout: DashboardLayout,
  placements: WidgetPlacement[],
): WidgetPlacement[] {
  return placements.map((placement) => {
    const w = Math.min(
      Math.max(placement.minW, placement.w),
      layout.grid.columns,
    );
    const x = Math.min(
      Math.max(0, placement.x),
      Math.max(0, layout.grid.columns - w),
    );

    return {
      ...placement,
      x,
      w,
      minW: Math.min(placement.minW, w),
    };
  });
}

export function aspectRatioLabel(
  width: number,
  height: number,
): string {
  const divisor = greatestCommonDivisor(width, height);
  const ratioWidth = Math.round(width / divisor);
  const ratioHeight = Math.round(height / divisor);

  if (ratioWidth > 40 || ratioHeight > 40) {
    return `${(width / height).toFixed(2)}:1`;
  }

  return `${ratioWidth}:${ratioHeight}`;
}

function findAvailablePosition(
  placements: WidgetPlacement[],
  columns: number,
  width: number,
  height: number,
): { x: number; y: number } {
  for (let y = 0; y < 200; y += 1) {
    for (let x = 0; x <= columns - width; x += 1) {
      const candidate = { x, y, w: width, h: height };
      const collides = placements.some((placement) =>
        rectanglesOverlap(candidate, placement),
      );

      if (!collides) {
        return { x, y };
      }
    }
  }

  return {
    x: 0,
    y: placements.reduce(
      (maximum, placement) =>
        Math.max(maximum, placement.y + placement.h),
      0,
    ),
  };
}

function rectanglesOverlap(
  first: { x: number; y: number; w: number; h: number },
  second: { x: number; y: number; w: number; h: number },
): boolean {
  return !(
    first.x + first.w <= second.x ||
    second.x + second.w <= first.x ||
    first.y + first.h <= second.y ||
    second.y + second.h <= first.y
  );
}

function greatestCommonDivisor(
  first: number,
  second: number,
): number {
  let a = Math.abs(Math.round(first));
  let b = Math.abs(Math.round(second));

  while (b > 0) {
    [a, b] = [b, a % b];
  }

  return a || 1;
}

function createRandomSuffix(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    "randomUUID" in globalThis.crypto
  ) {
    return globalThis.crypto.randomUUID().slice(0, 8);
  }

  return Math.random().toString(16).slice(2, 10);
}
