# TheDeparture, where this stands

**Last worked: 2026-07-25.** Run `npm run dev` → http://localhost:3070.

Entity: **K Global Travels LLP**, 2nd Floor, Divya Diamonds, Kavuri Hills Road,
Madhapur, Hyderabad 500033. Brand: **The Departure**.

---

## Blocked on you (two values, five minutes)

1. **`DUFFEL_TOKEN`**, paste a `duffel_test_…` into `.env.local`. Flights go
   real and bookable with no code change. Self-serve signup at duffel.com, ~1 min.
2. **GitHub repo URL**, the repo is committed locally (6 commits) with no
   remote. `git remote add origin <url> && git push -u origin main`, then Vercel.

Also needed before the legal pages can be published: **LLPIN, GSTIN, contact
email/phone, and the Grievance Officer** (name/email/phone, mandatory under the
IT Rules). They live in `lib/company.ts` and currently render as visible
`[…]` placeholders on `/privacy` and `/terms`. Two clauses need a commercial
decision, flagged inline in `/terms`: **§6** is our margin refundable on
cancellation / is there a service fee, and **§9** the liability cap.

---

## What works right now

| | State |
|---|---|
| Landing page | Live. Ported from the design-canvas artifact to real React |
| Hotel search → rooms → prebook → quote | **Real** (LiteAPI, public sandbox key) |
| Worldwide airport + city search | **Real**, 5,328 airports, no API key |
| Calendar range picker | Real, no dependency |
| Currency INR / AED / USD | **Real**, supplier-priced natively |
| Flight search, compare, cheapest-of-N, bag filter | Works on **synthetic** suppliers |
| Flight booking → PNR | Code written and typechecked, **never executed** |
| Privacy / Terms | Draft, pending legal review + missing details |
| Deploy | Not done |

---

## Decisions that are load-bearing, don't quietly undo these

**1. We never convert currency.** Changing currency re-queries the supplier. A
price is only ever shown in a currency the supplier actually priced in. LiteAPI
takes a currency parameter, so hotel quotes are native and real. Duffel has no
such parameter and prices in the airline's currency, so air offers display in
their own currency and say so. Applying our own FX rate would mean charging a
traveller against a number that is stale by the time they pay, with the gap
coming out of the margin. If a single display currency is wanted, it needs a
real FX source with a visible timestamp and a decision about who wears the
spread. That's a business call.

**2. A supplier that cannot issue can never be handed a booking.** Enforced by
the type system, not a runtime check: `book()` and `passengerSlots()` are
optional on `FlightSupplierAdapter`, and shop-only suppliers simply do not
implement them. `shopFlights` tracks `best` (cheapest anywhere) separately from
`bestBookable` (cheapest that can actually issue).

**3. No invented numbers.** The checked-bag filter *filters*; it never adds a
guessed bag fee. Cross-currency quotes for the same flight are marked "not
directly comparable" rather than being ranked against each other. Missing
company details render as visible placeholders.

**4. Landing showcase prices are real, and cached.** 15 min for the headline
rows, 6 h for the "from" destination cards, currency in the cache key. LiteAPI's
free tier is priced on look-to-book, and uncached landing traffic is exactly
what blows that ratio. Duffel charges $0.005/search past 1500:1.

---

## Flight API landscape (researched 2026-07-25)

- **Duffel, the answer.** Only self-serve, no-IATA rail left. Issues on its own
  accreditation. Test mode free. Live: $3/confirmed order, 1% managed content,
  $1/paid ancillary, $0.005/search past a 1500:1 search-to-book ratio.
- **Amadeus Self-Service, DEAD.** Amadeus decommissioned the self-service
  developer portal on **17 July 2026**: registration shut, existing keys
  disabled. Only the Enterprise portal survives (contract + account manager).
  The adapter is kept for a legacy key or a future Enterprise deal, and its
  status note says CLOSED so nobody chases a key that can't be issued.
- **Travelpayouts**, affiliate, redirects out, can't issue. Useless here.
- **Kiwi Tequila**, approval required, not self-serve.
- **TBO / TripJack**, phase 2. KYC + wallet, India domestic + LCC breadth.

---

## Code map (what's new since PORTAL.md)

```
app/page.tsx              landing; live showcase via Suspense
app/flights/              results · book (passenger form) · confirmed (PNR)
app/privacy · app/terms   legal, driven by lib/company.ts
app/api/places            airport/city typeahead, 11-30ms
lib/flights/              types · duffel · duffel-adapter · amadeus-adapter · demo-adapter · registry
lib/flightshop.ts         air rate-shop: fan out, group by exact itinerary, cheapest net
lib/places.ts             worldwide index + ranking (+ alias table for renames)
lib/currency.ts           shared constants (client-safe)
lib/currency.server.ts    cookie > IP > env resolution (next/headers)
lib/company.ts            single source for the legal entity
lib/anchor.mjs            popover placement maths (pure, tested)
data/airports.json        347 KB, built by scripts/build-airports.js
scripts/test-anchor.mjs   22 assertions, node scripts/test-anchor.mjs
```

Flight identity is exact (carrier + flight number + date), unlike the fuzzy
name+city `mapKey` hotels still use. Cross-supplier hotel mapping remains the
known weak point, it will mis-match at 3+ hotel suppliers and needs
GIATA/Vervotech before then.

---

## Environment gotchas on this box

- **`gstack /browse` will not start.** Stale "another instance is starting"
  mutex, no lock file to clear, `stop`/`restart` don't shift it. So the search
  bar's dropdown fix is verified by `node scripts/test-anchor.mjs` (22
  assertions across 375–1920px), **not by eye**. Worth a visual pass when a
  browser is available.
- **Disk was 100% full** (0 bytes of 238 GB) at the start of this session. I
  cleared the 11 GB npm cache; you're at ~96%. `Downloads` is **~20 GB** and is
  the obvious next win, your call, I haven't touched it.
- `taskkill //F //IM node.exe` before `npm run build`, or the dev server holds
  `.next` and the build dies with EPERM.
- `PHOTO-2026-07-17-15-04-41.jpg` sits in the repo root, deliberately
  uncommitted. Delete it or tell me it belongs.

---

## Next, in order

1. Duffel token → verify the booking path end-to-end against test airlines.
   This is the one path that has never actually run.
2. Push to GitHub, deploy to Vercel with `ENABLE_DEMO_AIR=false` so the public
   site never shows invented fares.
3. Fill in the company/legal details, get the policies reviewed.
4. Then: agent auth + wallet + ledger, Supabase persistence, WhatsApp intake,
   packaging/bundles, a second real hotel supplier (RateHawk/Rezlive).
