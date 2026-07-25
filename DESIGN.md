# TheDeparture — Design System & Product Spec

> Source of truth for the Figma build. One design system, two front doors
> (B2C traveller + B2B agency console), one brand promise.

---

## 1. Positioning

**TheDeparture — the booking platform that actually picks up the phone.**

Same rate-shopped prices as any OTA, but **service is the product, not an
afterthought.** Price is table stakes; the human is the brand.

- **B2C** — "Book for your family and friends. We've got them if anything goes
  wrong — and you earn when they book through you."
- **B2B** — "Sell to your clients on our net + your markup. We're the ops team
  behind you: named agents, WhatsApp threads, real SLAs."

Same promise ("we're on it"), two audiences. The two sides share a login and a
design system but read as two products.

### The moat (what the design must scream)
1. **Affiliate graph** (B2C) — every happy customer becomes a micro-agent. A
   network effect competitors can't copy.
2. **Service SLA** (B2B) — an operational muscle OTAs structurally *won't* build
   because it kills their margin.
3. **Rate-shop engine** (shared, already built) — parallel fan-out to flight +
   hotel APIs, pick the cheapest net, add margin. Table stakes, but proof we
   always sell the floor.

---

## 2. The design rule: service is never buried

Service-as-hero is a layout law, not a page. It appears on every screen:

- **Every booking row** carries a live status pill (flip-board style), a
  **named agent**, and a one-tap **call / WhatsApp** affordance.
- **The Departures Desk** — a persistent support surface, always one tap away,
  showing open tickets as a live board.
- **SLA is visible** — "we respond in <5 min" badge; a response countdown on
  open tickets.
- **The disruption moment is the showcase** — a delayed/cancelled flight shows
  *we already know and we're on it*, never "contact support." A cancellation is
  a status flip with an agent already assigned, not a scary red error.

The FIDS aesthetic reinforces this: flip-board rows, live statuses, and
monospace timestamps all read as "someone is watching this in real time."

---

## 3. Aesthetic — Full Rove: cool-slate, glassy, cinematic (no gold)

**Reference: rove.com (the real thing).** Cool dark-slate canvas, white/silver
type, NO metallic accent — the only color comes from **full-bleed cinematic
travel photography**. Glassy translucent surfaces, generously rounded corners,
a friendly soft-geometric wordmark, a floating glass search bar, a dotted-grid
world-map texture, and floating destination cards stamped with airport codes.
Modern travel-tech: approachable, cinematic, high-trust. NOT warm, NOT gold,
NOT a dense dashboard.

**Committed direction: full Rove look, friendly-glassy.** Cool neutrals, white
as the interactive accent, glass + blur, large radii, light-weight geometric
sans. Photography carries all the warmth and color. The FIDS heritage survives
*only* as the **airport-code stamp** on cards and the status treatment — it is a
detail, not a mechanical control-panel.

- **Mood:** cool, cinematic, glassy, friendly-premium. Aspirational travel-tech.
- **Hero:** full-bleed photography + a floating glass search bar on top + big
  centered brand moment + one confident tagline. Floating destination cards
  (photo + city + airport code) overlap the hero.
- **Imagery is the color:** the palette itself is monochrome cool; every hit of
  warmth/color comes from travel photography. Use it generously as hero and card
  fills — Rove leans on imagery, not accent colors.
- **Glass:** translucent dark surfaces with backdrop-blur for the search bar,
  nav, cards, and overlays. Thin light borders (white at low opacity).
- **Motion:** slow, smooth, premium easing; soft fades and gentle float on
  cards. Optional subtle split-flap on status/numerics as a nod to FIDS.
- **Numerics:** tabular figures for prices, times, codes — clean, not a heavy
  monospace board.

### Color tokens — cool slate, white accent (Rove palette)

```
NEUTRALS (cool dark-slate spine)
--bg              #0D1117   cool near-black slate canvas (gradient to #151C24 up top)
--bg-elev         #151C24   raised gradient / nav band
--surface         rgba(255,255,255,0.06)   glass card / search bar (add blur)
--surface-2       rgba(255,255,255,0.10)   glass hover / nested
--border          rgba(255,255,255,0.10)   thin light hairline on glass
--text            #F5F7FA   primary cool white
--text-dim        #9BA6B2   secondary cool grey / labels
--text-mute       #5B6673   tertiary / disabled

ACCENT — white/silver (Rove uses no color accent)
--accent          #FFFFFF   primary interactive: white pill button (dark text)
--accent-dim      rgba(255,255,255,0.72)   secondary interactive / hover text
--focus-glow      rgba(255,255,255,0.25)   soft white focus ring / glow
--moonlight       #6EA8FF   OPTIONAL cool-blue micro-accent for links/focus only
```
> The gold logo does NOT match this cool palette. Ship a **white/silver
> monochrome variant** of the mark for on-slate use. Reserve the gold original
> for light/print contexts. See §8 + Open Questions.

