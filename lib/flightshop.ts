import "server-only";
import { activeFlightSuppliers, getFlightSupplier } from "./flights/registry";
import type {
  FlightQuery,
  FlightSupplierStatus,
  NormalizedFlightOffer,
} from "./flights/types";
import { priceUp, defaultMarkupPct, type Priced } from "./markup";

// The flight rate-shop — the air twin of lib/rateshop.ts.
//
// Two things make it different from hotels, and both are in our favour:
//
//  1. Identity is EXACT. "EK 512 on 2026-08-19 in economy" means the same seat
//     at every supplier, so cheapest-of-N on air is a real comparison, not the
//     fuzzy name-matching we have to do on hotels.
//  2. Fulfilment is gated. A supplier can be cheapest and still unable to issue
//     the ticket (Amadeus Self-Service). So we track the cheapest offer AND the
//     cheapest BOOKABLE offer separately and never offer Book on one that can't
//     be issued.

export interface FlightQuote {
  supplier: string;
  supplierName: string;
  net: number;
  currency: string;
  bookable: boolean;
  offerId: string;
}

export interface ShoppedFlight {
  itineraryKey: string;
  ownerIata: string;
  ownerName: string;
  slices: NormalizedFlightOffer["slices"];
  checkedBags: number;
  refundable?: boolean;
  expiresAt?: string;
  best: NormalizedFlightOffer & { priced: Priced }; // cheapest across all suppliers
  bestBookable?: NormalizedFlightOffer & { priced: Priced }; // cheapest that can actually issue
  quotes: FlightQuote[]; // every supplier that priced this itinerary, cheapest→dearest
  supplierCount: number;
  savingVsNext?: number;
  // False when suppliers quoted this itinerary in DIFFERENT currencies. We have
  // no FX source, so we refuse to claim a saving we cannot prove.
  comparable: boolean;
}

export interface FlightShopResult {
  flights: ShoppedFlight[];
  suppliers: FlightSupplierStatus[];
  queried: number;
  markupPct: number;
  errors: { supplier: string; message: string }[];
}

export async function shopFlights(q: FlightQuery): Promise<FlightShopResult> {
  const adapters = activeFlightSuppliers();
  const markupPct = defaultMarkupPct();

  // Parallel fan-out. A supplier that throws is reported, never breaks the shop.
  const settled = await Promise.allSettled(adapters.map((a) => a.search(q)));
  const errors: { supplier: string; message: string }[] = [];
  const all: NormalizedFlightOffer[] = [];
  settled.forEach((s, i) => {
    if (s.status === "fulfilled") all.push(...s.value);
    else errors.push({ supplier: adapters[i].name, message: String(s.reason?.message || s.reason) });
  });

  // Group every supplier's offers by exact itinerary identity.
  const groups = new Map<string, NormalizedFlightOffer[]>();
  for (const o of all) {
    const g = groups.get(o.itineraryKey) || [];
    g.push(o);
    groups.set(o.itineraryKey, g);
  }

  const flights: ShoppedFlight[] = [];
  for (const [key, group] of groups) {
    // Keep only each supplier's own cheapest quote for this itinerary.
    const bySupplier = new Map<string, NormalizedFlightOffer>();
    for (const o of group) {
      const prev = bySupplier.get(o.supplier);
      if (!prev || o.net < prev.net) bySupplier.set(o.supplier, o);
    }
    const perSupplier = [...bySupplier.values()];

    const currencies = new Set(perSupplier.map((o) => o.currency));
    const comparable = currencies.size === 1;

    // Cross-currency nets are not comparable. Rather than invent an FX rate,
    // rank within the query currency when one supplier quotes it, else fall
    // back to the first supplier — and flag the group as not comparable so the
    // UI never prints a "you saved X" it cannot stand behind.
    const rankable = comparable
      ? perSupplier
      : perSupplier.filter((o) => o.currency === (q.currency || perSupplier[0].currency));
    const pool = rankable.length ? rankable : perSupplier;

    const sorted = [...pool].sort((a, b) => a.net - b.net);
    const winner = sorted[0];
    const bookableWinner = sorted.find((o) => o.bookable);

    const quotes: FlightQuote[] = perSupplier
      .map((o) => ({
        supplier: o.supplier,
        supplierName: o.supplierName,
        net: o.net,
        currency: o.currency,
        bookable: o.bookable,
        offerId: o.offerId,
      }))
      .sort((a, b) => a.net - b.net);

    flights.push({
      itineraryKey: key,
      ownerIata: winner.ownerIata,
      ownerName: winner.ownerName,
      slices: winner.slices,
      checkedBags: winner.checkedBags,
      refundable: winner.refundable,
      expiresAt: winner.expiresAt,
      best: { ...winner, priced: priceUp(winner.net, winner.currency, markupPct) },
      bestBookable: bookableWinner
        ? { ...bookableWinner, priced: priceUp(bookableWinner.net, bookableWinner.currency, markupPct) }
        : undefined,
      quotes,
      supplierCount: quotes.length,
      savingVsNext:
        comparable && sorted.length > 1
          ? Math.round((sorted[1].net - sorted[0].net) * 100) / 100
          : undefined,
      comparable,
    });
  }

  // Cheapest sell first. Bag-aware ranking is a FILTER, not a fudge factor: we
  // never guess what an airline charges for a bag, we just let the traveller
  // require one and re-rank what actually includes it.
  flights.sort((a, b) => a.best.priced.sell - b.best.priced.sell);

  return {
    flights,
    suppliers: adapters.map((a) => a.status()),
    queried: adapters.length,
    markupPct,
    errors,
  };
}

// The VFR differentiator from the plan: a fare that looks cheapest on the
// headline is not cheapest for someone flying 40kg of gifts home. Metasearch
// does not price bags; we at least let you demand them.
export function requireCheckedBags(flights: ShoppedFlight[], min: number): ShoppedFlight[] {
  if (min <= 0) return flights;
  return flights.filter((f) => f.checkedBags >= min);
}

export function priceCheckVia(supplier: string, offerId: string) {
  const a = getFlightSupplier(supplier);
  if (!a) throw new Error(`Unknown flight supplier: ${supplier}`);
  return a.priceCheck(offerId);
}
