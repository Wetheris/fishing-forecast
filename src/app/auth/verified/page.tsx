import type { Metadata } from "next";
import { VerifiedEmailPage } from "@/components/auth/VerifiedEmailPage";

export const metadata: Metadata = {
  title: "Email Verified",
};

export default function Page() {
  return <VerifiedEmailPage />;
}