### Status in cool monochrome (treatment, not traffic-lights)
Palette stays cool + white. Status reads through **treatment + white luminance +
a glyph**, never a rainbow of hues:

```
Confirmed / on-time / paid     → SOLID white pill, dark text
Pending / action needed        → glass OUTLINE pill (white text)
In progress / agent active     → glass pill + soft white pulse/glow
Delayed / SLA warning          → DIM white (60%) + ▲ caret, subtle pulse
Cancelled / failed / overdue    → muted grey glass, strikethrough + ✕ glyph
```
Carried by **fill vs glass-outline vs dim vs strikethrough + icon glyph**, so it
stays legible and accessible (never color alone).

> Optional single soft state color: a muted `--alert #C4574F` (desaturated to
> sit in the cool palette) ONLY for hard money-losing failure (payment declined,
> booking lost). Default to grey strikethrough first. See Open Questions.

### Typography — Hanken Grotesk (one family, whole system)
**Typeface: Hanken Grotesk** everywhere — a clean humanist grotesk with friendly
rounded terminals and true tabular figures. Covers display, UI, and numerics, so
no second face is needed. Matches the friendly-glassy Rove personality.

- **Wordmark / display:** Hanken Grotesk Light/Regular, lowercase-friendly, big
  and airy for hero brand moments and page titles.
