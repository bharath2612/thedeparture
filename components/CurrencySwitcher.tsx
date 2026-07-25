"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CURRENCIES, CURRENCY_COOKIE, CURRENCY_COOKIE_MAX_AGE, type CurrencyCode } from "@/lib/currency";

// Writes the choice to a cookie and refreshes so the server re-runs the search
// in that currency. It has to be a server round-trip, not a client-side format
// change: the price must come back priced by the supplier in that currency, not
// converted by us.

export default function CurrencySwitcher({
  current,
  source,
}: {
  current: CurrencyCode;
  source: "chosen" | "ip" | "default";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState<CurrencyCode>(current);

  function change(next: CurrencyCode) {
    setValue(next);
    document.cookie = `${CURRENCY_COOKIE}=${next}; path=/; max-age=${CURRENCY_COOKIE_MAX_AGE}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <label className="curswitch" title={source === "ip" ? "Set from your location" : undefined}>
      <span className="sr-only">Currency</span>
      <select
        value={value}
        disabled={pending}
        onChange={(e) => change(e.target.value as CurrencyCode)}
        aria-label="Currency"
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code}
          </option>
        ))}
      </select>
    </label>
  );
}
