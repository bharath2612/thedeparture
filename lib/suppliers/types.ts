// The supplier abstraction. Every aggregator we onboard implements this one
// interface, so the rate-shop engine never has to know which supplier it is
// talking to. Adding a supplier = one new file that implements SupplierAdapter.

export interface SearchQuery {
  city: string;
  countryCode: string;
  checkin: string; // YYYY-MM-DD
  checkout: string;
  occupancies: { adults: number; children?: number[] }[];
  currency: string;
  guestNationality: string;
}

export interface NormalizedRate {
  supplier: string; // supplier code, e.g. "liteapi"
  supplierName: string; // display name
  offerId: string; // opaque, supplier-scoped; carried into prebook/book
  roomName: string;
  board: string;
  refundable: boolean;
  net: number; // net cost in the query currency (what we pay the supplier)
  currency: string;
}

export interface NormalizedHotel {
  supplier: string;
  supplierHotelId: string;
  mapKey: string; // cross-supplier identity (naive v1: name + city)
  name: string;
  city?: string;
  country?: string;
  stars?: number;
  thumbnail?: string;
  description?: string;
  cheapest: NormalizedRate; // cheapest rate this supplier offers for this hotel
  rates: NormalizedRate[];
}

export interface SupplierStatus {
  code: string;
  name: string;
  connected: boolean; // has a usable key / is live
  live: boolean; // actually returns rates today
  note: string;
}

export interface SupplierAdapter {
  code: string;
  name: string;
  status(): SupplierStatus;
  // Return [] (not throw) when not connected, so one supplier never breaks the shop.
  search(q: SearchQuery): Promise<NormalizedHotel[]>;
  prebook(offerId: string): Promise<{ prebookId: string; net: number; currency: string }>;
}

// Cross-supplier hotel identity. This is the hard part of multi-supplier: LiteAPI's
// hotelId != Rezlive's != TBO's, so to compare prices for "the same hotel" we need a
// mapping. v1 uses a normalized name+city key. A production build swaps this for a
// real mapping table (GIATA / Vervotech / Zentrum content mapping). Flagged, not hidden.
export function mapKey(name: string, city?: string): string {
  const norm = (s: string) =>
    (s || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\b(hotel|resort|the|and|suites|by|dubai|deluxe)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  return `${norm(name)}|${norm(city || "")}`;
}
