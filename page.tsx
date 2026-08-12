import type { Metadata } from "next";
import { DashboardViewer } from "@/components/dashboard/DashboardViewer";

export const metadata: Metadata = {
  title: "Dashboard | Fishing Forecast",
  description:
    "View a fishing dashboard with weather, wind, tides, waves, moon, and sun conditions.",
};

export default function DashboardViewPage() {
  return <DashboardViewer />;
}
