import type { Metadata } from "next";
import { DashboardBuilder } from "@/components/dashboard/DashboardBuilder";

export const metadata: Metadata = {
  title: "Dashboard Builder",
};

export default function BuildDashboardPage() {
  return <DashboardBuilder />;
}
