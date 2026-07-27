import "server-only";
import { liteApiAdapter } from "./liteapi-adapter";
import type { NormalizedHotel, SearchQuery, SupplierAdapter, SupplierStatus } from "./types";

// SYNTHETIC. Not a real supplier. Enabled only with ENABLE_DEMO_SUPPLIER=true so
// you can SEE the rate-shop pick the cheapest across suppliers before Rezlive/TBO
// are keyed. It borrows LiteAPI's hotels and perturbs each net by a deterministic
// ±% so results are stable across reloads. Every price it returns is fake and it
// is labelled "DEMO-AGG (synthetic)" everywhere. Turn it off for anything real.

const CODE = "demo";
const NAME = "DEMO-AGG (synthetic)";

function enabled() {
  return process.env.ENABLE_DEMO_SUPPLIER === "true";
}

function status(): SupplierStatus {
  return {
    code: CODE,
    name: NAME,
    connected: enabled(),
    live: enabled(),
    note: enabled()
      ? "SYNTHETIC test supplier. Fake rates, for demonstrating the cheapest-picker only."
      : "Off. Set ENABLE_DEMO_SUPPLIER=true to visualise multi-supplier shopping.",
  };
}

// Deterministic per-hotel factor in roughly [-12%, +12%].
function factor(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return 1 + (((h % 240) - 120) / 1000); // 0.88 .. 1.12
}

async function search(q: SearchQuery): Promise<NormalizedHotel[]> {
  if (!enabled()) return [];
  const base = await liteApiAdapter.search(q);
  return base.map((h) => {
    const f = factor(h.supplierHotelId);
    const rates = h.rates.map((r) => ({
      ...r,
      supplier: CODE,
      supplierName: NAME,
      offerId: `demo::${r.offerId}`,
      net: Math.round(r.net * f * 100) / 100,
    }));
    rates.sort((a, b) => a.net - b.net);
    return { ...h, supplier: CODE, rates, cheapest: rates[0] };
  });
}

async function prebook(): Promise<{ prebookId: string; net: number; currency: string }> {
  throw new Error("DEMO-AGG is synthetic and cannot be booked.");
}

export const demoAdapter: SupplierAdapter = { code: CODE, name: NAME, status, search, prebook };
