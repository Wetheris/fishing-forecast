import type { DashboardLayout } from "@/types/dashboard";

export function getLayoutContentHeight(
  layout: DashboardLayout,
): number {
  const visiblePlacements = layout.placements.filter(
    (placement) => !placement.hidden,
  );

  if (visiblePlacements.length === 0) {
    return layout.viewport.height;
  }

  const contentBottom = visiblePlacements.reduce(
    (maximum, placement) => {
      const rowBottom = placement.y + placement.h;
      const pixelBottom =
        layout.grid.padding * 2 +
        rowBottom * layout.grid.rowHeight +
        Math.max(0, rowBottom - 1) * layout.grid.gap;

      return Math.max(maximum, pixelBottom);
    },
    0,
  );

  return Math.max(
    layout.viewport.height,
    Math.ceil(contentBottom),
  );
}
