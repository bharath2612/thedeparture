# thedeparture.ai — portal

**Multi-aggregator hotel rate-shop** on the **no-IATA launch stack**. Onboard N
suppliers → query them all in parallel → sell the **cheapest net per hotel** with
K Global's margin on top → one price to the traveller. No single supplier is
cheapest on every hotel; the shopping is the product.

## The rate-shop (the core)

- `lib/suppliers/types.ts` — the `SupplierAdapter` interface every aggregator implements. Onboarding one = drop in its key + implement `search()`/`prebook()`.
- `lib/suppliers/registry.ts` — all suppliers. **LiteAPI live**; **Rezlive / RateHawk / TBO** are ready-to-key stubs; **DEMO-AGG** is a synthetic supplier (`ENABLE_DEMO_SUPPLIER=true`) that perturbs LiteAPI rates so you can *watch* the cheapest-picker before real suppliers are keyed.
- `lib/rateshop.ts` — `shop(query)`: parallel fan-out to all live suppliers → group by `mapKey` → pick **MIN net** per hotel → apply markup → record who won + who else quoted + the saving. `prebookVia(supplier, offerId)` routes booking to the winning supplier.
- `/suppliers` — status board: which aggregators are live / keyed / not connected.
- ⚠️ **Cross-supplier hotel mapping is naive (name+city `mapKey`).** This is the hard part of multi-supplier — a production build swaps it for GIATA / Vervotech / Zentrum content mapping. Flagged in `types.ts`, not hidden.

## Why multi-supplier (the strategy)

A single bedbank net can't beat Booking's Genius price on OTA-discounted hotels
(proven: LiteAPI net on Asma ≈ Booking retail). Different suppliers win different
hotels — regional consolidators (Rezlive/TBO/MMT) often beat global bedbanks on
Gulf–India stock. The platform's edge is querying all of them and always selling
the floor. That's also the agent's reason to route through us: he can't rate-shop
5 portals by hand in 60 seconds.

---

Original single-supplier notes below still hold for the LiteAPI leg.

## Run it

```bash
npm install
npm run dev        # http://localhost:3070
```

Runs out of the box on LiteAPI's **public sandbox key** (test data). To use your
own account, put your key in `.env.local`:

```
LITEAPI_KEY=sand_xxxx     # your sandbox key
# LITEAPI_KEY=prod_xxxx   # production, when ready to take real bookings
DEFAULT_MARKUP_PCT=15     # K Global's margin (the whole business)
DEFAULT_CURRENCY=AED
```

The FIDS masthead shows `ENV: SANDBOX / LIVE` so you always know which key is active.

## What works today

- **`/`** — FIDS-style search (destination, dates, guests) + quick-pick Gulf–India cities.
- **`/results`** — live LiteAPI hotels for the city/dates, cheapest marked-up price per hotel, sorted.
- **`/hotel/[id]`** — rooms with live rates, free-cancel flag, and an **operator strip** showing net / margin / sell.
- **Lock price** (server action) → **`/rates/prebook`** locks the net rate → **`/quote`** boarding-pass ticket with the held ref.
- **`/plan.html`** — the original strategy deck, preserved.

## Architecture

- **Next.js 15 App Router + TS**, Vercel-ready. Port 3070.
- `lib/liteapi.ts` — server-only client (`X-API-Key` never reaches the browser). Base `https://api.liteapi.travel/v3.0`. Contract verified against the live sandbox: `search → rates → prebook → book`.
- `lib/markup.ts` — the markup engine. Applies a % on `retailRate.total` (the net). Later: per-agent / per-supplier rules from the DB.
- Rates are fetched server-side with `cache: no-store` (prices are volatile).

## Not built yet (next milestones)

1. **Book** — `/rates/book` is wired in `lib/liteapi.ts` but not exposed; needs guest form + agent-wallet debit before calling it.
2. **Agent accounts + wallet + ledger** — currently a single global markup, no auth.
3. **Persistence** — Supabase for hotel static content (cache places/content, protect the look-to-book ratio), bookings, agents, markup rules.
4. **Second hotel rail** — RateHawk beside LiteAPI (the abstraction layer makes it a config add).
5. **Flights** — TripJack/TBO consolidator rail + Duffel (no IATA needed).
6. **WhatsApp intake** — WABA message → quote engine.

## LiteAPI cost model (why hotels is the business)

LiteAPI takes **no commission** — core booking (rates → prebook → book) is free
on a reasonable look-to-book ratio. Their margin is baked into the net rate; we
add ours on top and keep 100% of it. Watch the look-to-book ratio: cache rate
searches so speculative AI queries don't blow the free tier.
