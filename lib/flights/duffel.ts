import "server-only";

// Server-only Duffel client. The token never reaches the browser.
//
// Duffel is the load-bearing flight supplier for a no-IATA launch: it issues
// tickets on its OWN airline relationships, so we can sell air without
// accreditation. Test tokens (duffel_test_…) book against test airlines with
// no money movement; production tokens (duffel_live_…) issue real tickets.
//
// Docs: https://duffel.com/docs/api/v2 — verified against the live schema.

const BASE = "https://api.duffel.com";
const VERSION = "v2";

export function duffelToken(): string {
  return (process.env.DUFFEL_TOKEN || "").trim();
}

export function hasDuffel(): boolean {
  return duffelToken().length > 0;
}

export function duffelIsLive(): boolean {
  return duffelToken().startsWith("duffel_live");
}

async function call<T>(
  path: string,
  init: { method?: string; body?: unknown; query?: Record<string, string | number | undefined> } = {}
): Promise<T> {
  const token = duffelToken();
  if (!token) throw new Error("DUFFEL_TOKEN is not set");

  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(init.query || {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, {
    method: init.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Duffel-Version": VERSION,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    // Air prices are volatile and offers expire in minutes — never cache them.
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    // Duffel returns { errors: [{ title, message, code }] }.
    let detail = text.slice(0, 400);
    try {
      const parsed = JSON.parse(text);
      const errs = parsed?.errors;
      if (Array.isArray(errs) && errs.length) {
        detail = errs.map((e: DuffelError) => `${e.title}: ${e.message}`).join("; ");
      }
    } catch {
      /* keep raw text */
    }
    throw new Error(`Duffel ${res.status} on ${path} — ${detail}`);
  }
  return JSON.parse(text) as T;
}

interface DuffelError {
  title?: string;
  message?: string;
  code?: string;
}

// ── Wire types (only the fields we actually read) ──────────────────────────

export interface DuffelPlace {
  iata_code?: string;
  name?: string;
  city_name?: string;
}

export interface DuffelAirline {
  iata_code?: string;
  name?: string;
}

export interface DuffelBaggage {
  type: "checked" | "carry_on";
  quantity: number;
}

export interface DuffelSegmentPassenger {
  cabin_class_marketing_name?: string;
  baggages?: DuffelBaggage[];
}

export interface DuffelSegment {
  id: string;
  origin: DuffelPlace;
  destination: DuffelPlace;
  departing_at: string;
  arriving_at: string;
  duration?: string;
  marketing_carrier?: DuffelAirline;
  marketing_carrier_flight_number?: string;
  operating_carrier?: DuffelAirline;
  aircraft?: { name?: string };
  passengers?: DuffelSegmentPassenger[];
}

export interface DuffelSlice {
  id: string;
  duration?: string;
  origin: DuffelPlace;
  destination: DuffelPlace;
  segments: DuffelSegment[];
}

export interface DuffelOfferPassenger {
  id: string;
  type?: string;
  age?: number;
}

export interface DuffelOffer {
  id: string;
  total_amount: string; // decimal string — never parse as float for money maths
  total_currency: string;
  base_amount?: string;
  tax_amount?: string | null;
  expires_at?: string;
  owner?: DuffelAirline;
  passengers?: DuffelOfferPassenger[];
  slices: DuffelSlice[];
  conditions?: {
    refund_before_departure?: { allowed: boolean } | null;
    change_before_departure?: { allowed: boolean } | null;
  };
}

export interface DuffelOrder {
  id: string;
  booking_reference: string;
  total_amount?: string;
  total_currency?: string;
  documents?: { unique_identifier?: string; type?: string }[];
}

// ── Calls ─────────────────────────────────────────────────────────────────

export interface OfferRequestSlice {
  origin: string;
  destination: string;
  departure_date: string;
}

export async function createOfferRequest(params: {
  slices: OfferRequestSlice[];
  adults: number;
  children?: number;
  cabin: string;
  maxConnections?: number;
  supplierTimeoutMs?: number;
}): Promise<DuffelOffer[]> {
  const passengers: { type: string }[] = [];
  for (let i = 0; i < params.adults; i++) passengers.push({ type: "adult" });
  for (let i = 0; i < (params.children || 0); i++) passengers.push({ type: "child" });

  const body = {
    data: {
      slices: params.slices,
      passengers,
      cabin_class: params.cabin,
      ...(params.maxConnections !== undefined ? { max_connections: params.maxConnections } : {}),
    },
  };

  const out = await call<{ data: { id: string; offers?: DuffelOffer[] } }>("/air/offer_requests", {
    method: "POST",
    body,
    query: {
      return_offers: "true",
      supplier_timeout: params.supplierTimeoutMs ?? 15000,
    },
  });
  return out.data.offers || [];
}

export async function getOffer(offerId: string): Promise<DuffelOffer> {
  const out = await call<{ data: DuffelOffer }>(`/air/offers/${offerId}`);
  return out.data;
}

export interface BookPassenger {
  id: string; // must be the passenger id from the OFFER, not one we invent
  title: string; // mr | ms | mrs | miss | dr
  given_name: string;
  family_name: string;
  born_on: string; // YYYY-MM-DD
  email: string;
  phone_number: string; // E.164, e.g. +919876543210
  gender?: "m" | "f";
}

export async function createOrder(params: {
  offerId: string;
  amount: string;
  currency: string;
  passengers: BookPassenger[];
}): Promise<DuffelOrder> {
  const out = await call<{ data: DuffelOrder }>("/air/orders", {
    method: "POST",
    body: {
      data: {
        type: "instant",
        selected_offers: [params.offerId],
        // "balance" pays from the Duffel account balance. In test mode this is
        // play money; in production it is a real prefunded balance.
        payments: [{ type: "balance", amount: params.amount, currency: params.currency }],
        passengers: params.passengers,
      },
    },
  });
  return out.data;
}
