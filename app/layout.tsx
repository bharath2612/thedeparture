import type { Metadata } from "next";
import "./globals.css";
import { apiKey, isLive } from "@/lib/liteapi";
import { SiteHeader } from "@/components/Bits";
import { resolveCurrency } from "@/lib/currency.server";

export const metadata: Metadata = {
  title: "The Departure — smart travel, AI powered",
  description:
    "The booking platform that helps you book smarter and cheaper — and has your back 24/7. We rate-shop every supplier, sell the cheapest net, and put a named agent on every trip.",
  icons: {
    icon: "/logo.png",
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
