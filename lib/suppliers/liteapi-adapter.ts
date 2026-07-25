import "server-only";
import {
  listHotels,
  getRates,
  prebook as liteApiPrebook,
  apiKey,
  type Hotel,
} from "@/lib/liteapi";
import type { NormalizedHotel, NormalizedRate, SearchQuery, SupplierAdapter, SupplierStatus } from "./types";
import { mapKey } from "./types";

const CODE = "liteapi";
const NAME = "LiteAPI";

function status(): SupplierStatus {
  const key = apiKey();
  const sandbox = key.startsWith("sand");
  return {
    code: CODE,
    name: NAME,
    connected: true,
    live: true,
    note: sandbox ? "Live on public sandbox (test rates)" : key.startsWith("prod") ? "Live (production)" : "Live",
  };
}

async function search(q: SearchQuery): Promise<NormalizedHotel[]> {
  const hotels: Hotel[] = await listHotels({ countryCode: q.countryCode, cityName: q.city, limit: 20 });
  if (!hotels.length) return [];
  const rates = await getRates({
    hotelIds: hotels.map((h) => h.id),
    checkin: q.checkin,
    checkout: q.checkout,
    occupancies: q.occupancies,
    currency: q.currency,
    guestNationality: q.guestNationality,
  });
  const byId = new Map(rates.map((r) => [r.hotelId, r]));

  const out: NormalizedHotel[] = [];
  for (const h of hotels) {
    const hr = byId.get(h.id);
    if (!hr) continue;
    const normRates: NormalizedRate[] = [];
    for (const rt of hr.roomTypes || []) {
      const rate = rt.rates?.[0];
      const total = rate?.retailRate?.total?.[0] || rt.offerRetailRate;
      if (!total) continue;
      normRates.push({
        supplier: CODE,
        supplierName: NAME,
        offerId: rt.offerId,
        roomName: rate?.name || "Room",
        board: rate?.boardName || "Room Only",
        refundable: rate?.cancellationPolicies?.refundableTag === "RFN",
        net: total.amount,
        currency: total.currency,
      });
    }
    if (!normRates.length) continue;
    normRates.sort((a, b) => a.net - b.net);
    out.push({
      supplier: CODE,
      supplierHotelId: h.id,
      mapKey: mapKey(h.name, h.city || q.city),
      name: h.name,
      city: h.city || q.city,
      country: h.country || q.countryCode,
      stars: Math.round(h.starRating || h.rating || 0) || undefined,
      thumbnail: h.main_photo || h.thumbnail,
      description: h.hotelDescription?.replace(/<[^>]+>/g, " ").slice(0, 220),
      cheapest: normRates[0],
      rates: normRates,
    });
  }
  return out;
}

async function prebook(offerId: string) {
  const pb = await liteApiPrebook(offerId);
  return { prebookId: pb.prebookId, net: pb.price, currency: pb.currency };
}

export const liteApiAdapter: SupplierAdapter = { code: CODE, name: NAME, status, search, prebook };
