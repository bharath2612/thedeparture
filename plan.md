# thedeparture.ai — Platform Plan

**Last updated: 2026-07-20**
Product/brand: **TheDeparture.ai** · Client entity: K Global · Market: India B2B, Gulf–India corridor first.

---

## 1. What this is

A **multi-aggregator travel rate-shop** on the **no-IATA launch stack**.

> Onboard N suppliers → query them all in parallel → sell the **cheapest net per hotel/flight** with our margin on top → show the traveller ONE price.

No single supplier is cheapest on every hotel. **The shopping is the product.** That's also the agent's reason to route through us: he can't rate-shop 5 portals by hand in 60 seconds.

**Live now:** `~/thedeparture`, Next.js 15, `npm run dev` → http://localhost:3070. LiteAPI hotel rail live; rate-shop engine, supplier-adapter architecture, and `/suppliers` status board built and verified. See `PORTAL.md` for the code map.

---

## 2. The load-bearing finding (why multi-supplier, not "cheap hotels")

We benchmarked our LiteAPI price against Booking.com for **Asma Hotel, Dubai, 19–22 Aug, 2 adults, 3 nights**:

| | All-in (incl. taxes) |
|---|---|
| Booking.com **Genius** (free to join) — what the customer sees | **AED 417** |
| Booking.com non-member (Getaway deal only) | AED 457 |
| **Our LiteAPI net cost** | **AED 429** |
| Our sell @15% | AED 494 |

Booking breakdown: room 303.90 + taxes 113.38 (5% VAT 16.71 · Tourism 45 · 10% service 30.39 · 7% municipality 21.27). Refundable AED 500 deposit is not a cost.

**Conclusion:** on OTA-fire-sale hotels a single bedbank net **cannot beat Booking's Genius price**. Our net (429) ≈ Booking retail (417); at 15% markup we're ~18% *above* Booking's visible price.

**So the pitch is NOT "cheaper hotels than Booking" — that loses.** The real mechanism the user identified:

> **Net rates are per-supplier, per-hotel.** Regional consolidators (Rezlive, TBO, MMT B2B) often beat global bedbanks (LiteAPI, RateHawk) on Gulf–India stock, and vice-versa.

The platform's edge = query all suppliers, always sell the floor. Standalone hotel-only price-vs-Booking is **the one game not to play**. The edge is: multi-sourcing + **packaging** (opaque flight+hotel bundles hide the hotel line so it can't be price-matched) + **captive off-web VFR/agent demand** that never opens Booking.

---

## 3. Why anyone comes to us (B2B / B2C)

**B2B (the real business).** The agent isn't buying price — he's buying the ability to serve a client who never opens Booking (Deira/Karama VFR family, small corporate; pays by UPI/cash on WhatsApp). Money flow:
```
LiteAPI net            AED 429
Platform price (+8%)   AED 463   ← K Global's thin, invisible cut
Agent's price to client AED 560  ← agent's own markup, set by his relationship
```
The agent's client isn't comparing to 417. We are his **supply + back-office**, not his competitor. What he gets that a raw API/Booking-affiliate can't give: 60-second quote engine, his branding + markup control, one wallet/ledger/settlement, WhatsApp intake, traveller vault (passports prefilled → corporate can't leave), packaging + ancillaries.

**B2C (later, never "a cheaper Booking").** Only the VFR traveller on WhatsApp who wants an opaque flight+hotel package, baggage-aware search, visa+eSIM+transfer in one thread. Price-shoppers are not our customer.

**THE BET TO VALIDATE (cheap test: show pricing to 5 real Deira/Karama agents):**
> There is a large, repeating pool of Gulf–India travellers who book through trusted agents on WhatsApp and do NOT price-shop hotel-only on Booking.
If false — if that demand is on Booking comparing — the model breaks. Validate before building more.

---

## 4. Architecture (built)

