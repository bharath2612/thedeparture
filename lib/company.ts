// Single source of truth for the legal entity. The privacy policy, terms, and
// footer all read from here so the registered details can never drift apart
// between pages.
//
// Fields we do not have are left empty, and the pages OMIT the sentence that
// would have carried them rather than printing a gap. A published policy
// should never show "[LLPIN to be added]" to a customer, and it should never
// show an invented one either, so the only honest option is to not make the
// claim until the number exists. Fill a field in here and the sentence
// reappears on its own.

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
  email: "connect@thedeparture.ai",

  // Mandatory under the Information Technology Act, 2000 and the rules made
  // under it. A phone number is not published because we have not been given
  // one; the email and registered address are.
  grievanceOfficer: {
    name: "Phani Reddy Kurre",
    email: "phani.k@thedeparture.ai",
    phone: "",
  },

  // ── Not yet supplied. While empty, the pages simply do not assert them. ──
  llpin: "",
  gstin: "",
  phone: "",

  lastUpdated: "27 July 2026",
} as const;

export function addressLines(): string[] {
  const a = COMPANY.address;
  return [a.line1, a.line2, `${a.city}, ${a.state} ${a.postcode}`, a.country];
}

export function addressOneLine(): string {
  return addressLines().join(", ");
}

// "LLPIN 123, GSTIN 456" / "LLPIN 123" / "", joins only the parts we hold, so
// a missing registration number removes itself from the sentence instead of
// leaving a dangling label or a stray comma.
export function registrationLine(): string {
  return [
    COMPANY.llpin && `LLPIN ${COMPANY.llpin}`,
    COMPANY.gstin && `GSTIN ${COMPANY.gstin}`,
  ]
    .filter(Boolean)
    .join(", ");
}
