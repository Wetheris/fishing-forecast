import type { Metadata } from "next";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { MainMenu } from "@/components/navigation/MainMenu";
import { TideHawkBrand } from "@/components/navigation/TideHawkBrand";

export const metadata: Metadata = {
  title: {
    default: "TideHawk",
    template: "%s | TideHawk",
  },
  description:
    "TideHawk is a customizable fishing dashboard for weather, wind, tides, waves, moon, sun, fishing sessions, and catches.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <TideHawkBrand />
        <AuthProvider>
          {children}
          <MainMenu />
        </AuthProvider>
      </body>
    </html>
  );
}