| File | Role |
|---|---|
| `lib/suppliers/types.ts` | `SupplierAdapter` interface every aggregator implements + naive name+city `mapKey` for cross-supplier hotel dedup |
| `lib/suppliers/liteapi-adapter.ts` | LiteAPI, **live** (public sandbox key by default) |
| `lib/suppliers/stub-adapter.ts` | Factory for ready-to-key stubs (Rezlive/RateHawk/TBO) — show on `/suppliers` as "not connected" until keyed + implemented |
| `lib/suppliers/demo-adapter.ts` | Synthetic DEMO-AGG (`ENABLE_DEMO_SUPPLIER=true`) — perturbs LiteAPI rates so you can watch the cheapest-picker |
| `lib/suppliers/registry.ts` | All suppliers registered here |
| `lib/rateshop.ts` | `shop(query)`: parallel fan-out → group by mapKey → **pick MIN net** → markup → record winner + who else quoted + saving. `prebookVia(supplier, offerId)` routes booking to the winner. |
| `lib/markup.ts` | Markup engine — % on cheapest net = K Global's margin |
| Pages | `/` search · `/results` (winner badge, cheapest-of-N, per-supplier compare) · `/hotel/[id]` (rooms across suppliers, tagged) · `/quote` (boarding-pass ticket) · `/suppliers` (status board) · `/plan.html` (strategy deck) |

**Verified:** DEMO-AGG AED 390 beat LiteAPI AED 425 → picker chose 390 → sell 449. `tsc --noEmit` clean. Booking flow (search→rates→prebook) proven against live LiteAPI sandbox.

