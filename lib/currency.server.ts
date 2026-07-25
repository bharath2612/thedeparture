import "server-only";
import { cookies, headers } from "next/headers";
import {
  CURRENCY_COOKIE,
  currencyForCountry,
  isSupportedCurrency,
  type ResolvedCurrency,
} from "./currency";

// Server-side currency resolution. Split out from lib/currency.ts because the
// client switcher imports the shared constants, and next/headers cannot be
// pulled into a client bundle.
//
// Order: explicit choice > IP country > env default. A cookie always wins, so
// once someone picks a currency we never second-guess them on a later request.
export async function resolveCurrency(): Promise<ResolvedCurrency> {
  const jar = await cookies();
  const chosen = jar.get(CURRENCY_COOKIE)?.value;
  if (isSupportedCurrency(chosen)) return { code: chosen, source: "chosen" };

  const h = await headers();
  // x-vercel-ip-country is set by Vercel's edge; cf-ipcountry by Cloudflare.
  // Neither exists in local dev, which is why the env default still matters.
  const country =
    h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || h.get("x-country-code") || null;
  if (country) return { code: currencyForCountry(country), source: "ip", country };

  const fallback = process.env.DEFAULT_CURRENCY;
  return { code: isSupportedCurrency(fallback) ? fallback : "USD", source: "default" };
}
