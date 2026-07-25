// The flight supplier abstraction — the air-side twin of lib/suppliers/types.ts.
// Every flight source (Duffel, Amadeus, a consolidator) implements this one
// interface so the flight rate-shop never knows which supplier it is talking to.
//
// One important asymmetry vs hotels: on flights, CONTENT is easy and FULFILMENT
// is the gate. Without IATA accreditation you cannot plate a ticket, so a
// supplier that can only search is worth something (price benchmark) but cannot
// close a booking. `bookable` on the status carries that distinction — the UI
// must never offer a Book button on a supplier that can't issue.

export interface FlightQuery {
  origin: string; // IATA airport/city code, e.g. DEL
  destination: string; // e.g. DXB
  departDate: string; // YYYY-MM-DD
  returnDate?: string; // set => return trip
  adults: number;
  children?: number;
  cabin: CabinClass;
  maxConnections?: number;
  currency?: string; // advisory only — most air suppliers price in their own currency
}

export type CabinClass = "economy" | "premium_economy" | "business" | "first";

export interface FlightSegment {
  carrier: string; // marketing carrier IATA, e.g. EK
  carrierName: string;
  flightNumber: string; // "512" — number only, carrier is separate
  origin: string;
  destination: string;
  departAt: string; // ISO 8601
  arriveAt: string;
  durationMin?: number;
  aircraft?: string;
  cabin?: string; // marketing cabin name, e.g. "Economy Saver"
  checkedBags: number; // pieces included for the first passenger
  carryOnBags: number;
}

export interface FlightSlice {
  origin: string;
  destination: string;
  departAt: string;
  arriveAt: string;
  durationMin?: number;
  stops: number; // segments - 1
  segments: FlightSegment[];
}

export interface NormalizedFlightOffer {
  supplier: string; // supplier code, e.g. "duffel"
  supplierName: string;
  offerId: string; // opaque, supplier-scoped; carried into price-check/book
  itineraryKey: string; // cross-supplier identity (see itineraryKey())
  ownerIata: string; // the airline that owns the fare
  ownerName: string;
  slices: FlightSlice[];
  net: number; // what we pay the supplier, in `currency`
  currency: string;
  checkedBags: number; // MIN pieces across all segments — the honest number
  refundable?: boolean;
  changeable?: boolean;
  expiresAt?: string; // air offers go stale in minutes, not hours
  bookable: boolean; // this supplier can actually issue this ticket
}

export interface FlightSupplierStatus {
  code: string;
  name: string;
  connected: boolean; // has a usable key
  live: boolean; // returns offers today
  bookable: boolean; // can issue tickets (IATA / own accreditation)
  note: string;
}

// What the supplier needs to know about each traveller to issue a ticket.
export interface PassengerInput {
  title: string;
  givenName: string;
  familyName: string;
  bornOn: string; // YYYY-MM-DD
  email: string;
  phone: string; // E.164
  gender?: "m" | "f";
}

export interface BookingResult {
  orderId: string;
  reference: string; // the airline PNR
  net: number;
  currency: string;
}

export interface FlightSupplierAdapter {
  code: string;
  name: string;
  status(): FlightSupplierStatus;
  // Return [] (not throw) when not connected, so one supplier never breaks the shop.
  search(q: FlightQuery): Promise<NormalizedFlightOffer[]>;
  // Re-price a held offer immediately before booking. Air fares expire in minutes.
  priceCheck(offerId: string): Promise<{ net: number; currency: string; expired: boolean }>;
  // Optional by design: a supplier with no ticketing authority (Amadeus
  // Self-Service) simply does not implement these, so it is impossible to route
  // a booking to a supplier that cannot issue — the type system enforces the
  // rule instead of a runtime check we might forget.
  passengerSlots?(offerId: string): Promise<{ id: string; type: string }[]>;
  book?(params: { offerId: string; passengers: PassengerInput[] }): Promise<BookingResult>;
  // Re-read a single held offer (for the booking screen).
  offer?(offerId: string): Promise<NormalizedFlightOffer | null>;
}

// Cross-supplier flight identity. Unlike hotels — where LiteAPI's hotelId means
// nothing to TBO and matching is genuinely hard — a flight has a natural global
// key: carrier + flight number + departure date, per segment. Two suppliers
// quoting "EK 512 on 2026-08-19" are quoting the same seat, so "cheapest of N"
// on flights is exact where on hotels it is approximate.
export function itineraryKey(slices: FlightSlice[], cabin?: string): string {
  const legs = slices
    .map((s) =>
      s.segments
        .map((g) => `${g.carrier}${g.flightNumber}@${(g.departAt || "").slice(0, 10)}`)
        .join(">")
    )
    .join("|");
  return cabin ? `${legs}#${cabin}` : legs;
}

// Duffel (and most air APIs) express durations as ISO 8601 periods: "PT3H30M".
export function parseIsoDuration(iso?: string): number | undefined {
  if (!iso) return undefined;
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/.exec(iso);
  if (!m) return undefined;
  const [, d, h, min] = m;
  const total = (Number(d) || 0) * 1440 + (Number(h) || 0) * 60 + (Number(min) || 0);
  return total || undefined;
}

export function formatDuration(minutes?: number): string {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
