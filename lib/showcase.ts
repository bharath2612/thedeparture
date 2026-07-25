import "server-only";
import { unstable_cache } from "next/cache";
import { shop } from "./rateshop";
import { shopFlights } from "./flightshop";
import type { ShoppedFlight } from "./flightshop";
import type { ShoppedHotel } from "./rateshop";

// Live data for the landing page.
//
// The showcase sections show REAL rate-shopped prices, not the mock's invented
// numbers — but a landing page cannot pay an API round-trip per visitor. Two
// protections:
//   1. unstable_cache with a TTL, so N visitors cost one supplier call.
//   2. the date is part of the cache key, so results roll over daily instead of
//      quietly going stale.
// LiteAPI's free tier is priced on look-to-book; speculative landing-page
// traffic is exactly what blows that ratio if left uncached.

const SHOWCASE_TTL = 900; // 15 min — the headline rows
const DEST_TTL = 21_600; // 6 h — "from" prices are indicative, not quotes

function isoDaysOut(days: number): string {
  return new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
}

export interface ShowcaseFlights {
  route: { from: string; to: string; date: string };
  flights: ShoppedFlight[];
  supplierCount: number;
  liveSuppliers: string[];
  error?: string;
}

export interface ShowcaseHotels {
  city: string;
  hotels: ShoppedHotel[];
  supplierCount: number;
  liveSuppliers: string[];
  error?: string;
}

const cachedFlights = unstable_cache(
  async (from: string, to: string, date: string): Promise<ShowcaseFlights> => {
    try {
      const res = await shopFlights({
        origin: from,
        destination: to,
        departDate: date,
        adults: 1,
        cabin: "economy",
      });
      return {
        route: { from, to, date },
        flights: res.flights.slice(0, 3),
        supplierCount: res.queried,
        liveSuppliers: res.suppliers.filter((s) => s.live).map((s) => s.name),
        error: res.errors.length ? res.errors.map((e) => `${e.supplier}: ${e.message}`).join(" · ") : undefined,
      };
    } catch (e) {
      return {
        route: { from, to, date },
        flights: [],
        supplierCount: 0,
        liveSuppliers: [],
        error: String((e as Error).message || e),
      };
    }
  },
  ["showcase-flights"],
  { revalidate: SHOWCASE_TTL, tags: ["showcase"] }
);

const cachedHotels = unstable_cache(
  async (city: string, country: string, checkin: string, checkout: string): Promise<ShowcaseHotels> => {
    try {
      const res = await shop({
        city,
        countryCode: country,
        checkin,
        checkout,
        occupancies: [{ adults: 2 }],
        currency: process.env.DEFAULT_CURRENCY || "AED",
        guestNationality: country,
      });
      return {
        city,
        hotels: res.hotels.slice(0, 3),
        supplierCount: res.queried,
        liveSuppliers: res.suppliers.filter((s) => s.live).map((s) => s.name),
      };
    } catch (e) {
      return { city, hotels: [], supplierCount: 0, liveSuppliers: [], error: String((e as Error).message || e) };
    }
  },
  ["showcase-hotels"],
  { revalidate: SHOWCASE_TTL, tags: ["showcase"] }
);

const cachedDestination = unstable_cache(
  async (from: string, to: string, date: string) => {
    try {
      const res = await shopFlights({
        origin: from,
        destination: to,
        departDate: date,
        adults: 1,
        cabin: "economy",
      });
      const best = res.flights[0];
      return best ? { sell: best.best.priced.sell, currency: best.best.priced.currency } : null;
    } catch {
      return null;
    }
  },
  ["showcase-destination"],
  { revalidate: DEST_TTL, tags: ["showcase"] }
);

export function showcaseFlights() {
  return cachedFlights("DEL", "DXB", isoDaysOut(21));
}

export function showcaseHotels() {
  return cachedHotels("Mumbai", "IN", isoDaysOut(30), isoDaysOut(33));
}

export interface DestinationCard {
  city: string;
  code: string;
  from: string; // origin IATA
  price: { sell: number; currency: string } | null;
  dur: string; // float animation duration, straight from the design
}

const DESTINATIONS = [
  { city: "Dubai", code: "DXB", dur: "6s" },
  { city: "Singapore", code: "SIN", dur: "7.5s" },
  { city: "London", code: "LHR", dur: "6.8s" },
];

export async function destinationCards(origin = "DEL"): Promise<DestinationCard[]> {
  const date = isoDaysOut(28);
  const prices = await Promise.all(DESTINATIONS.map((d) => cachedDestination(origin, d.code, date)));
  return DESTINATIONS.map((d, i) => ({ ...d, from: origin, price: prices[i] }));
}