⚠️ **Cross-supplier hotel mapping is naive (name+city).** This is the hard part of multi-supplier — it will mis-match at 3+ hotel suppliers. Production needs a real mapping layer (GIATA / Vervotech, or lean on Zentrum's pre-mapped IDs). Flagged in `types.ts`, not hidden.

---

## 5. Supplier onboarding roadmap

**The rate-shop lens:** hotels → go DEEP (overlapping nets so "cheapest of N" is real); flights → go BROAD (corridor coverage, no-IATA); ancillaries → one each (pure-margin attach, NOT rate-shopped).

### Wave 1 — make "cheapest of N" real on hotels (NOW)
| Add | Why | Effort |
|---|---|---|
| **RateHawk** | 3.2M props, huge overlap with LiteAPI → picker has something to pick. REST + sandbox, ~1–2 wk. | Low |
| **Rezlive** | First India-contracted net — where you beat bedbanks (and sometimes Booking) on Gulf–India stock. Free sandbox. | Low–med |

→ **User is talking to BOTH RateHawk and Rezlive tomorrow (2026-07-21).** These turn the synthetic DEMO-AGG into two real competing suppliers = the MVP of the thesis.

### Wave 2 — deepen hotels + first flights
- **Zentrum Hub** — one integration → Hotelbeds + 100+ suppliers, pre-mapped (helps mapping problem). ~15 days.
- **TBO** — India domestic hotels + LCC flights (doubles as a flight rail), wallet.
- **Duffel** — first flight rail, NDC, no IATA.
- **Amadeus Self-Service** — flight content, free quota, no IATA.

### Wave 3 — flight breadth + margin
- India consolidators: **TripJack / Riya / Akbar** (wallet + KYC = calendar time). Domestic + LCC + intl air.
- **Expedia Rapid** — global hotel demand, short cert.

### Ancillaries — parallel, low effort, pure margin (not shopped)
- **Mozio** (transfers, live in hours) · **Airalo** (eSIM, affiliate 10%+) · **Sherpa** (visa, 30% rev-share) · **Viator / GetYourGuide / Klook** (activities, ~8% affiliate now → 20–30% via API).

### Skip / don't promise (over-promise traps)
- **Hotelbeds direct** → reach via Zentrum instead.
- **MakeMyTrip myPartner** → ⚠️ portal/wallet, **no public API** — rates may be cheaper but **can't auto-shop**. Manual fallback at best, not an adapter.
- **Booking.com Demand** (closed) · full GDS — **Travelport / Amadeus Enterprise / Sabre full** (need IATA/contract) · **Cover Genius** (US$250M floor) · **DragonPass / Skyscanner API / Kiwi affiliate**.

---

## 6. Flight side (detail)

**The gate on flights is ticketing authority, not content.** Without IATA you can't plate a ticket, so a flight supplier only counts if it FULFILLS:
- **Duffel** — issues on its own IATAs, no accreditation needed. ✅ bookable.
- **India consolidators** — issue on their IATA, you resell on their wallet. ✅ bookable.
- **Amadeus Self-Service** — great for search/price content, but issuance is the catch. ⚠️ shop, don't book.

**Flight shortlist:**
| Supplier | Role | Get it |
|---|---|---|
| **Duffel** | Build FIRST. Gulf carriers (Emirates, flydubai, Air Arabia) + NDC + LCCs. Modern REST, sandbox ~1 min. | **Self-serve, no call** — just sign up. |
| **One India consolidator** (lean: **TBO**, doubles as hotel supplier; or TripJack/Riya) | India domestic + IndiGo/Air India Express + LCC + ticketing muscle. | KYC + wallet + GST — a sales call. |
| **Amadeus Self-Service** | Price-benchmark/content only. | Self-serve sandbox. |

**Two flight-specific truths:**
1. **Flight mapping is trivial** (carrier + flight no + date + fare class = clean key) — the hotel-mapping nightmare doesn't apply. "Cheapest of N" on the same Emirates DXB→COK just works.
2. **"Cheapest" ≠ lowest headline fare — rank on total cost INCLUDING baggage** (`plan.html` differentiator 01: VFR flying 40kg of gifts; no metasearch prices bags). Real edge.

**Defer:** Kiwi/Tequila (virtual interlining = own the missed-connection risk, needs capital) · IndiGo/Air India direct NDC (reach via consolidator at launch, direct is Phase 2) · Skyscanner (metasearch/traffic channel, not a supplier).

**For the call list tomorrow:** add **Duffel** (just create a sandbox account, no call) + **one consolidator** (TBO / TripJack / Riya — same KYC+wallet+GST conversation as the hotel guys).

---

## 7. Context / constraints

- Entity: GST registered. **IATA possibly in ~30 days** — ⚠️ confirm **TIDS vs full BSP** (TIDS unlocks no ticketing). IATA only upgrades the low-margin flight/GDS leg; hotels + ancillaries (the money) never needed it. **Build now, don't wait for IATA.**
- Praveen is **partnering with departure.ai** (may become a partner).
- LiteAPI cost model: **no commission**, core booking free on reasonable look-to-book (their margin is in the net). Cache rate searches so AI-query volume doesn't blow the free tier. Price-index $0.05/req, places $0.01/req.
- Full supplier tiering: `~/kglobal/API_ELIGIBILITY.md` + `~/kglobal/providers-deck.html`.
- `/browse` (gstack) is flaky on this Windows box (stale startup mutex) — verify via curl.

---

## 8. Next actions

1. **Tomorrow (Praveen):** RateHawk + Rezlive calls (hotels); create Duffel sandbox + line up one consolidator (flights).
2. **Build (me):** RateHawk adapter and/or Duffel adapter against real sandbox the moment keys exist — turns "cheapest of N" from synthetic to real on both hotels and flights. Wire baggage-aware ranking with the Duffel adapter.
3. **Decide before 4 suppliers deep:** hotel-mapping approach (fuzzy geo+name vs GIATA/Vervotech vs Zentrum spine).
4. **Validate the bet:** show pricing to 5 Deira/Karama agents — do their clients book at the agent's markup, or check Booking?
5. **Then:** packaging/bundle flow · expose `/rates/book` + guest form + wallet debit · agent auth/wallet/ledger · Supabase persistence · WhatsApp intake.
