import "server-only";
import { unstable_cache } from "next/cache";
import { shop } from "./rateshop";
import { shopFlights } from "./flightshop";
import type { ShoppedFlight } from "./flightshop";
import type { ShoppedHotel } from "./rateshop";

// Live data for the landing page.
//
// The showcase sections show REAL rate-shopped prices, not the mock's invented
// numbers, but a landing page cannot pay an API round-trip per visitor. Two
// protections:
//   1. unstable_cache with a TTL, so N visitors cost one supplier call.
//   2. the date is part of the cache key, so results roll over daily instead of
//      quietly going stale.
// LiteAPI's free tier is priced on look-to-book; speculative landing-page
// traffic is exactly what blows that ratio if left uncached.

const SHOWCASE_TTL = 900; // 15 min, the headline rows
const DEST_TTL = 21_600; // 6 h, "from" prices are indicative, not quotes

function isoDaysOut(days: number): string {
  return new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
}

const HOTEL_ADULTS = 2;

function nightsBetween(checkin: string, checkout: string): number {
  return Math.max(
    1,
    Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 864e5)
  );
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
  // A stay total is meaningless without the stay. "AED 1,370" reads as a
  // nightly rate and looks wrong; "AED 1,370 · 3 nights, 2 adults" reads as
  // what it is. The card needs these to say so.
  nights: number;
  adults: number;
  error?: string;
}

// A failure must never be cached.
//
// These wrappers used to catch inside the cached function and return an empty
// list. unstable_cache stores whatever the function returns, so one transient
// supplier hiccup was written to the cache and then served to every visitor for
// the whole TTL: fifteen minutes for the headline rows, SIX HOURS for the
// destination prices. That is exactly how the landing page ended up saying "No
// live rates right now" while /results returned twelve hotels for the same city
// and dates.
//
// Throwing instead means nothing is written and the next visitor retries. The
// cost is that a genuine outage is re-queried per request rather than once per
// TTL. That is the right way round: LiteAPI's look-to-book ratio is protected
// by caching SUCCESS, and there is no ratio to protect when the answer is
// empty.
class NoResults extends Error {}

// Bumping this abandons every existing entry immediately. Vercel's data cache
// survives deployments, so without it the poisoned entries above would keep
// being served until their own TTL expired, fix deployed or not.
const CACHE_VERSION = "v2";

function reason(e: unknown): string {
  return e instanceof NoResults ? e.message : String((e as Error)?.message || e);
}

const cachedFlights = unstable_cache(
  async (from: string, to: string, date: string, currency: string): Promise<ShowcaseFlights> => {
    const res = await shopFlights({
      origin: from,
      destination: to,
      departDate: date,
      adults: 1,
      cabin: "economy",
      currency,
    });
    if (res.flights.length === 0) {
      throw new NoResults(
        res.errors.length
          ? res.errors.map((e) => `${e.supplier}: ${e.message}`).join(" · ")
          : "No fares returned."
      );
    }
    return {
      route: { from, to, date },
      flights: res.flights.slice(0, 3),
      supplierCount: res.queried,
      liveSuppliers: res.suppliers.filter((s) => s.live).map((s) => s.name),
      error: res.errors.length ? res.errors.map((e) => `${e.supplier}: ${e.message}`).join(" · ") : undefined,
    };
  },
  ["showcase-flights", CACHE_VERSION],
  { revalidate: SHOWCASE_TTL, tags: ["showcase"] }
);

const cachedHotels = unstable_cache(
  async (
    city: string,
    country: string,
    checkin: string,
    checkout: string,
    currency: string
  ): Promise<ShowcaseHotels> => {
    const res = await shop({
      city,
      countryCode: country,
      checkin,
      checkout,
      occupancies: [{ adults: HOTEL_ADULTS }],
      currency,
      guestNationality: country,
    });
    if (res.hotels.length === 0) throw new NoResults("No rates returned for these dates.");
    return {
      city,
      hotels: res.hotels.slice(0, 3),
      supplierCount: res.queried,
      liveSuppliers: res.suppliers.filter((s) => s.live).map((s) => s.name),
      nights: nightsBetween(checkin, checkout),
      adults: HOTEL_ADULTS,
    };
  },
  ["showcase-hotels", CACHE_VERSION],
  { revalidate: SHOWCASE_TTL, tags: ["showcase"] }
);

const cachedDestination = unstable_cache(
  async (from: string, to: string, date: string, currency: string) => {
    const res = await shopFlights({
      origin: from,
      destination: to,
      departDate: date,
      adults: 1,
      cabin: "economy",
      currency,
    });
    const best = res.flights[0];
    // Null here would be cached for six hours, so a momentary blank turns into
    // "search fares" on the destination cards for the rest of the afternoon.
    if (!best) throw new NoResults("No fare returned.");
    return { sell: best.best.priced.sell, currency: best.best.priced.currency };
  },
  ["showcase-destination", CACHE_VERSION],
  { revalidate: DEST_TTL, tags: ["showcase"] }
);

// Currency is part of the cache key, so switching it can't serve a cached page
// still priced in the previous one.
export async function showcaseFlights(currency: string): Promise<ShowcaseFlights> {
  const route = { from: "DEL", to: "DXB", date: isoDaysOut(21) };
  try {
    return await cachedFlights(route.from, route.to, route.date, currency);
  } catch (e) {
    return { route, flights: [], supplierCount: 0, liveSuppliers: [], error: reason(e) };
  }
}

export async function showcaseHotels(currency: string): Promise<ShowcaseHotels> {
  const city = "Mumbai";
  const checkin = isoDaysOut(30);
  const checkout = isoDaysOut(33);
  try {
    return await cachedHotels(city, "IN", checkin, checkout, currency);
  } catch (e) {
    return {
      city,
      hotels: [],
      supplierCount: 0,
      liveSuppliers: [],
      nights: nightsBetween(checkin, checkout),
      adults: HOTEL_ADULTS,
      error: reason(e),
    };
  }
}

export interface DestinationCard {
  city: string;
  code: string;
  from: string; // origin IATA
  price: { sell: number; currency: string } | null;
  dur: string; // float animation duration, straight from the design
  image: string;
}

// The photograph belongs with the destination, not with the page: a card that
// shows a real price for Singapore should show Singapore. Adding a fourth
// destination without adding its image is the mistake to avoid, the type makes
// `image` required so that can't compile.
const DESTINATIONS = [
  { city: "Dubai", code: "DXB", dur: "6s", image: "/img/dest-DXB.webp" },
  { city: "Singapore", code: "SIN", dur: "7.5s", image: "/img/dest-SIN.webp" },
  { city: "London", code: "LHR", dur: "6.8s", image: "/img/dest-LHR.webp" },
];

export async function destinationCards(currency: string, origin = "DEL"): Promise<DestinationCard[]> {
  const date = isoDaysOut(28);
  // Per card, not per row: one destination with no fare must not blank the
  // other two, and its miss must not be cached.
  const prices = await Promise.all(
    DESTINATIONS.map((d) =>
      cachedDestination(origin, d.code, date, currency).catch(() => null)
    )
  );
  return DESTINATIONS.map((d, i) => ({ ...d, from: origin, price: prices[i] }));
}
