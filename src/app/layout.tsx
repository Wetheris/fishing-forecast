import type { Metadata } from "next";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { MainMenu } from "@/components/navigation/MainMenu";

export const metadata: Metadata = {
  title: {
    default: "Fishing Forecast",
    template: "%s | Fishing Forecast",
  },
  description:
    "Build a customizable fishing dashboard with weather, wind, tides, waves, moon, and sun widgets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <MainMenu />
        </AuthProvider>
      </body>
    </html>
  );
}
