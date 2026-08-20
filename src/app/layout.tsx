import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import "./brand.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { MainMenu } from "@/components/navigation/MainMenu";
import { TideHawkBrand } from "@/components/navigation/TideHawkBrand";

const SITE_URL = "https://tidehawk.app";
const SITE_DESCRIPTION =
  "TideHawk is a customizable fishing forecast and dashboard for weather, wind, tides, waves, moon phases, sunrise and sunset, marine conditions, fishing sessions, and catches.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "TideHawk",
  title: {
    default: "TideHawk | Fishing Weather, Tides & Marine Forecast",
    template: "%s | TideHawk",
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  keywords: [
    "TideHawk",
    "fishing forecast",
    "fishing weather",
    "fishing conditions",
    "tide forecast",
    "fishing tides",
    "wind forecast for fishing",
    "marine forecast",
    "surf fishing forecast",
    "fishing moon phase",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "TideHawk",
    title: "TideHawk | Fishing Weather, Tides & Marine Forecast",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: "TideHawk | Fishing Weather, Tides & Marine Forecast",
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "TideHawk",
  url: SITE_URL,
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web",
  description: SITE_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <TideHawkBrand />
        <AuthProvider>
          {children}
          <MainMenu />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
