// Currency selection, the shared, environment-free half.
//
// This file is imported by the client switcher, so it must NOT pull in
// next/headers. Server-side resolution lives in lib/currency.server.ts.
//
// The important constraint: we do NOT convert prices. A supplier quote is only
// shown in a currency that supplier actually priced in. Where the API accepts a
// currency (LiteAPI does), we ask for the selected one and get a native quote.
// Where it doesn't (Duffel prices in the airline's/account's currency), the
// offer is displayed in its own currency and labelled as such.
//
// Applying our own FX rate would mean inventing a number, then charging a
// traveller against it, the rate would be stale by the time they paid, and any
// gap comes out of the margin. If we want a single display currency across all
// suppliers, that needs a real FX source with a timestamp shown, and a decision
// about who wears the spread. That's a business call, not a formatting one.

export const CURRENCIES = [
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "AED", symbol: "AED", label: "UAE Dirham" },
  { code: "USD", symbol: "$", label: "US Dollar" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const CURRENCY_COOKIE = "td_currency";
export const CURRENCY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isSupportedCurrency(v: string | undefined | null): v is CurrencyCode {
  return !!v && CURRENCIES.some((c) => c.code === v);
}

// Deliberately narrow. The GCC neighbours fall through to USD rather than being
// shown AED, because a Saudi buyer seeing dirhams is a guess dressed up as a
// localisation. Add SAR/QAR properly when there's demand.
export function currencyForCountry(country: string | null | undefined): CurrencyCode {
  const c = (country || "").toUpperCase();
  if (c === "IN") return "INR";
  if (c === "AE") return "AED";
  return "USD";
}

export interface ResolvedCurrency {
  code: CurrencyCode;
  source: "chosen" | "ip" | "default";
  country?: string;
}
