import type { DashboardThemeKey } from "@/types/dashboard";

export type DashboardThemeDefinition = {
  key: DashboardThemeKey;
  name: string;
  description: string;
  swatches: [string, string, string];
};

export const dashboardThemes: DashboardThemeDefinition[] = [
  {
    key: "light",
    name: "Light",
    description: "Clean, bright, and easy to read.",
    swatches: ["#f7fafb", "#ffffff", "#087f8c"],
  },
  {
    key: "dark",
    name: "Dark",
    description: "Low-glare charcoal surfaces.",
    swatches: ["#091216", "#142229", "#54d6e4"],
  },
  {
    key: "neon",
    name: "Neon",
    description: "Electric lime and cyan on black.",
    swatches: ["#050709", "#101417", "#9cff00"],
  },
  {
    key: "future",
    name: "Future",
    description: "Deep blue glass with violet accents.",
    swatches: ["#080b1c", "#151a35", "#8b7cff"],
  },
  {
    key: "beach",
    name: "Beach",
    description: "Warm sand, sea glass, and coral.",
    swatches: ["#f7efd9", "#fffaf0", "#008b8b"],
  },
  {
    key: "sunset",
    name: "Sunset",
    description: "Plum skies with warm orange highlights.",
    swatches: ["#241329", "#3a2040", "#ff9f43"],
  },
];
