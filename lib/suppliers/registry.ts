import "server-only";
import type { SupplierAdapter } from "./types";
import { liteApiAdapter } from "./liteapi-adapter";
import { demoAdapter } from "./demo-adapter";
import { makeStubAdapter } from "./stub-adapter";

// Every aggregator we onboard is registered here. The rate-shop engine queries all
// of them. Onboarding a real supplier: implement its adapter, set its env key.
export const SUPPLIERS: SupplierAdapter[] = [
  liteApiAdapter,
  makeStubAdapter({
    code: "rezlive",
    name: "Rezlive",
    envKey: "REZLIVE_KEY",
    note: "Tier-2: free registration + KYC → API key + sandbox (SOAP/REST). Strong Gulf–India net rates.",
  }),
  makeStubAdapter({
    code: "ratehawk",
    name: "RateHawk",
    envKey: "RATEHAWK_KEY",
    note: "Tier-1/2: one-step registration, API in ~1–2 weeks. 3.2M properties, net-rate.",
  }),
  makeStubAdapter({
    code: "tbo",
    name: "TBO",
    envKey: "TBO_KEY",
    note: "Tier-2: register → prepaid wallet → request API access. Flights + hotels.",
  }),
  demoAdapter,
];

export function activeSuppliers(): SupplierAdapter[] {
  // A supplier is 'active' if it reports live (LiteAPI always; demo when toggled;
  // stubs never until implemented).
  return SUPPLIERS.filter((s) => s.status().live);
}

export function getSupplier(code: string): SupplierAdapter | undefined {
  return SUPPLIERS.find((s) => s.code === code);
}
