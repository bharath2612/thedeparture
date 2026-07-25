import "server-only";
import type { FlightSupplierAdapter } from "./types";
import { duffelAdapter } from "./duffel-adapter";
import { amadeusAdapter } from "./amadeus-adapter";

// Every flight source we onboard is registered here. Onboarding one = implement
// its adapter, set its env key. Consolidators (TBO / TripJack / Riya) slot in
// behind the same interface once their wallet + KYC is done — they are the
// India-domestic and LCC breadth the global rails don't carry.
export const FLIGHT_SUPPLIERS: FlightSupplierAdapter[] = [duffelAdapter, amadeusAdapter];

export function activeFlightSuppliers(): FlightSupplierAdapter[] {
  return FLIGHT_SUPPLIERS.filter((s) => s.status().live);
}

export function getFlightSupplier(code: string): FlightSupplierAdapter | undefined {
  return FLIGHT_SUPPLIERS.find((s) => s.code === code);
}
