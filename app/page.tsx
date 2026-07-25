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
  },
  {
    num: "2",
    title: "Book in seconds",
    body: "Book for yourself or your whole circle. Saved co-travellers, one tap. A named agent is attached from the start.",
  },
  {
    num: "3",
    title: "We're on it, always",
    body: "Delay at 2am? We already know. Your agent has rebook options held and a WhatsApp thread open before you notice.",
  },
];

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
      <section className="hero-shell">
        <div className="hero-card">
          <div className="hero-bg" style={{ backgroundImage: 'url("/hero.png")' }} />
          <div className="hero-scrim" />
          <div className="hero-dots" />

          <div className="hero-copy">
            <span className="badge">
              <span className="live-dot" />
              Smart travel · AI powered · We are with you on every trip
            </span>
            <h1>
              The booking platform that helps you book{" "}
              <span className="grad">smarter &amp; cheaper</span> — and has your back{" "}
              <span className="grad-2">24/7.</span>
            </h1>
            <p className="standfirst">
              Book with us and save real money on your flights and hotels. And if anything goes wrong,
              our agents are here to help — round the clock. No stress.
            </p>
          </div>

          <SearchPanel
            defaults={{
              depart: isoDaysOut(21),
              return: isoDaysOut(28),
              checkin: isoDaysOut(30),
              checkout: isoDaysOut(33),
            }}
            flightsLive={flightsLive}
            flightsNote={air[0]?.note || "Flight rail not connected"}
            supplierLine={supplierLine}
          />

          <Suspense fallback={<DestSkeleton />}>
            <DestinationCards currency={currency} />
          </Suspense>
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
              <div className="shot" style={{ backgroundImage: 'url("/hero.png")' }}>
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
            <Link className="btn btn-white" href="/suppliers">
              See the supplier board
            </Link>
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
        <div className="cta-card" style={{ backgroundImage: 'url("/hero.png")' }}>
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
          style={{ backgroundImage: 'url("/hero.png")', animation: `tdp-float ${d.dur} ease-in-out infinite` }}
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
        <div key={i} className="destcard" style={{ backgroundImage: 'url("/hero.png")', opacity: 0.5 }} />
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
                  <span className="was" style={{ textDecoration: "none", color: "var(--ink-3)" }}>
                    incl. {pct}% margin
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
          <span className="grad-3">Rate-shopped</span> hotels
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
                      <span className="amt">{money(p.sell, p.currency)}</span>
                      <span className="per">total stay · incl. margin</span>
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