- **Headlines:** Hanken Grotesk Light (300) at generous size, one confident line
  per hero with lots of space (model: Rove's "Earn the first universal airline
  mile" — light, centered, calm).
- **UI / body:** Hanken Grotesk Regular/Medium (400/500), gentle tracking.
- **Labels / eyebrows:** Hanken Grotesk Medium, letter-spaced + uppercase for the
  small "FROM / TO / DATES" style labels.
- **Numerics:** Hanken Grotesk **tabular figures** (`font-variant-numeric:
  tabular-nums`) for prices, times, airport codes — aligned columns, clean, not a
  heavy monospace board.
- **Weights in play:** 300 (headlines), 400 (body), 500 (UI/labels), 600 (rare
  emphasis). Lean light — never heavy/bold fills.
- **Rule:** light weights + generous space + glass + photography carry the feel.
  Approachable and modern, not dense. Never fill the frame.

### Layout & components (Rove structural kit)
- **Glass search bar** — the signature hero element. Floating translucent
  (blur) bar: From / To (swap) / Dates, with Flights / Hotels / Shopping tabs
  above and a round search button. Sits over the photographic hero.
- **Full-bleed photo hero** — cinematic travel photography, dark-overlaid, with
  a subtle **dotted-grid world-map texture** on top. Big centered brand + one
  light tagline. This is the color of the whole product.
- **Floating destination / trip card** — rounded (14–18px), photo fill, dark
  glass label bar: city name + **airport code** (FRA / CHN / USA). The FIDS
  heritage lives here. Cards gently float/overlap the hero.
- **Booking row** — glass row: route/hotel + traveller, tabular time, status
  pill, agent chip, action. Stacked on the slate with thin light hairlines.
- **Status pill** — glass; state via fill/outline/dim/strikethrough + glyph,
  never by hue (see status system).
- **Agent chip** — avatar + name + white call/WhatsApp icon. On every booking.
- **SLA badge / countdown** — clean tabular timer.
- **Nav** — minimal top bar: centered section tabs, wordmark left, Sign in +
  white **Sign-up pill** right. Glass on scroll.
- **Departures Desk drawer** — persistent glass support surface; open tickets.
- **Chat bubble** — floating dark glass pill, bottom-right (the always-on
  service affordance; ties to service-as-hero).
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96. Push large —
  Rove-level negative space. Nothing packed.
- Radii: **large** — cards 14–18px, search/inputs 12–14px, buttons full-pill.
  Friendly-glassy, not sharp.
- **Surface split:** cinematic photo-hero treatment for marketing / consumer /
  login / empty states; calmer glass-row density for working ops screens (agent
  console, ticket queue, ledger). Same cool tokens, different density.

---

## 4. Screen inventory (12 frames, one system)

### Shared shell / design system
1. **Design tokens & components** — the board system: canvas, flip-board rows,
   split-flap accent, monospace numerics, live-status color set, status pill,
   agent chip, SLA badge, buttons, inputs.
2. **Global nav + Departures Desk** — nav shell for both sides; the persistent
   support drawer showing open tickets as a live board.

### B2C (traveller)
3. **Search → rate-shop results** — flights + hotels. "Checked N suppliers,
   here's the floor + your saving." Cheapest-net picker made visible.
4. **Booking flow — "who's travelling"** — self vs family/friends baked in as a
   first-class step (traveller ≠ payer; this is the affiliate mechanic in
   disguise). Saved co-travellers.
5. **My Trips** — flip-board of upcoming/past trips, live status, named agent on
   each row.
6. **Referral / affiliate dashboard** — invite your circle, share link/code,
   pending vs paid earnings, payout wallet, "I saved ₹X" share card.
7. **Disruption / after-sales (the hero moment)** — flight delayed/cancelled:
   "we already know, agent X is on it," rebook options, live status, WhatsApp
   thread.

### B2B (agency console)
8. **Agent dashboard** — bookings board, today's departures, open tickets,
   credit balance. The control tower.
9. **Booking flow — markup control** — your net → agency sets its own price →
   client price. Agency prices the resale.
10. **Ledger / credit** — statements, invoices, GST, settle-up. Book on credit,
    settle later.
11. **After-sales ticket queue** — reschedules / refunds / no-shows with SLA
    timers and status. The "top-notch service," systematized.
12. **Team / sub-agents** — multiple staff logins under one agency account,
    roles/permissions.

---

## 5. Shared platform primitives (underlie the screens)
- **Rate-shop engine** — multi-supplier flights + hotels, cheapest net + margin.
  (Built: `lib/rateshop.ts`, `lib/suppliers/*`.)
- **Unified PNR / booking record** — one record per trip regardless of which API
  fulfilled it.
- **Traveller profiles** — passport, DOB, prefs, frequent-flyer, saved
  co-travellers. Serves both sides.
- **Payment + wallet** — card, UPI, Pay10 credit line for agencies; affiliate
  earnings wallet for consumers.
- **Post-booking hub** — cancel, reschedule, refund status, web check-in nudge,
  visa (Sherpa) + eSIM (Airalo) upsell.

---

## 6. Differentiators, restated for the designer
| | OTA (the enemy) | TheDeparture |
|---|---|---|
| Price | cheap | same cheap (rate-shopped floor) |
| Support | chatbot + policy | named human, WhatsApp, real SLA |
| Disruption | "contact support" | "we already know, agent on it" |
| B2C growth | ads | affiliate graph (book for your circle) |
| B2B pricing | fixed | agency sets its own markup on our net |

**Design job:** make the right-hand column *visible on every screen.*

---

## 7. Open questions
- **Logo vs palette** — the gold luxury mark clashes with the cool-slate Rove
  system. Need a **white/silver monochrome logo variant** for on-slate use. Who
  produces it? (Blocks a fully on-brand hero.)
- **Status exception** — allow the single muted `--alert #C4574F` for hard
  failures, or stay 100% cool-monochrome (grey strikethrough only)?
- **Optional micro-accent** — use `--moonlight #6EA8FF` for links/focus, or keep
  interactive strictly white/silver like Rove?
- Affiliate fee structure — flat vs tiered? (shapes the referral dashboard).
- B2C vs B2B: shared login with a mode switch, or separate entry points?
- Do we show the supplier names in the rate-shop, or just "N suppliers checked"?

## 8. Brand assets
- Logo (gold original): `~/thedeparture/PHOTO-2026-07-17-15-04-41.jpg` — black
  field, white serif `D` + gold swoosh, `Thedeparture.ai` wordmark, tagline
  "SMART TRAVEL. AI POWERED." Reserve for light/print.
- **Needed: white/silver monochrome logo** for the cool-slate UI (the gold does
  not sit on this palette). Until it exists, use a plain white wordmark in the
  nav as placeholder.
- Reference aesthetic: **rove.com** — cool slate, glassy, photographic, floating
  airport-code cards, dotted map. This is the visual north star for the build.
