import Link from "next/link";
import { Suspense } from "react";
import SearchPanel from "@/components/SearchPanel";
import { AgentChip, ChatDock, SiteFooter, SlaBadge, StatusPill } from "@/components/Bits";
import { destinationCards, showcaseFlights, showcaseHotels } from "@/lib/showcase";
import { money, defaultMarkupPct } from "@/lib/markup";
import { activeFlightSuppliers, FLIGHT_SUPPLIERS } from "@/lib/flights/registry";
import { activeSuppliers } from "@/lib/suppliers/registry";
import { formatDuration } from "@/lib/flights/types";
import { resolveCurrency } from "@/lib/currency.server";
import { showOpsPricing } from "@/lib/opsview";

// Air times arrive as local ISO strings ("2026-08-19T18:40:00"). Slicing beats
// Date parsing here: constructing a Date would re-project them into the
// server's timezone and show the wrong local departure time.
function hhmm(iso: string): string {
  return (iso || "").slice(11, 16);
}

function isoDaysOut(days: number): string {
  return new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
}

const STEPS = [
  {
    num: "1",
    title: "We find the best price",
    body: "We fan out to every connected supplier at once and show you the lowest net we can find — so you always save real money.",
    img: "/img/step-1.webp",
  },
  {
    num: "2",
    title: "Book in seconds",
    body: "Book for yourself or your whole circle. Saved co-travellers, one tap. A named agent is attached from the start.",
    img: "/img/step-2.webp",
  },
  {
    num: "3",
    title: "We're on it, always",
    body: "Delay at 2am? We already know. Your agent has rebook options held and a WhatsApp thread open before you notice.",
    img: "/img/step-3.webp",
  },
];

// The band headline is a function of the tab: someone on Hotels should not be
// sold a flight promise. Same claim underneath both — cheapest net, real agent
// — said in the language of what they're actually shopping for. The badge is
// deliberately identical across tabs: it's the brand line, not a mode line, so
// it must not flicker when the tab changes.
const BADGE = "Smart travel · AI powered · We are with you on every trip";

const BAND_COPY = {
  flights: {
    badge: BADGE,
    title: (
      <>
        Book smarter. <span className="grad">Land cheaper.</span>
      </>
    ),
    sub: "One search across every supplier we're connected to — and a named agent on the trip, not a ticket queue.",
  },
  hotels: {
    badge: BADGE,
    title: (
      <>
        Check in for less. <span className="grad">Stay a night longer.</span>
      </>
    ),
    sub: "We price the same room across every connected supplier and sell you the cheapest — with the same agent on the booking if anything moves.",
  },
} as const;

const PILLARS = [
  {
    num: "01",
    title: "An agent there to assist you",
    body: "Our agent is on every booking — a real person, one tap away on WhatsApp. No policy menus, no ticket purgatory, no bots.",
  },
  {
    num: "02",
    title: "A real SLA, in writing",
    body: "We respond in under five minutes and show the countdown live. Service isn't buried in the footer — it's on every screen.",
  },
  {
    num: "03",
    title: "The floor, every time",
    body: "We fan out to suppliers in parallel, pick the cheapest net, and prove it. Same price as any OTA — the human is the upgrade.",
  },
];

