import type { Metadata } from "next";
import { SavedDashboardsPage } from "@/components/dashboard/SavedDashboardsPage";

export const metadata: Metadata = {
  title: "My Dashboards",
};

export default function DashboardsPage() {
  return <SavedDashboardsPage />;
}
