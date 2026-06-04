import type { Metadata, Viewport } from "next";
import { Inter, VT323 } from "next/font/google";
import "./globals.css";
import { SITE_URL, SITE_NAME, SITE_SHORT_NAME, SITE_DESCRIPTION } from "@/lib/site";

// Inter — clean sans for headings, body, labels and controls.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

// VT323 — pixel/terminal monospace reserved for metrics and instrument readouts.
const vt323 = VT323({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-vt323",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_SHORT_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "PSU Gang" }],
  creator: "PSU Gang",
  publisher: "PSU Gang",
  category: "technology",
  keywords: [
    "calculadora fuente de poder",
    "calculadora PSU",
    "watts PC",
    "consumo PC gamer",
    "fuente de poder recomendada",
    "PSU calculator",
    "ATX 3.0",
    "ATX 3.x",
    "PSU Gang",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SITE_SHORT_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: "#141414",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.variable} ${vt323.variable}`}>
      <body>{children}</body>
    </html>
  );
}
