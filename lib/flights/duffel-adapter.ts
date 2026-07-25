import "server-only";
import {
  createOfferRequest,
  createOrder,
  getOffer,
  duffelToken,
  hasDuffel,
  duffelIsLive,
  type DuffelOffer,
  type DuffelSlice,
} from "./duffel";
import {
  itineraryKey,
  parseIsoDuration,
  type BookingResult,
  type FlightQuery,
  type FlightSegment,
  type FlightSlice,
  type FlightSupplierAdapter,
  type FlightSupplierStatus,
  type NormalizedFlightOffer,
  type PassengerInput,
} from "./types";

const CODE = "duffel";
const NAME = "Duffel";

function status(): FlightSupplierStatus {
  const connected = hasDuffel();
  const live = duffelIsLive();
  return {
    code: CODE,
    name: NAME,
    connected,
    live: connected,
    // Duffel issues on its own airline relationships — the whole reason it is
    // the launch rail. No IATA needed on our side.
    bookable: connected,
    note: !connected
      ? "Not connected — set DUFFEL_TOKEN to go live (self-serve signup, no IATA required)"
      : live
        ? "Live (production) — issues real tickets on Duffel's own accreditation"
        : "Live (test mode) — real API, test airlines, no money moves",
  };
}

// Baggage is per-passenger, per-segment. The honest number for an itinerary is
// the MINIMUM across segments: a bag included on the first leg but not the
// second is not a bag you can carry end to end.
function bagsFor(slices: DuffelSlice[], type: "checked" | "carry_on"): number {
  let min = Infinity;
  for (const s of slices) {
    for (const g of s.segments) {
      const p = g.passengers?.[0];
      const qty = (p?.baggages || [])
        .filter((b) => b.type === type)
        .reduce((n, b) => n + (b.quantity || 0), 0);
      min = Math.min(min, qty);
    }
  }
  return Number.isFinite(min) ? min : 0;
}

function normalizeSlice(s: DuffelSlice): FlightSlice {
  const segments: FlightSegment[] = s.segments.map((g) => {
    const p = g.passengers?.[0];
    const bag = (t: "checked" | "carry_on") =>
      (p?.baggages || []).filter((b) => b.type === t).reduce((n, b) => n + (b.quantity || 0), 0);
    return {
      carrier: g.marketing_carrier?.iata_code || "",
      carrierName: g.marketing_carrier?.name || g.operating_carrier?.name || "",
      flightNumber: g.marketing_carrier_flight_number || "",
      origin: g.origin?.iata_code || "",
      destination: g.destination?.iata_code || "",
      departAt: g.departing_at,
      arriveAt: g.arriving_at,
      durationMin: parseIsoDuration(g.duration),
      aircraft: g.aircraft?.name,
      cabin: p?.cabin_class_marketing_name,
      checkedBags: bag("checked"),
      carryOnBags: bag("carry_on"),
    };
  });
  const first = segments[0];
  const last = segments[segments.length - 1];
  return {
    origin: s.origin?.iata_code || first?.origin || "",
    destination: s.destination?.iata_code || last?.destination || "",
    departAt: first?.departAt || "",
    arriveAt: last?.arriveAt || "",
    durationMin: parseIsoDuration(s.duration),
    stops: Math.max(0, segments.length - 1),
    segments,
  };
}

function normalize(o: DuffelOffer): NormalizedFlightOffer | null {
  if (!o.slices?.length) return null;
  const slices = o.slices.map(normalizeSlice);
  const net = Number(o.total_amount);
  if (!Number.isFinite(net)) return null;
  const cabin = slices[0]?.segments[0]?.cabin;
  return {
    supplier: CODE,
    supplierName: NAME,
    offerId: o.id,
    itineraryKey: itineraryKey(slices, cabin),
    ownerIata: o.owner?.iata_code || "",
    ownerName: o.owner?.name || o.owner?.iata_code || "Airline",
    slices,
    net,
    currency: o.total_currency,
    checkedBags: bagsFor(o.slices, "checked"),
    refundable: o.conditions?.refund_before_departure?.allowed ?? undefined,
    changeable: o.conditions?.change_before_departure?.allowed ?? undefined,
    expiresAt: o.expires_at,
    bookable: true,
  };
}

async function search(q: FlightQuery): Promise<NormalizedFlightOffer[]> {
  if (!hasDuffel()) return [];
  const slices = [{ origin: q.origin, destination: q.destination, departure_date: q.departDate }];
  if (q.returnDate) {
    slices.push({ origin: q.destination, destination: q.origin, departure_date: q.returnDate });
  }
  const offers = await createOfferRequest({
    slices,
    adults: q.adults,
    children: q.children,
    cabin: q.cabin,
    maxConnections: q.maxConnections,
  });
  return offers.map(normalize).filter((o): o is NormalizedFlightOffer => o !== null);
}

async function priceCheck(offerId: string) {
  const o = await getOffer(offerId);
  const expired = o.expires_at ? new Date(o.expires_at).getTime() < Date.now() : false;
  return { net: Number(o.total_amount), currency: o.total_currency, expired };
}

async function passengerSlots(offerId: string) {
  const o = await getOffer(offerId);
  return (o.passengers || []).map((p) => ({ id: p.id, type: p.type || "adult" }));
}

async function book(params: { offerId: string; passengers: PassengerInput[] }): Promise<BookingResult> {
  // Re-read the offer immediately before ordering. Two reasons: the passenger
  // ids we must quote back are minted per offer, and the price may have moved
  // since search — we pay what the offer says NOW, never a remembered number.
  const offer = await getOffer(params.offerId);
  if (offer.expires_at && new Date(offer.expires_at).getTime() < Date.now()) {
    throw new Error("This fare expired before booking. Search again for a live price.");
  }
  const slots = offer.passengers || [];
  if (slots.length !== params.passengers.length) {
    throw new Error(
      `Offer expects ${slots.length} passenger(s), got ${params.passengers.length}`
    );
  }

  const order = await createOrder({
    offerId: params.offerId,
    amount: offer.total_amount,
    currency: offer.total_currency,
    passengers: params.passengers.map((p, i) => ({
      id: slots[i].id,
      title: p.title,
      given_name: p.givenName,
      family_name: p.familyName,
      born_on: p.bornOn,
      email: p.email,
      phone_number: p.phone,
      ...(p.gender ? { gender: p.gender } : {}),
    })),
  });

  return {
    orderId: order.id,
    reference: order.booking_reference,
    net: Number(order.total_amount ?? offer.total_amount),
    currency: order.total_currency || offer.total_currency,
  };
}

async function offer(offerId: string): Promise<NormalizedFlightOffer | null> {
  return normalize(await getOffer(offerId));
}

export const duffelAdapter: FlightSupplierAdapter = {
  code: CODE,
  name: NAME,
  status,
  search,
  priceCheck,
  passengerSlots,
  book,
  offer,
};

// Exposed so the /suppliers board can show which kind of token is loaded
// without ever leaking the token itself.
export function duffelTokenKind(): "none" | "test" | "live" {
  const t = duffelToken();
  if (!t) return "none";
  return t.startsWith("duffel_live") ? "live" : "test";
}
