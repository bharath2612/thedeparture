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
const SHARE_TITLE = "The Departure · Flights and hotels at the lowest price";
// Short on purpose. WhatsApp truncates the description at roughly two lines,
// so the promise has to land before the cut rather than after it.
const SHARE_DESC = "Find flights and hotels at the lowest price. We've got your back 24/7.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "The Departure · Flights and hotels at the lowest price",
  description:
    "We check every supplier we are connected to and get you the lowest price we can find on flights and hotels. And we've got your back 24/7.",
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
    // suppressHydrationWarning because the script below writes data-sky onto
    // this element before React hydrates. Without it React sees an attribute
    // the server never rendered and warns on every load.
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Day or night, in the VIEWER's timezone, which only the client knows.
            Resolving this on the server would hand every visitor Hyderabad's
            sky, and resolving it in an effect would paint the wrong sky first
            and swap it after hydration. A blocking script as the first thing in
            the body runs before the band is parsed, so the correct sky is the
            only one ever painted.

            No JS means no attribute, and the CSS defaults to night. That is the
            deliberate choice: night is the darker palette, so a viewer who
            never gets the attribute still sees a sky that matches the rest of
            the dark page rather than a bright band stranded on it.

            ?sky=day / ?sky=night forces a mode, for previewing both without
            waiting twelve hours. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function s(){try{var f=new URLSearchParams(location.search).get('sky');var h=new Date().getHours();document.documentElement.setAttribute('data-sky',f==='day'||f==='night'?f:(h>=6&&h<18?'day':'night'))}catch(e){}}s();setInterval(s,6e5)})()`,
          }}
        />
        <SiteHeader
          env={{ label: live ? "LIVE" : sandbox ? "SANDBOX" : "TEST", live }}
          currency={{ code: currency.code, source: currency.source }}
        />
        {children}
      </body>
    </html>
  );
}
