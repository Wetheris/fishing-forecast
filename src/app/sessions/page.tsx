import type { Metadata } from "next";
import { SessionsPage } from "@/components/sessions/SessionsPage";

export const metadata: Metadata = {
  title: "Fishing Sessions",
};

export default function Page() {
  return <SessionsPage />;
}
