import "server-only";
import {
  itineraryKey,
  parseIsoDuration,
  type FlightQuery,
  type FlightSegment,
  type FlightSlice,
  type FlightSupplierAdapter,
  type FlightSupplierStatus,
  type NormalizedFlightOffer,
} from "./types";

// Amadeus Self-Service, SHOP-ONLY, and as of 17 July 2026, CLOSED.
//
// Amadeus decommissioned the self-service developer portal on 2026-07-17:
// new registration is shut and existing keys are disabled. Only the Enterprise
// portal survives, and that needs a contract and an account manager, not a
// self-serve key. So this adapter is kept for one reason: anyone holding a
// still-valid legacy key can keep shopping with it, and the code is already in
// place if we ever land an Enterprise contract.
//
// Do not plan on getting a new key here. Duffel is the self-serve path now.
//
// It was never able to issue a ticket in any case, Self-Service has no
// ticketing authority, so `bookable` is false and it implements no book().
//
// Auth is OAuth2 client-credentials; the token lives ~30 min so we cache it.

const CODE = "amadeus";
const NAME = "Amadeus Self-Service";

function creds() {
  return {
    id: (process.env.AMADEUS_CLIENT_ID || "").trim(),
    secret: (process.env.AMADEUS_CLIENT_SECRET || "").trim(),
    // Self-Service has two hosts: test.api.amadeus.com (free quota, cached
    // test data) and api.amadeus.com (production). Default to test.
    host: (process.env.AMADEUS_HOST || "test.api.amadeus.com").trim(),
  };
}

function hasAmadeus(): boolean {
  const c = creds();
  return Boolean(c.id && c.secret);
}

function status(): FlightSupplierStatus {
  const connected = hasAmadeus();
  return {
    code: CODE,
    name: NAME,
    connected,
    live: connected,
    bookable: false, // structural: Self-Service has no ticketing authority
    note: connected
      ? `Legacy key in use (${creds().host.startsWith("test") ? "test" : "production"}). SHOP ONLY, cannot issue tickets. Portal closed 17 Jul 2026; this key will stop working.`
      : "CLOSED. Amadeus decommissioned the self-service portal on 17 Jul 2026. No new keys. Use Duffel, or an Amadeus Enterprise contract.",
  };
}

let tokenCache: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 30_000) return tokenCache.token;
  const c = creds();
  const res = await fetch(`https://${c.host}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: c.id,
      client_secret: c.secret,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Amadeus auth ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: j.access_token, expiresAt: now + (j.expires_in || 1800) * 1000 };
  return j.access_token;
}

interface AmadeusSegment {
  departure: { iataCode: string; at: string };
  arrival: { iataCode: string; at: string };
  carrierCode: string;
  number: string;
  aircraft?: { code?: string };
  duration?: string;
}

interface AmadeusOffer {
  id: string;
  price: { total: string; currency: string };
  itineraries: { duration?: string; segments: AmadeusSegment[] }[];
  travelerPricings?: {
    fareDetailsBySegment?: {
      cabin?: string;
      includedCheckedBags?: { quantity?: number; weight?: number };
    }[];
  }[];
}

function normalize(o: AmadeusOffer, carriers: Record<string, string>): NormalizedFlightOffer | null {
  if (!o.itineraries?.length) return null;
  const fares = o.travelerPricings?.[0]?.fareDetailsBySegment || [];
  // Amadeus reports bags per fare-segment in itinerary order; walk a flat index.
  let idx = 0;
  const bagAt = (i: number) => {
    const b = fares[i]?.includedCheckedBags;
    // `weight`-based allowances (common on Gulf–India) carry no piece count.
    // Report 1 piece so a 30kg allowance is not shown as "no bag", and rely on
    // the fare rules for the exact weight.
    if (!b) return 0;
    if (typeof b.quantity === "number") return b.quantity;
    return b.weight ? 1 : 0;
  };

  const slices: FlightSlice[] = o.itineraries.map((it) => {
    const segments: FlightSegment[] = it.segments.map((g) => {
      const i = idx++;
      return {
        carrier: g.carrierCode,
        carrierName: carriers[g.carrierCode] || g.carrierCode,
        flightNumber: g.number,
        origin: g.departure.iataCode,
        destination: g.arrival.iataCode,
        departAt: g.departure.at,
        arriveAt: g.arrival.at,
        durationMin: parseIsoDuration(g.duration),
        aircraft: g.aircraft?.code,
        cabin: fares[i]?.cabin,
        checkedBags: bagAt(i),
        carryOnBags: 0, // Self-Service does not report cabin-bag pieces
      };
    });
    const first = segments[0];
    const last = segments[segments.length - 1];
    return {
      origin: first?.origin || "",
      destination: last?.destination || "",
      departAt: first?.departAt || "",
      arriveAt: last?.arriveAt || "",
      durationMin: parseIsoDuration(it.duration),
      stops: Math.max(0, segments.length - 1),
      segments,
    };
  });

  const net = Number(o.price.total);
  if (!Number.isFinite(net)) return null;
  const cabin = slices[0]?.segments[0]?.cabin;
  const owner = slices[0]?.segments[0];
  const minChecked = Math.min(...slices.flatMap((s) => s.segments.map((g) => g.checkedBags)));

  return {
    supplier: CODE,
    supplierName: NAME,
    offerId: o.id,
    itineraryKey: itineraryKey(slices, cabin),
    ownerIata: owner?.carrier || "",
    ownerName: owner?.carrierName || "Airline",
    slices,
    net,
    currency: o.price.currency,
    checkedBags: Number.isFinite(minChecked) ? minChecked : 0,
    expiresAt: undefined,
    bookable: false,
  };
}

async function search(q: FlightQuery): Promise<NormalizedFlightOffer[]> {
  if (!hasAmadeus()) return [];
  const c = creds();
  const token = await accessToken();
  const params = new URLSearchParams({
    originLocationCode: q.origin,
    destinationLocationCode: q.destination,
    departureDate: q.departDate,
    adults: String(q.adults),
    travelClass: q.cabin.toUpperCase(),
    currencyCode: q.currency || "AED",
    max: "20",
  });
  if (q.returnDate) params.set("returnDate", q.returnDate);
  if (q.children) params.set("children", String(q.children));
  if (q.maxConnections !== undefined && q.maxConnections === 0) params.set("nonStop", "true");

  const res = await fetch(`https://${c.host}/v2/shopping/flight-offers?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Amadeus search ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as {
    data?: AmadeusOffer[];
    dictionaries?: { carriers?: Record<string, string> };
  };
  const carriers = j.dictionaries?.carriers || {};
  return (j.data || []).map((o) => normalize(o, carriers)).filter((o): o is NormalizedFlightOffer => o !== null);
}

async function priceCheck(): Promise<{ net: number; currency: string; expired: boolean }> {
  // Deliberately unsupported: Amadeus Self-Service offers are not held and we
  // cannot issue against them. Anything that reaches here is a routing bug.
  throw new Error("Amadeus Self-Service is shop-only. Route booking to a supplier that can issue");
}

export const amadeusAdapter: FlightSupplierAdapter = { code: CODE, name: NAME, status, search, priceCheck };
