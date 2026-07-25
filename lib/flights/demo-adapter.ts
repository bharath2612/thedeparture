import "server-only";
import {
  itineraryKey,
  type FlightQuery,
  type FlightSegment,
  type FlightSlice,
  type FlightSupplierAdapter,
  type FlightSupplierStatus,
  type NormalizedFlightOffer,
} from "./types";

// SYNTHETIC AIR SUPPLIERS. Not real. The air twin of lib/suppliers/demo-adapter.ts.
//
// Enabled only with ENABLE_DEMO_AIR=true, so you can watch the flight
// rate-shop — fan-out, exact itinerary matching, cheapest-of-N, the checked-bag
// filter — before a real air token exists. Two instances are registered with
// different price biases precisely so the picker has something to pick.
//
// Every price and schedule here is INVENTED. Both instances report
// bookable: false and neither implements book(), so the same rule that stops a
// real shop-only supplier from being handed a booking stops these too. Leave
// this off for anything a customer will see.

interface DemoRoute {
  carrier: string;
  carrierName: string;
  flightNumber: string;
  departHour: number;
  durationMin: number;
  aircraft: string;
  baseFare: number; // in DEFAULT_CURRENCY, before the per-supplier bias
  checkedBags: number;
}

// A small, deliberately Gulf–India-shaped pool. Real carriers on real corridors
// so the screen reads plausibly, invented times and fares.
const POOL: DemoRoute[] = [
  { carrier: "EK", carrierName: "Emirates", flightNumber: "511", departHour: 18, durationMin: 210, aircraft: "Boeing 777-300ER", baseFare: 1420, checkedBags: 2 },
  { carrier: "6E", carrierName: "IndiGo", flightNumber: "1471", departHour: 6, durationMin: 220, aircraft: "Airbus A320neo", baseFare: 1180, checkedBags: 0 },
  { carrier: "AI", carrierName: "Air India", flightNumber: "995", departHour: 22, durationMin: 215, aircraft: "Boeing 787-8", baseFare: 1310, checkedBags: 1 },
  { carrier: "FZ", carrierName: "flydubai", flightNumber: "446", departHour: 3, durationMin: 225, aircraft: "Boeing 737 MAX 8", baseFare: 1090, checkedBags: 0 },
  { carrier: "UK", carrierName: "Vistara", flightNumber: "295", departHour: 10, durationMin: 205, aircraft: "Airbus A320neo", baseFare: 1375, checkedBags: 1 },
];

function enabled(): boolean {
  return process.env.ENABLE_DEMO_AIR === "true";
}

// Deterministic hash so the same query returns the same fares on every reload —
// prices that jitter on refresh make the picker impossible to reason about.
function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

function addMinutes(date: string, hour: number, minutes: number): string {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCMinutes(base.getUTCMinutes() + hour * 60 + minutes);
  // Emit a local-style ISO string with no zone marker, matching how real air
  // APIs report local departure/arrival times.
  return base.toISOString().slice(0, 19);
}

function buildSlice(origin: string, destination: string, date: string, r: DemoRoute, offsetMin: number): FlightSlice {
  const departAt = addMinutes(date, r.departHour, offsetMin);
  const arriveAt = addMinutes(date, r.departHour, offsetMin + r.durationMin);
  const segment: FlightSegment = {
    carrier: r.carrier,
    carrierName: r.carrierName,
    flightNumber: r.flightNumber,
    origin,
    destination,
    departAt,
    arriveAt,
    durationMin: r.durationMin,
    aircraft: r.aircraft,
    cabin: "Economy",
    checkedBags: r.checkedBags,
    carryOnBags: 1,
  };
  return {
    origin,
    destination,
    departAt,
    arriveAt,
    durationMin: r.durationMin,
    stops: 0,
    segments: [segment],
  };
}

export function makeDemoAirAdapter(opts: {
  code: string;
  name: string;
  bias: number; // multiplier applied to every fare, e.g. 0.94 = habitually cheaper
}): FlightSupplierAdapter {
  function status(): FlightSupplierStatus {
    return {
      code: opts.code,
      name: opts.name,
      connected: enabled(),
      live: enabled(),
      bookable: false, // synthetic: never issue, never pretend to
      note: enabled()
        ? "SYNTHETIC — invented fares and schedules, for demonstrating the air rate-shop only. Cannot be booked."
        : "Off. Set ENABLE_DEMO_AIR=true to visualise multi-supplier flight shopping before a real token exists.",
    };
  }

  async function search(q: FlightQuery): Promise<NormalizedFlightOffer[]> {
    if (!enabled()) return [];
    const currency = q.currency || process.env.DEFAULT_CURRENCY || "AED";
    const cabinMultiplier = q.cabin === "business" ? 3.2 : q.cabin === "first" ? 5.1 : q.cabin === "premium_economy" ? 1.6 : 1;

    return POOL.map((r) => {
      // The per-route jitter is what makes the two demo suppliers disagree on
      // WHICH flight is cheapest, instead of one winning everything.
      const seed = hash(`${opts.code}:${q.origin}:${q.destination}:${q.departDate}:${r.carrier}${r.flightNumber}`);
      const jitter = 1 + ((seed % 160) - 80) / 1000; // 0.92 .. 1.08
      const offsetMin = seed % 45;

      const slices: FlightSlice[] = [buildSlice(q.origin, q.destination, q.departDate, r, offsetMin)];
      if (q.returnDate) {
        slices.push(buildSlice(q.destination, q.origin, q.returnDate, r, (seed >> 3) % 45));
      }

      const legs = slices.length;
      const net =
        Math.round(r.baseFare * legs * opts.bias * jitter * cabinMultiplier * q.adults * 100) / 100;

      return {
        supplier: opts.code,
        supplierName: opts.name,
        offerId: `${opts.code}::${r.carrier}${r.flightNumber}::${q.departDate}`,
        itineraryKey: itineraryKey(slices, "Economy"),
        ownerIata: r.carrier,
        ownerName: r.carrierName,
        slices,
        net,
        currency,
        checkedBags: r.checkedBags,
        refundable: r.checkedBags > 0,
        changeable: true,
        expiresAt: undefined,
        bookable: false,
      } satisfies NormalizedFlightOffer;
    });
  }

  async function priceCheck(): Promise<{ net: number; currency: string; expired: boolean }> {
    throw new Error(`${opts.name} is synthetic and cannot be priced for booking.`);
  }

  // Deliberately no book() / passengerSlots() — a supplier that cannot issue
  // must not even have the method.
  return { code: opts.code, name: opts.name, status, search, priceCheck };
}
