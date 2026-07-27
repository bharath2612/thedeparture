"use server";

import { redirect } from "next/navigation";
import { getFlightSupplier } from "@/lib/flights/registry";
import type { PassengerInput } from "@/lib/flights/types";

export interface BookState {
  error?: string;
}

// Issue the ticket. Everything that can be wrong is checked here rather than in
// the browser: the supplier must exist, must be able to issue, and the offer is
// re-priced inside the adapter immediately before the order is created.
export async function bookFlightAction(_prev: BookState, form: FormData): Promise<BookState> {
  const supplierCode = String(form.get("supplier") || "");
  const offerId = String(form.get("offer") || "");
  const count = Math.max(1, Number(form.get("count")) || 1);

  const supplier = getFlightSupplier(supplierCode);
  if (!supplier) return { error: "Unknown supplier." };
  if (!supplier.book) {
    return {
      error: `${supplier.name} has no ticketing authority, so this fare can be shopped but not issued.`,
    };
  }

  const passengers: PassengerInput[] = [];
  for (let i = 0; i < count; i++) {
    const given = String(form.get(`given_${i}`) || "").trim();
    const family = String(form.get(`family_${i}`) || "").trim();
    const bornOn = String(form.get(`born_${i}`) || "").trim();
    const title = String(form.get(`title_${i}`) || "mr").trim();
    if (!given || !family || !bornOn) {
      return { error: `Traveller ${i + 1}: name and date of birth are required.` };
    }
    passengers.push({
      title,
      givenName: given,
      familyName: family,
      bornOn,
      email: String(form.get("email") || "").trim(),
      phone: String(form.get("phone") || "").trim(),
      gender: title === "mr" ? "m" : "f",
    });
  }

  if (!passengers[0].email || !passengers[0].phone) {
    return { error: "Contact email and phone are required. That is how your agent reaches you." };
  }
  if (!/^\+[1-9]\d{6,14}$/.test(passengers[0].phone)) {
    return { error: "Phone must be in international format, e.g. +919876543210." };
  }

  let ref: string;
  let orderId: string;
  let net: number;
  let currency: string;
  try {
    const res = await supplier.book({ offerId, passengers });
    ref = res.reference;
    orderId = res.orderId;
    net = res.net;
    currency = res.currency;
  } catch (e) {
    return { error: String((e as Error).message || e) };
  }

  // redirect() throws by design, it must sit outside the try/catch above or it
  // would be swallowed and reported as a booking failure.
  const q = new URLSearchParams({
    ref,
    order: orderId,
    net: String(net),
    currency,
    supplier: supplier.name,
  });
  redirect(`/flights/confirmed?${q}`);
}
