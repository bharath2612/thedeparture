// Server-only LiteAPI client. The API key never reaches the browser — every
// call goes through our /api routes. Contract verified against the live v3.0
// sandbox (search -> rates -> prebook -> book).

import "server-only";

const BASE = "https://api.liteapi.travel/v3.0";
// LiteAPI's public sandbox key — lets the portal run out of the box with test
// data. Set LITEAPI_KEY in the environment to use your own sandbox/prod key.
const PUBLIC_SANDBOX_KEY = "sand_c0155ab8-c683-4f26-8f94-b5e92c5797b9";

export function apiKey(): string {
  return process.env.LITEAPI_KEY?.trim() || PUBLIC_SANDBOX_KEY;
}

export function isLive(): boolean {
  return apiKey().startsWith("prod");
}

async function call<T>(
  path: string,
  init: RequestInit & { query?: Record<string, string | number | undefined> } = {}
): Promise<T> {
  const { query, ...rest } = init;
  let url = `${BASE}${path}`;
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    }
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  const res = await fetch(url, {
    ...rest,
    headers: {
      "X-API-Key": apiKey(),
      "Content-Type": "application/json",
      accept: "application/json",
      ...(rest.headers || {}),
    },
    // Rates are volatile; never cache the money calls.
    cache: "no-store",
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new LiteApiError(`Non-JSON response from ${path} (HTTP ${res.status})`, res.status, text);
  }

  if (!res.ok) {
    const msg =
      (json as { error?: { description?: string }; message?: string })?.error?.description ||
      (json as { message?: string })?.message ||
      `LiteAPI ${path} failed (HTTP ${res.status})`;
    throw new LiteApiError(msg, res.status, json);
  }
  return json as T;
}

export class LiteApiError extends Error {
  status: number;
  detail: unknown;
  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = "LiteApiError";
    this.status = status;
    this.detail = detail;
  }
}

/* ----------------------------- Static content ---------------------------- */

export interface Hotel {
  id: string;
  name: string;
  hotelDescription?: string;
  city?: string;
  country?: string;
  address?: string;
  starRating?: number;
  rating?: number;
  reviewCount?: number;
  main_photo?: string;
  thumbnail?: string;
  latitude?: number;
  longitude?: number;
}

export async function listHotels(params: {
  countryCode: string;
  cityName?: string;
  limit?: number;
}): Promise<Hotel[]> {
  const json = await call<{ data: Hotel[] }>("/data/hotels", {
    method: "GET",
    query: { countryCode: params.countryCode, cityName: params.cityName, limit: params.limit ?? 30 },
  });
  return json.data || [];
}

export interface Country {
  code: string;
  name: string;
}
export async function listCountries(): Promise<Country[]> {
  const json = await call<{ data: Country[] }>("/data/countries", { method: "GET" });
  return json.data || [];
}

/* --------------------------------- Rates --------------------------------- */

export interface Occupancy {
  adults: number;
  children?: number[];
}

export interface RatesRequest {
  hotelIds: string[];
  checkin: string; // YYYY-MM-DD
  checkout: string;
  occupancies: Occupancy[];
  currency: string;
  guestNationality: string;
}

export interface Money {
  amount: number;
  currency: string;
}
export interface RetailRate {
  total: Money[];
  suggestedSellingPrice?: Money[];
  initialPrice?: Money[];
  taxesAndFees?: { included: boolean; description: string; amount: number; currency: string }[];
}
export interface Rate {
  rateId: string;
  name: string;
  boardName?: string;
  boardType?: string;
  maxOccupancy?: number;
  adultCount?: number;
  childCount?: number;
  remarks?: string;
  retailRate: RetailRate;
  cancellationPolicies?: { refundableTag?: string; cancelPolicyInfos?: unknown[] };
}
export interface RoomType {
  roomTypeId: string;
  offerId: string; // pass this to prebook
  supplier?: string;
  rates: Rate[];
  offerRetailRate?: Money;
  suggestedSellingPrice?: Money;
  offerInitialPrice?: Money;
}
export interface HotelRates {
  hotelId: string;
  roomTypes: RoomType[];
}

export async function getRates(req: RatesRequest): Promise<HotelRates[]> {
  const json = await call<{ data: HotelRates[]; sandbox?: boolean }>("/hotels/rates", {
    method: "POST",
    body: JSON.stringify(req),
  });
  return json.data || [];
}

/* -------------------------------- Prebook -------------------------------- */

export interface Prebook {
  prebookId: string;
  offerId: string;
  hotelId: string;
  currency: string;
  price: number; // locked net price
  suggestedSellingPrice?: number;
  commission?: number;
  priceType?: string;
  priceDifferencePercent?: number;
  cancellationChanged?: boolean;
  boardChanged?: boolean;
  checkin?: string;
  checkout?: string;
  termsAndConditions?: string;
}

export async function prebook(offerId: string): Promise<Prebook> {
  const json = await call<{ data: Prebook }>("/rates/prebook", {
    method: "POST",
    body: JSON.stringify({ offerId, usePaymentSdk: false }),
  });
  return json.data;
}

/* --------------------------------- Book ---------------------------------- */
// Sandbox book works without a real charge; wired here for completeness. The
// live flow will attach a payment method + wallet debit before calling this.

export interface BookGuest {
  occupancyNumber: number;
  firstName: string;
  lastName: string;
  email: string;
}
export interface BookHolder {
  firstName: string;
  lastName: string;
  email: string;
}
export async function book(params: {
  prebookId: string;
  holder: BookHolder;
  guests: BookGuest[];
}): Promise<unknown> {
  const json = await call<unknown>("/rates/book", {
    method: "POST",
    body: JSON.stringify({
      prebookId: params.prebookId,
      holder: params.holder,
      guests: params.guests,
      payment: { method: "ACC_CREDIT_CARD" },
    }),
  });
  return json;
}
