import "server-only";
import type { FlightSupplierAdapter } from "./types";
import { duffelAdapter } from "./duffel-adapter";
import { amadeusAdapter } from "./amadeus-adapter";
import { makeDemoAirAdapter } from "./demo-adapter";

// Every flight source we onboard is registered here. Onboarding one = implement
// its adapter, set its env key. Consolidators (TBO / TripJack / Riya) slot in
// behind the same interface once their wallet + KYC is done, they are the
// India-domestic and LCC breadth the global rails don't carry.
//
// The two DEMO-AIR entries are synthetic and off unless ENABLE_DEMO_AIR=true.
// Two of them, not one, because a rate-shop with a single supplier has nothing
// to shop, the pair is what makes the cheapest-picker visible.
export const FLIGHT_SUPPLIERS: FlightSupplierAdapter[] = [
  duffelAdapter,
  amadeusAdapter,
  makeDemoAirAdapter({ code: "demo-air-a", name: "DEMO-AIR-A (synthetic)", bias: 1.0 }),
  makeDemoAirAdapter({ code: "demo-air-b", name: "DEMO-AIR-B (synthetic)", bias: 0.94 }),
];

export function activeFlightSuppliers(): FlightSupplierAdapter[] {
  return FLIGHT_SUPPLIERS.filter((s) => s.status().live);
}

export function getFlightSupplier(code: string): FlightSupplierAdapter | undefined {
  return FLIGHT_SUPPLIERS.find((s) => s.code === code);
}
