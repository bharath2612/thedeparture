// Single source of truth for the legal entity. The privacy policy, terms, and
// footer all read from here so the registered details can never drift apart
// between pages.
//
// Fields left empty are ones nobody has given us yet. They render as a visible
// "[to be added]" rather than a plausible-looking invention — a wrong LLPIN or
// a made-up grievance-officer contact in a published policy is worse than an
// obvious gap, and under the IT Rules the grievance contact is mandatory.

export const COMPANY = {
  legalName: "K Global Travels LLP",
  brand: "The Departure",
  address: {
    line1: "2nd Floor, Divya Diamonds",
    line2: "Kavuri Hills Road, Madhapur",
    city: "Hyderabad",
    state: "Telangana",
    postcode: "500033",
    country: "India",
  },
  // ── Not yet supplied — fill these before publishing ──
  llpin: "",
  gstin: "",
  email: "",
  phone: "",
  grievanceOfficer: { name: "", email: "", phone: "" },
  lastUpdated: "25 July 2026",
} as const;

export function addressLines(): string[] {
  const a = COMPANY.address;
  return [a.line1, a.line2, `${a.city}, ${a.state} ${a.postcode}`, a.country];
}

export function addressOneLine(): string {
  return addressLines().join(", ");
}

// Renders a missing detail visibly instead of silently printing nothing.
export function orPlaceholder(value: string, what: string): string {
  return value || `[${what} to be added]`;
}
