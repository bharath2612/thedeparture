import "server-only";
import {
  itineraryKey,
  parseIsoDuration,
  type FlightQuery,
  type FlightSegment,
  type FlightSlice,
  type FlightSupplierAdapter,
  type FlightSupplierStatus,
  type NormalizedFlightOffer,
} from "./types";

// Travelport (TripServices JSON Air v11), SHOP-ONLY.
//
// This is a real GDS: Galileo content, priced natively in INR for an APAC:India
// access group. It is the first supplier here that returns genuine fares for the
// India corridor, which is what retires the synthetic DEMO-AIR pair.
//
// It cannot issue a ticket for us, and that is not a configuration gap. A GDS
// plates tickets against an accredited agency's own PCC; K Global Travels LLP
// has APPLIED for IATA accreditation but does not hold it yet. Until that lands
// (and Travelport certification after it), there is no ticketing authority
// behind these fares. So `bookable` is false and this adapter deliberately
// implements neither book() nor passengerSlots(), which makes it a type error to
// route a booking here rather than a runtime check we might forget.
//
// When IATA does land: certification, production credentials, then add book().
// Do not flip `bookable` to true before that; it is the whole safety property.
//
// Auth is OAuth2 PASSWORD grant (not client-credentials): the user credentials
// AND the client id/secret all go in one form post. Tokens last 24h.

const CODE = "travelport";
const NAME = "Travelport";
const API_VERSION = "11";

function creds() {
  return {
    username: (process.env.TRAVELPORT_USERNAME || "").trim(),
    password: (process.env.TRAVELPORT_PASSWORD || "").trim(),
    clientId: (process.env.TRAVELPORT_CLIENT_ID || "").trim(),
    clientSecret: (process.env.TRAVELPORT_CLIENT_SECRET || "").trim(),
    accessGroup: (process.env.TRAVELPORT_ACCESS_GROUP || "").trim(),
    // pre-production by default; production hosts drop the `.pp`
    host: (process.env.TRAVELPORT_HOST || "api.pp.travelport.net").trim(),
    authHost: (process.env.TRAVELPORT_AUTH_HOST || "auth.pp.travelport.net").trim(),
  };
}

function hasTravelport(): boolean {
  const c = creds();
  return Boolean(c.username && c.password && c.clientId && c.clientSecret && c.accessGroup);
}

function isPreProduction(): boolean {
  return creds().host.includes(".pp.");
}

function status(): FlightSupplierStatus {
  const connected = hasTravelport();
  return {
    code: CODE,
    name: NAME,
    connected,
    live: connected,
    // Structural, not configurable: no IATA accreditation means no plating
    // authority. See the header comment before changing this.
    bookable: false,
    note: connected
      ? `${isPreProduction() ? "Pre-production" : "Production"} credentials in use. SHOP ONLY: real GDS fares, but no ticketing authority until IATA accreditation and Travelport certification are complete.`
      : "Not configured. Needs TRAVELPORT_USERNAME, TRAVELPORT_PASSWORD, TRAVELPORT_CLIENT_ID, TRAVELPORT_CLIENT_SECRET and TRAVELPORT_ACCESS_GROUP.",
  };
}

// Travelport's search response carries no carrier-name reference list, only IATA
// codes. This table is for display only; `carrier` (the code) stays the
// authoritative field and an unknown code renders as itself rather than a guess.
const CARRIER_NAMES: Record<string, string> = {
  AA: "American Airlines",
  AI: "Air India",
  BS: "US-Bangla Airlines",
  EK: "Emirates",
  EY: "Etihad Airways",
  OD: "Batik Air Malaysia",
  QF: "Qantas",
  QR: "Qatar Airways",
  SQ: "Singapore Airlines",
  TG: "Thai Airways International",
  UA: "United Airlines",
  UK: "Vistara",
  UL: "SriLankan Airlines",
  VJ: "VietJet Air",
  WY: "Oman Air",
};

