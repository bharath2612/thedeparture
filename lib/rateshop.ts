import "server-only";
import { activeSuppliers, getSupplier } from "./suppliers/registry";
import type { NormalizedHotel, NormalizedRate, SearchQuery, SupplierStatus } from "./suppliers/types";
import { priceUp, defaultMarkupPct, type Priced } from "./markup";

// The rate-shop. Query every active supplier in parallel, group their results by
// cross-supplier hotel identity (mapKey), and for each hotel pick the CHEAPEST net
// across all suppliers. That winning net is what we mark up. This is the platform.

export interface SupplierQuote {
  supplier: string;
  supplierName: string;
  net: number;
  currency: string;
}

export interface ShoppedRate extends NormalizedRate {
  priced: Priced;
}

export interface ShoppedHotel {
  mapKey: string;
  name: string;
  city?: string;
  country?: string;
  stars?: number;
  thumbnail?: string;
  description?: string;
  best: ShoppedRate; // cheapest rate across ALL suppliers, marked up
  quotes: SupplierQuote[]; // every supplier that priced this hotel, cheapest→dearest
  supplierCount: number;
  savingVsNext?: number; // how much the winner beats the 2nd-cheapest supplier by
}

export interface ShopResult {
  hotels: ShoppedHotel[];
  suppliers: SupplierStatus[]; // statuses of all active suppliers this run
  queried: number; // how many suppliers were queried
  markupPct: number;
}

export async function shop(q: SearchQuery): Promise<ShopResult> {
  const adapters = activeSuppliers();
  const markupPct = defaultMarkupPct();

  // Parallel fan-out. A supplier that throws is skipped, never breaks the shop.
  const settled = await Promise.allSettled(adapters.map((a) => a.search(q)));
  const perSupplier: NormalizedHotel[][] = settled.map((s) => (s.status === "fulfilled" ? s.value : []));

  // Group every supplier's hotels by mapKey.
  const groups = new Map<string, NormalizedHotel[]>();
  for (const list of perSupplier) {
    for (const h of list) {
      const g = groups.get(h.mapKey) || [];
      g.push(h);
      groups.set(h.mapKey, g);
    }
  }

  const hotels: ShoppedHotel[] = [];
  for (const [key, group] of groups) {
    // One cheapest rate per supplier for this hotel.
    const quotes: SupplierQuote[] = group
      .map((h) => ({
        supplier: h.supplier,
        supplierName: h.cheapest.supplierName,
        net: h.cheapest.net,
        currency: h.cheapest.currency,
      }))
      .sort((a, b) => a.net - b.net);

    // The winning supplier's cheapest rate is the one we sell.
    const winner = group.reduce((a, b) => (b.cheapest.net < a.cheapest.net ? b : a));
    const winRate = winner.cheapest;
    const meta = group[0];

    hotels.push({
      mapKey: key,
      name: meta.name,
      city: meta.city,
      country: meta.country,
      stars: group.find((h) => h.stars)?.stars,
      thumbnail: group.find((h) => h.thumbnail)?.thumbnail,
      description: group.find((h) => h.description)?.description,
      best: { ...winRate, priced: priceUp(winRate.net, winRate.currency, markupPct) },
      quotes,
      supplierCount: quotes.length,
      savingVsNext: quotes.length > 1 ? Math.round((quotes[1].net - quotes[0].net) * 100) / 100 : undefined,
    });
  }

  hotels.sort((a, b) => a.best.priced.sell - b.best.priced.sell);

  return {
    hotels,
    suppliers: adapters.map((a) => a.status()),
    queried: adapters.length,
    markupPct,
  };
}

// Detail view: shop a city, return the one hotel matching mapKey with EVERY room
// from EVERY supplier, cheapest first, each tagged with who supplied it.
export async function shopHotel(
  q: SearchQuery,
  key: string
): Promise<{ hotel: ShoppedHotel | null; rooms: ShoppedRate[]; suppliers: SupplierStatus[] }> {
  const adapters = activeSuppliers();
  const markupPct = defaultMarkupPct();
  const settled = await Promise.allSettled(adapters.map((a) => a.search(q)));
  const all = settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));
  const group = all.filter((h) => h.mapKey === key);
  const suppliers = adapters.map((a) => a.status());
  if (!group.length) return { hotel: null, rooms: [], suppliers };

  const rooms: ShoppedRate[] = group
    .flatMap((h) => h.rates)
    .map((r) => ({ ...r, priced: priceUp(r.net, r.currency, markupPct) }))
    .sort((a, b) => a.priced.sell - b.priced.sell);

  // Build the hotel summary from the group we already have (no second fan-out).
  const quotes: SupplierQuote[] = group
    .map((h) => ({
      supplier: h.supplier,
      supplierName: h.cheapest.supplierName,
      net: h.cheapest.net,
      currency: h.cheapest.currency,
    }))
    .sort((a, b) => a.net - b.net);
  const winner = group.reduce((a, b) => (b.cheapest.net < a.cheapest.net ? b : a));
  const meta = group[0];
  const hotel: ShoppedHotel = {
    mapKey: key,
    name: meta.name,
    city: meta.city,
    country: meta.country,
    stars: group.find((h) => h.stars)?.stars,
    thumbnail: group.find((h) => h.thumbnail)?.thumbnail,
    description: group.find((h) => h.description)?.description,
    best: { ...winner.cheapest, priced: priceUp(winner.cheapest.net, winner.cheapest.currency, markupPct) },
    quotes,
    supplierCount: quotes.length,
    savingVsNext: quotes.length > 1 ? Math.round((quotes[1].net - quotes[0].net) * 100) / 100 : undefined,
  };
  return { hotel, rooms, suppliers };
}

export function prebookVia(supplier: string, offerId: string) {
  const a = getSupplier(supplier);
  if (!a) throw new Error(`Unknown supplier: ${supplier}`);
  return a.prebook(offerId);
}
