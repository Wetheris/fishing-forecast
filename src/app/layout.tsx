import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