export default async function Home() {
  const currency = (await resolveCurrency()).code;
  const air = FLIGHT_SUPPLIERS.map((s) => s.status());
  const liveAir = air.filter((s) => s.live);
  const liveHotel = activeSuppliers().map((s) => s.status());
  const flightsLive = liveAir.length > 0;
  const totalLive = liveAir.length + liveHotel.length;

  const supplierLine = totalLive
    ? `We query ${totalLive} connected supplier${totalLive > 1 ? "s" : ""} in parallel and sell the cheapest net — every time.`
    : "No suppliers connected yet — add a key to go live.";

  return (
    <>
      {/* Search first. The traveller who arrives ready to book should not have
          to scroll past a manifesto to type a city. The brand statement still
          exists — it moved below, where it reads as a reason to trust us rather
          than an obstacle between the header and the search field. */}
      <section className="searchband">
        <div className="inner">
          <SearchPanel
            defaults={{
              depart: isoDaysOut(21),
              return: isoDaysOut(28),
              checkin: isoDaysOut(30),
              checkout: isoDaysOut(33),
            }}
            flightsLive={flightsLive}
            // The adapter's status note is a developer diagnostic — it names the
            // env var to set, and it reached the customer as the tab's title
            // attribute. Gated like everything else operational.
            flightsNote={
              showOpsPricing()
                ? air[0]?.note || "Flight rail not connected"
                : "Flight search is opening soon"
            }
            supplierLine={supplierLine}
            copy={BAND_COPY}
          />
        </div>
      </section>

      <section className="section" id="destinations">
        <div className="sechead">
          <span className="eyebrow">Trending from Delhi</span>
          <h2>
            Where people are <span className="grad-3">going next.</span>
          </h2>
        </div>
        <Suspense fallback={<DestSkeleton />}>
          <DestinationCards currency={currency} />
        </Suspense>
      </section>

      <section className="hero-shell">
        <div className="hero-card brandband">
          <div className="hero-bg" style={{ backgroundImage: 'url("/img/hero.webp")' }} />
          <div className="hero-scrim" />
          <div className="hero-dots" />

          <div className="hero-copy">
            <h2 className="herohead">
              The booking platform that helps you book{" "}
              <span className="grad">smarter &amp; cheaper</span> — and has your back{" "}
              <span className="grad-2">24/7.</span>
            </h2>
            <p className="standfirst">
              Book with us and save real money on your flights and hotels. And if anything goes wrong,
              our agents are here to help — round the clock. No stress.
            </p>
          </div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="sechead">
          <span className="eyebrow">How it works</span>
          <h2>
            The Departure, <span className="grad-3">explained.</span>
          </h2>
        </div>
        <div className="grid3">
          {STEPS.map((s) => (
            <div className="step" key={s.num}>
              <div className="shot" style={{ backgroundImage: `url("${s.img}")` }}>
                <span className="num">{s.num}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 4px" }}>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section band">
        <div className="inner">
          <Suspense fallback={<ShowcaseSkeleton label="Shopping live fares…" />}>
            <FlightShowcase currency={currency} />
          </Suspense>
          <Suspense fallback={<ShowcaseSkeleton label="Shopping live rates…" />}>
            <HotelShowcase currency={currency} />
          </Suspense>
        </div>
      </section>

      <section className="section narrow" id="support" style={{ padding: "88px 40px 48px" }}>
        <div className="sechead">
          <span className="eyebrow">Why we&apos;re different</span>
          <h2 style={{ maxWidth: 680 }}>
            Low prices are easy. <span className="grad-3">Real support is rare.</span>
          </h2>
        </div>
        <div className="grid3">
          {PILLARS.map((p) => (
            <div className="pillar" key={p.num}>
              <span className="num">{p.num}</span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section narrow" style={{ padding: "24px 40px 88px" }}>
        <div className="panel">
          <div className="left">
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <StatusPill state="delayed" label="Delayed +40" />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--ink-3)",
                  letterSpacing: "0.06em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                DEL → LHR · PNR K9021Z
              </span>
            </div>
            <h2 className="sm" style={{ lineHeight: 1.12 }}>
              &ldquo;We already know.
              <br />
              <span className="grad-2">Priya&apos;s on it.&rdquo;</span>
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.65, color: "var(--ink-2)", maxWidth: 440 }}>
              A delay isn&apos;t a scary red error and a &ldquo;contact support&rdquo; dead-end. It&apos;s
              a status update with an agent already assigned, rebook options held, and a WhatsApp thread
              open — before you even notice.
            </p>
            {showOpsPricing() ? (
              <Link className="btn btn-white" href="/suppliers">
                See the supplier board
              </Link>
            ) : (
              <Link className="btn btn-white" href="/results">
                Find a place to stay
              </Link>
            )}
          </div>
          <div className="right">
            <div className="slab">
              <AgentChip name="Priya Nair" />
            </div>
            <div className="slab row">
              <span className="k">Replies in</span>
              <SlaBadge seconds={42} />
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: "0 24px 96px" }}>
        <div className="cta-card" style={{ backgroundImage: 'url("/img/cta.webp")' }}>
          <div className="scrim" />
          <div className="inner">
            <h2>
              Book for your circle. <span className="grad-3">Earn when they fly.</span>
            </h2>
            <p style={{ fontSize: 16, color: "rgba(245,247,250,0.8)", lineHeight: 1.6 }}>
              Every trip you book for family and friends earns you a share — and we&apos;ve got them if
              anything goes wrong. That&apos;s the affiliate graph OTAs can&apos;t copy.
            </p>
            <div style={{ display: "flex", gap: 14, marginTop: 4, flexWrap: "wrap", justifyContent: "center" }}>
              <Link className="btn btn-white" href="/flights">
                Search flights
              </Link>
              <Link className="btn btn-glass" href="/results">
                Search hotels →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
      <ChatDock />
    </>
  );
}

// ── live sections ─────────────────────────────────────────────────────────

async function DestinationCards({ currency }: { currency: string }) {
  const cards = await destinationCards(currency, "DEL");
  return (
    <div className="destgrid">
      {cards.map((d) => (
        <Link
          key={d.code}
          className="destcard"
          href={`/flights?from=${d.from}&to=${d.code}&depart=${isoDaysOut(28)}&adults=1&cabin=economy`}
          style={{ backgroundImage: `url("${d.image}")`, animation: `tdp-float ${d.dur} ease-in-out infinite` }}
        >
          <span className="code">{d.code}</span>
          <span className="label">
            <span className="city">{d.city}</span>
            <span className="price">
              {d.price ? `from ${money(d.price.sell, d.price.currency)}` : "search fares"}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

function DestSkeleton() {
  return (
    <div className="destgrid">
      {[0, 1, 2].map((i) => (
        <div key={i} className="destcard skel" />
      ))}
    </div>
  );
}

function ShowcaseSkeleton({ label }: { label: string }) {
  return (
    <div className="empty" style={{ marginTop: 0, padding: "28px 0" }}>
      {label}
    </div>
  );
}

async function FlightShowcase({ currency }: { currency: string }) {
  const data = await showcaseFlights(currency);
  const pct = defaultMarkupPct();
  const ops = showOpsPricing();

  // With no air supplier connected there is nothing honest to put here. Show a
  // customer an empty section apologising for itself and you have advertised a
  // broken product; show them nothing and the page simply moves on to the
  // hotels, which do work. The diagnostic stays on the ops view, where the
  // person who can fix it will see it.
  if (data.flights.length === 0 && !ops) return null;
  const dateLabel = new Date(data.route.date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 28,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="eyebrow">The floor, made visible</span>
          <h2 className="sm">
            {data.route.from} → {data.route.to}
          </h2>
        </div>
        <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.04em", color: "var(--ink-2)" }}>
          {data.supplierCount ? (
            <>
              CHECKED <b style={{ color: "var(--ink)" }}>{data.supplierCount} SUPPLIER{data.supplierCount > 1 ? "S" : ""}</b> ·
              CHEAPEST NET WINS · {dateLabel}
            </>
          ) : (
            <>NO AIR SUPPLIER CONNECTED</>
          )}
        </div>
      </div>

      {data.flights.length === 0 ? (
        <div className="callout" style={{ marginTop: 0, marginBottom: 52 }}>
          <b>Flight rail not returning offers.</b>{" "}
          {data.error
            ? data.error
            : "Connect an air supplier (set DUFFEL_TOKEN) and live fares appear here automatically."}
        </div>
      ) : (
        <div className="flist" style={{ marginBottom: 52 }}>
          {data.flights.map((f, i) => {
            const out = f.slices[0];
            const p = f.best.priced;
            return (
              <div className={`frow ${i === 0 ? "win" : ""}`} key={f.itineraryKey}>
                <div className="air">
                  <div className="iata">{f.ownerIata || "··"}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                    <span className="name">{f.ownerName}</span>
                    <span className="meta">
                      {out.stops === 0 ? "NON-STOP" : `${out.stops} STOP`}
                      {out.segments[0]?.aircraft ? ` · ${out.segments[0].aircraft}` : ""}
                      {f.checkedBags > 0 ? ` · ${f.checkedBags} BAG` : " · NO CHECKED BAG"}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span className="times">
                    {hhmm(out.departAt)}→{hhmm(out.arriveAt)}
                  </span>
                  <span className="dur">{formatDuration(out.durationMin)}</span>
                </div>
                <div>
                  {i === 0 ? (
                    <span className="flag">CHEAPEST NET</span>
                  ) : f.supplierCount > 1 ? (
                    <span className="flag quiet">{f.supplierCount} suppliers</span>
                  ) : null}
                </div>
                <div className="stack-r">
                  <span className="amt">{money(p.sell, p.currency)}</span>
                  {showOpsPricing() && (
                    <span className="was" style={{ textDecoration: "none", color: "var(--ink-3)" }}>
                      incl. {pct}% margin
                    </span>
                  )}
                </div>
                <div className="rowact">
                  <Link
                    className={`btn ${i === 0 ? "btn-white" : "btn-glass"}`}
                    style={{ fontSize: 13, padding: "10px 20px" }}
                    href={`/flights?from=${data.route.from}&to=${data.route.to}&depart=${data.route.date}&adults=1&cabin=economy`}
                  >
                    {i === 0 ? "Book" : "Select"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

async function HotelShowcase({ currency }: { currency: string }) {
  const data = await showcaseHotels(currency);
  return (
    <>
      <div style={{ marginBottom: 26, display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="eyebrow">Stays · {data.city}</span>
        <h2 className="sm">
          Find the best hotel at the <span className="grad-3">lowest price.</span>
        </h2>
      </div>

      {data.hotels.length === 0 ? (
        <div className="callout" style={{ marginTop: 0 }}>
          <b>No live rates right now.</b> {data.error || "Try a search — sandbox inventory varies by city and date."}
        </div>
      ) : (
        <div className="hcardgrid">
          {data.hotels.map((h, i) => {
            const p = h.best.priced;
            return (
              <Link
                key={h.mapKey}
                className="hcard"
                href={`/results?city=${encodeURIComponent(data.city)}&country=IN&adults=2`}
              >
                <div
                  className="shot"
                  style={h.thumbnail ? { backgroundImage: `url("${h.thumbnail}")` } : undefined}
                >
                  <span className="tag">
                    {i === 0 ? "CHEAPEST NET" : h.supplierCount > 1 ? `BEST OF ${h.supplierCount}` : h.best.board}
                  </span>
                </div>
                <div className="body">
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <span className="hname">{h.name}</span>
                    <span className="hsub">
                      {h.stars ? "★".repeat(Math.min(5, h.stars)) : "—"} · {h.city || data.city}
                    </span>
                  </div>
                  <div className="foot">
                    <span style={{ display: "flex", flexDirection: "column" }}>
                      {/* Per night leads, because that is the number a
                          traveller compares on. The stay total follows it, with
                          the stay spelled out — a bare total reads as a nightly
                          rate and makes a correct price look wrong. */}
                      <span className="amt">{money(p.sell / data.nights, p.currency)}</span>
                      <span className="per">
                        per night · {money(p.sell, p.currency)} for {data.nights} night
                        {data.nights > 1 ? "s" : ""}, {data.adults} adults
                      </span>
                    </span>
                    <span className="btn btn-glass" style={{ fontSize: 13, padding: "9px 18px" }}>
                      Book
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
