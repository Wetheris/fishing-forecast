import type { Metadata } from "next";
import { SessionDetailPage } from "@/components/sessions/SessionDetailPage";

export const metadata: Metadata = {
  title: "Fishing Session",
};

export default function Page() {
  return <SessionDetailPage />;
}