let tokenCache: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60_000) return tokenCache.token;
  const c = creds();
  const res = await fetch(`https://${c.authHost}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "password",
      username: c.username,
      password: c.password,
      client_id: c.clientId,
      client_secret: c.clientSecret,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Travelport auth ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: j.access_token, expiresAt: now + (j.expires_in || 86400) * 1000 };
  return j.access_token;
}

// ── Response shapes (only the fields we read) ──────────────────────────────

interface TpFlight {
  id: string;
  carrier: string;
  number: string;
  equipment?: string;
  duration?: string;
  Departure: { location: string; date: string; time: string; terminal?: string };
  Arrival: { location: string; date: string; time: string; terminal?: string };
}

interface TpFlightProduct {
  segmentSequence?: number[];
  cabin?: string;
  classOfService?: string;
}

interface TpProduct {
  id: string;
  totalDuration?: string;
  FlightSegment?: { sequence: number; Flight: { FlightRef: string } }[];
  PassengerFlight?: { passengerTypeCode: string; FlightProduct?: TpFlightProduct[] }[];
}

interface TpBaggageAllowance {
  baggageType?: string;
  ProductRef?: string[];
  SegmentSequenceList?: number[];
  BaggageItem?: {
    includedInOfferPrice?: string;
    soldByWeightInd?: boolean;
    Measurement?: { measurementType?: string; unit?: string; value?: number }[];
  }[];
}

interface TpTerms {
  id: string;
  BaggageAllowance?: TpBaggageAllowance[];
  ValidatingAirline?: { ValidatingAirline?: string }[];
  Penalties?: { Change?: { "@type"?: string }[]; Cancel?: { "@type"?: string }[] }[];
}

interface TpOffering {
  Product?: { productRef: string }[];
  TermsAndConditions?: { termsAndConditionsRef: string };
  CombinabilityCode?: string[];
  BestCombinablePrice?: {
    CurrencyCode?: { value?: string };
    TotalPrice?: number;
  };
}

interface TpGroup {
  id: string;
  Departure: string;
  Arrival: string;
  ProductBrandOptions?: { ProductBrandOffering?: TpOffering[] }[];
}

interface TpResponse {
  CatalogProductOfferingsResponse?: {
    transactionId?: string;
    CatalogProductOfferings?: { CatalogProductOffering?: TpGroup[] };
    ReferenceList?: {
      "@type": string;
      Flight?: TpFlight[];
      Product?: TpProduct[];
      TermsAndConditions?: TpTerms[];
    }[];
  };
}

// A flattened offering plus the context needed to price and combine it.
interface Candidate {
  groupId: string;
  offering: TpOffering;
  productRefs: string[];
  total: number;
  currency: string;
  codes: Set<string>;
}

// ── Normalization ──────────────────────────────────────────────────────────

function isoAt(d: { date: string; time: string }): string {
  // Travelport reports local date + local time with no UTC offset, which is
  // exactly how Duffel reports it too, so keep it naive rather than inventing
  // a timezone we have not been told.
  return `${d.date}T${d.time}`;
}

// Checked/carry-on allowance for one product. Travelport expresses Gulf and
// India allowances by WEIGHT ("25 Kilograms"), which carries no piece count.
// Matching amadeus-adapter's convention, a weight-based included allowance is
// reported as 1 piece so a 25kg allowance is not displayed as "no bag"; the
// exact weight lives in the fare rules. We never derive a piece count from kg.
function bagPieces(terms: TpTerms | undefined, productRef: string, type: "FirstCheckedBag" | "CarryOn"): number {
  const entries = (terms?.BaggageAllowance || []).filter(
    (b) => b.baggageType === type && (b.ProductRef || []).includes(productRef)
  );
  let best = 0;
  for (const e of entries) {
    for (const item of e.BaggageItem || []) {
      if (item.includedInOfferPrice !== "Yes") continue;
      const measure = (item.Measurement || [])[0];
      if (item.soldByWeightInd || measure?.measurementType === "Weight") {
        best = Math.max(best, 1);
      } else if (typeof measure?.value === "number") {
        best = Math.max(best, measure.value);
      } else {
        best = Math.max(best, 1);
      }
    }
  }
  return best;
}

function buildSlice(
  product: TpProduct,
  flights: Map<string, TpFlight>,
  terms: TpTerms | undefined
): FlightSlice | null {
  const segs = (product.FlightSegment || []).slice().sort((a, b) => a.sequence - b.sequence);
  if (!segs.length) return null;

  const fareBySeq = new Map<number, TpFlightProduct>();
  const adult = (product.PassengerFlight || []).find((p) => p.passengerTypeCode === "ADT") || product.PassengerFlight?.[0];
  for (const fp of adult?.FlightProduct || []) {
    for (const s of fp.segmentSequence || []) fareBySeq.set(s, fp);
  }

  const checked = bagPieces(terms, product.id, "FirstCheckedBag");
  const carryOn = bagPieces(terms, product.id, "CarryOn");

  const segments: FlightSegment[] = [];
  for (const s of segs) {
    const f = flights.get(s.Flight.FlightRef);
    if (!f) return null; // a dangling ref means we cannot describe the itinerary honestly
    segments.push({
      carrier: f.carrier,
      carrierName: CARRIER_NAMES[f.carrier] || f.carrier,
      flightNumber: f.number,
      origin: f.Departure.location,
      destination: f.Arrival.location,
      departAt: isoAt(f.Departure),
      arriveAt: isoAt(f.Arrival),
      durationMin: parseIsoDuration(f.duration),
      aircraft: f.equipment,
      cabin: fareBySeq.get(s.sequence)?.cabin,
      checkedBags: checked,
      carryOnBags: carryOn,
    });
  }

  const first = segments[0];
  const last = segments[segments.length - 1];
  return {
    origin: first.origin,
    destination: last.destination,
    departAt: first.departAt,
    arriveAt: last.arriveAt,
    durationMin: parseIsoDuration(product.totalDuration),
    stops: Math.max(0, segments.length - 1),
    segments,
  };
}

function refundability(terms: TpTerms | undefined): { refundable?: boolean; changeable?: boolean } {
  const p = (terms?.Penalties || [])[0];
  if (!p) return {};
  const read = (list?: { "@type"?: string }[], permitted?: string, denied?: string) => {
    if (!list?.length) return undefined;
    if (list.some((x) => x["@type"] === denied)) return false;
    if (list.some((x) => x["@type"] === permitted)) return true;
    return undefined;
  };
  return {
    refundable: read(p.Cancel, "CancelPermitted", "CancelNotPermitted"),
    changeable: read(p.Change, "ChangePermitted", "ChangeNotPermitted"),
  };
}

function collectCandidates(groups: TpGroup[]): Candidate[] {
  const out: Candidate[] = [];
  for (const g of groups) {
    for (const opt of g.ProductBrandOptions || []) {
      for (const off of opt.ProductBrandOffering || []) {
        const total = off.BestCombinablePrice?.TotalPrice;
        const currency = off.BestCombinablePrice?.CurrencyCode?.value;
        const productRefs = (off.Product || []).map((p) => p.productRef);
        if (typeof total !== "number" || !currency || !productRefs.length) continue;
        out.push({
          groupId: g.id,
          offering: off,
          productRefs,
          total,
          currency,
          codes: new Set(off.CombinabilityCode || []),
        });
      }
    }
  }
  return out;
}

function shareCode(a: Candidate, b: Candidate): boolean {
  for (const c of a.codes) if (b.codes.has(c)) return true;
  return false;
}

async function search(q: FlightQuery): Promise<NormalizedFlightOffer[]> {
  if (!hasTravelport()) return [];
  const c = creds();
  const token = await accessToken();

  const passengers: { "@type": string; number: number; passengerTypeCode: string; age?: number }[] = [
    { "@type": "PassengerCriteria", number: q.adults, passengerTypeCode: "ADT" },
  ];
  if (q.children) {
    passengers.push({ "@type": "PassengerCriteria", number: q.children, passengerTypeCode: "CNN", age: 8 });
  }

  const legs = [
    { "@type": "SearchCriteriaFlight", departureDate: q.departDate, From: { value: q.origin }, To: { value: q.destination } },
  ];
  if (q.returnDate) {
    legs.push({
      "@type": "SearchCriteriaFlight",
      departureDate: q.returnDate,
      From: { value: q.destination },
      To: { value: q.origin },
    });
  }

  const cabinMap: Record<string, string> = {
    economy: "Economy",
    premium_economy: "PremiumEconomy",
    business: "Business",
    first: "First",
  };
  const modifiers: Record<string, unknown> = {
    "@type": "SearchModifiersAir",
    CabinPreference: [{ "@type": "CabinPreference", preferenceType: "Preferred", cabins: [cabinMap[q.cabin] || "Economy"] }],
  };
  if (q.maxConnections !== undefined) modifiers.maxNumberOfStops = q.maxConnections;

  const body = {
    CatalogProductOfferingsQueryRequest: {
      CatalogProductOfferingsRequest: {
        "@type": "CatalogProductOfferingsRequestAir",
        maxNumberOfUpsellsToReturn: 4,
        contentSourceList: ["GDS"],
        PassengerCriteria: passengers,
        SearchCriteriaFlight: legs,
        SearchModifiersAir: modifiers,
      },
    },
  };

  const res = await fetch(`https://${c.host}/${API_VERSION}/air/catalog/search/catalogproductofferings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Version": API_VERSION,
      "Content-Version": API_VERSION,
      XAUTH_TRAVELPORT_ACCESSGROUP: c.accessGroup,
      E2ETrackingID: `thedeparture-${Date.now()}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Travelport search ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const j = (await res.json()) as TpResponse;
  const root = j.CatalogProductOfferingsResponse;
  const groups = root?.CatalogProductOfferings?.CatalogProductOffering || [];
  if (!groups.length) return [];

  const refs = root?.ReferenceList || [];
  const flights = new Map<string, TpFlight>();
  const products = new Map<string, TpProduct>();
  const terms = new Map<string, TpTerms>();
  for (const r of refs) {
    for (const f of r.Flight || []) flights.set(f.id, f);
    for (const p of r.Product || []) products.set(p.id, p);
    for (const t of r.TermsAndConditions || []) terms.set(t.id, t);
  }

  // A search for DXB also returns nearby city points (XNB, Dubai's bus
  // station). Keep only groups for the pair that was actually asked for.
  const outboundGroups = groups.filter((g) => g.Departure === q.origin && g.Arrival === q.destination);
  const inboundGroups = groups.filter((g) => g.Departure === q.destination && g.Arrival === q.origin);

  const txn = root?.transactionId || "";
  const offers: NormalizedFlightOffer[] = [];

  const assemble = (parts: Candidate[], total: number, currency: string): NormalizedFlightOffer | null => {
    const slices: FlightSlice[] = [];
    let termsForOffer: TpTerms | undefined;
    for (const part of parts) {
      const t = terms.get(part.offering.TermsAndConditions?.termsAndConditionsRef || "");
      termsForOffer = termsForOffer || t;
      for (const ref of part.productRefs) {
        const product = products.get(ref);
        if (!product) return null;
        const slice = buildSlice(product, flights, t);
        if (!slice) return null;
        slices.push(slice);
      }
    }
    if (!slices.length) return null;

    const cabin = slices[0].segments[0]?.cabin;
    const owner = slices[0].segments[0];
    const validating = termsForOffer?.ValidatingAirline?.[0]?.ValidatingAirline;
    const ownerIata = validating || owner?.carrier || "";
    const minChecked = Math.min(...slices.flatMap((s) => s.segments.map((g) => g.checkedBags)));

    return {
      supplier: CODE,
      supplierName: NAME,
      offerId: `${txn}|${parts.map((p) => `${p.groupId}:${p.productRefs.join("+")}`).join("|")}`,
      itineraryKey: itineraryKey(slices, cabin),
      ownerIata,
      ownerName: CARRIER_NAMES[ownerIata] || ownerIata || "Airline",
      slices,
      net: total,
      currency,
      checkedBags: Number.isFinite(minChecked) ? minChecked : 0,
      ...refundability(termsForOffer),
      // Travelport's PaymentTimeLimit is a ticketing deadline, not an offer
      // hold, so we do not pass it off as an expiry we have not been given.
      expiresAt: undefined,
      bookable: false,
    };
  };

  if (!q.returnDate) {
    for (const cand of collectCandidates(outboundGroups)) {
      const o = assemble([cand], cand.total, cand.currency);
      if (o) offers.push(o);
    }
  } else {
    // Round trip. TotalPrice on EITHER direction is the price of the whole
    // journey, not of that leg, so the two must never be added together. A
    // valid pairing is an outbound and an inbound that share a combinability
    // code AND quote the same total; that total is the honest price. If no
    // inbound matches, the outbound is dropped rather than priced by guesswork.
    const outs = collectCandidates(outboundGroups);
    const ins = collectCandidates(inboundGroups);
    for (const out of outs) {
      const match = ins.find((i) => i.total === out.total && i.currency === out.currency && shareCode(out, i));
      if (!match) continue;
      const o = assemble([out, match], out.total, out.currency);
      if (o) offers.push(o);
    }
  }

  // Several brands can resolve to the same itinerary and cabin; keep the
  // cheapest of each so the rate-shop compares like with like.
  const cheapest = new Map<string, NormalizedFlightOffer>();
  for (const o of offers) {
    const prev = cheapest.get(o.itineraryKey);
    if (!prev || o.net < prev.net) cheapest.set(o.itineraryKey, o);
  }
  return [...cheapest.values()];
}

async function priceCheck(): Promise<{ net: number; currency: string; expired: boolean }> {
  // Deliberately unsupported. Travelport can shop for us but cannot ticket for
  // us until IATA accreditation lands, so anything reaching here is a routing bug.
  throw new Error("Travelport is shop-only until IATA accreditation. Route booking to a supplier that can issue");
}

export const travelportAdapter: FlightSupplierAdapter = { code: CODE, name: NAME, status, search, priceCheck };
