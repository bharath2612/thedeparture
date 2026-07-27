import type { Metadata } from "next";
import "./globals.css";
import { apiKey, isLive } from "@/lib/liteapi";
import { SiteHeader } from "@/components/Bits";
import { resolveCurrency } from "@/lib/currency.server";

const SITE = "https://thedeparture.ai";

// The share card, in the order the platforms read it.
//
// WhatsApp is the fussiest target and the one that matters most here, so the
// image is a 1200x630 JPEG rather than WebP (WhatsApp renders WebP previews
// unreliably) and it is kept well under 300KB (past roughly that, WhatsApp
// quietly drops the large card for a thumbnail, or nothing). Absolute URLs are
// required, which is what metadataBase provides.
//
// og:description is deliberately short. WhatsApp shows about two lines before
// truncating, so the claim has to survive being cut off.
const SHARE_TITLE = "Flights and hotels at the lowest price";
const SHARE_DESC =
  "The lowest price we can find on flights and hotels, and a real person on every trip.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "The Departure · Flights and hotels at the lowest price",
  description:
    "We check every supplier we are connected to and get you the lowest price we can find on flights and hotels. A real person stays with the trip, round the clock.",
  icons: {
    icon: "/logo.png",
  },
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "The Departure",
    title: SHARE_TITLE,
    description: SHARE_DESC,
    locale: "en_IN",
    images: [
      {
        url: "/share.jpg",
        width: 1200,
        height: 630,
        type: "image/jpeg",
        alt: "The Departure. Flights and hotels at the lowest price.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: SHARE_DESC,
    images: ["/share.jpg"],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const live = isLive();
  const sandbox = apiKey().startsWith("sand");
  const currency = await resolveCurrency();
  return (
    <html lang="en">
      <body>
        <SiteHeader
          env={{ label: live ? "LIVE" : sandbox ? "SANDBOX" : "TEST", live }}
          currency={{ code: currency.code, source: currency.source }}
        />
        {children}
      </body>
    </html>
  );
}
