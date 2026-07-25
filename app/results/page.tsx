import Link from "next/link";
import { shop } from "@/lib/rateshop";
import { money } from "@/lib/markup";
import { LiteApiError } from "@/lib/liteapi";

export const dynamic = "force-dynamic";

interface SP {
  city?: string;
  country?: string;
  checkin?: string;
  checkout?: string;
  adults?: string;
}

function nightsBetween(a: string, b: string): number {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 864e5));
}

export default async function Results({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const city = sp.city || "Dubai";
  const country = (sp.country || "AE").toUpperCase();
  const checkin = sp.checkin || new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const checkout = sp.checkout || new Date(Date.now() + 33 * 864e5).toISOString().slice(0, 10);
  const adults = Math.max(1, Number(sp.adults) || 2);
  const nights = nightsBetween(checkin, checkout);
  const currency = process.env.DEFAULT_CURRENCY || "AED";

  let result: Awaited<ReturnType<typeof shop>> | null = null;
  let error: string | null = null;
  try {
    result = await shop({
      city,
      countryCode: country,
      checkin,
      checkout,
      occupancies: [{ adults }],
      currency,
      guestNationality: country,
    });
  } catch (e) {
    error = e instanceof LiteApiError ? e.message : "Search failed. Please try again.";
  }

  const hotels = result?.hotels || [];
  const suppliers = result?.suppliers || [];
  const markupPct = result?.markupPct ?? 15;
  const liveCount = suppliers.filter((s) => s.live).length;

  const dateLabel = `${new Date(checkin).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })}–${new Date(checkout).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;

  return (
    <div className="wrap">
      <div className="results-head">
        <div>
          <Link className="back" href="/">
            ← new search
          </Link>
          <div className="q" style={{ marginTop: 6 }}>
            {city}
          </div>
          <div className="meta">
            {city} · {dateLabel} · {nights} night{nights > 1 ? "s" : ""} · {adults} guest
            {adults > 1 ? "s" : ""}
          </div>
        </div>
        <div className="meta">
          {hotels.length} hotel{hotels.length !== 1 ? "s" : ""} · prices in {currency} · incl. {markupPct}%
          margin
        </div>
      </div>

      {/* rate-shop status bar */}
      <div className="shopbar">
        <span>
          <b>Rate-shop:</b> {liveCount} of {suppliers.length} suppliers live
        </span>
        {suppliers.map((s) => (
          <span key={s.code}>
            <span className={`dot ${s.live ? "on" : "off"}`} />
            {s.name}
          </span>
        ))}
        <Link className="back" href="/suppliers" style={{ marginLeft: "auto" }}>
          manage suppliers →
        </Link>
      </div>

      {error && <div className="error">LiteAPI: {error}</div>}

      {!error && hotels.length === 0 && (
        <div className="empty">
          No live availability for {city} on these dates. Try different dates or another city (Dubai has
          the richest sandbox inventory).
        </div>
      )}

      <div className="hlist">
        {hotels.map((h) => {
          const params = new URLSearchParams({
            city,
            country,
            checkin,
            checkout,
            adults: String(adults),
          });
          const p = h.best.priced;
          const isDemo = h.best.supplier === "demo";
          return (
            <Link
              key={h.mapKey}
              className="hrow"
              href={`/hotel/${encodeURIComponent(h.mapKey)}?${params.toString()}`}
            >
              <div
                className="hthumb"
                style={h.thumbnail ? { backgroundImage: `url("${h.thumbnail}")` } : undefined}
                aria-hidden
              />
              <div className="hbody">
                <div className="hname">{h.name}</div>
                <div className="hmeta">
                  {h.stars ? <span className="hstars">{"★".repeat(Math.min(5, h.stars))}</span> : null}
                  {h.stars ? "  ·  " : ""}
                  {[h.city, h.country].filter(Boolean).join(", ") || city}
                </div>
                <div className="suprow">
                  <span className={`supbadge win ${isDemo ? "demo" : ""}`}>
                    ✓ best: {h.best.supplierName}
                  </span>
                  {h.supplierCount > 1 && (
                    <span className="supbadge">cheapest of {h.supplierCount} suppliers</span>
                  )}
                  <span className="supbadge">{h.best.board}</span>
                </div>
                {h.supplierCount > 1 && (
                  <div className="supcompare">
                    {h.quotes.map((q, i) => (
                      <span key={q.supplier} style={{ marginRight: 14 }}>
                        {i === 0 ? (
                          <span className="beat">
                            {q.supplierName} {money(q.net, q.currency)} ✓
                          </span>
                        ) : (
                          <s>
                            {q.supplierName} {money(q.net, q.currency)}
                          </s>
                        )}
                      </span>
                    ))}
                    {h.savingVsNext ? (
                      <span className="beat"> · saves {money(h.savingVsNext, currency)}</span>
                    ) : null}
                  </div>
                )}
              </div>
              <div className="hprice">
                <div className="amt">{money(p.sell, p.currency)}</div>
                <div className="per">
                  {money(p.sell / nights, p.currency)} / night · total
                </div>
                <div className="per" style={{ color: "var(--good)" }}>
                  margin {money(p.markup, p.currency)}
                </div>
                <div className="cta">View rooms →</div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="footer">
        We query every connected aggregator, pick the cheapest net per hotel, and add your {markupPct}%
        margin. Add more suppliers → cheaper wins. <Link href="/suppliers">suppliers →</Link>
      </div>
    </div>
  );
}
