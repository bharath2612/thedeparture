// The markup engine, the whole point of the business. LiteAPI hands us a net
// rate; we add K Global's margin on top and show ONE price. The net is never
// revealed to the traveller. Later this becomes per-agent / per-supplier rules
// pulled from the DB; for now it's a single config-driven percentage.

export function defaultMarkupPct(): number {
  const v = Number(process.env.DEFAULT_MARKUP_PCT);
  return Number.isFinite(v) && v >= 0 ? v : 15;
}

export interface Priced {
  net: number; // what we pay LiteAPI (retailRate.total)
  markupPct: number;
  markup: number; // margin in currency
  sell: number; // what the traveller pays
  currency: string;
}

export function priceUp(net: number, currency: string, markupPct = defaultMarkupPct()): Priced {
  const markup = round2(net * (markupPct / 100));
  return {
    net: round2(net),
    markupPct,
    markup,
    sell: round2(net + markup),
    currency,
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
  }
}
