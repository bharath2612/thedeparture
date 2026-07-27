import "server-only";
import type { SupplierAdapter, SupplierStatus, SearchQuery, NormalizedHotel } from "./types";

// A ready-to-implement supplier. It's wired into the registry and shows on the
// /suppliers page as "not connected" until (a) its env key is set and (b) its
// search()/prebook() are implemented against the real API. This is what onboarding
// a new aggregator looks like: drop in the key, fill in two functions.

export function makeStubAdapter(opts: {
  code: string;
  name: string;
  envKey: string; // e.g. "REZLIVE_KEY"
  note: string; // what's needed to go live
}): SupplierAdapter {
  const connected = () => Boolean(process.env[opts.envKey]?.trim());

  function status(): SupplierStatus {
    return {
      code: opts.code,
      name: opts.name,
      connected: connected(),
      live: false, // flip to true once search() is implemented
      note: connected() ? `Key present. Adapter not yet implemented. ${opts.note}` : `Not connected. ${opts.note}`,
    };
  }

  // Never throws, a missing supplier must not break the shop.
  async function search(_q: SearchQuery): Promise<NormalizedHotel[]> {
    return [];
  }

  async function prebook(_offerId: string): Promise<{ prebookId: string; net: number; currency: string }> {
    throw new Error(`${opts.name} prebook not implemented yet`);
  }

  return { code: opts.code, name: opts.name, status, search, prebook };
}
