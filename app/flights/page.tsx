import Link from "next/link";
import { shopFlights, requireCheckedBags } from "@/lib/flightshop";
import { formatDuration, type CabinClass } from "@/lib/flights/types";
import { money } from "@/lib/markup";
import { SiteFooter } from "@/components/Bits";
import { resolveCurrency } from "@/lib/currency.server";
import { showOpsPricing } from "@/lib/opsview";

export const dynamic = "force-dynamic";

interface SP {
  from?: string;
  to?: string;
  depart?: string;
  return?: string;
  adults?: string;
  cabin?: string;
  bags?: string;
}

function hhmm(iso: string): string {
  return (iso || "").slice(11, 16);
}

function dayLabel(iso: string): string {
  if (!iso) return "";
  return new Date(iso.slice(0, 10)).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const CABINS: CabinClass[] = ["economy", "premium_economy", "business", "first"];

export default async function Flights({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const from = (sp.from || "DEL").toUpperCase();
  const to = (sp.to || "DXB").toUpperCase();
  const depart = sp.depart || new Date(Date.now() + 21 * 864e5).toISOString().slice(0, 10);
  const ret = sp.return || undefined;
  const adults = Math.max(1, Number(sp.adults) || 1);
  const cabin = (CABINS.includes(sp.cabin as CabinClass) ? sp.cabin : "economy") as CabinClass;
  const minBags = Math.max(0, Number(sp.bags) || 0);

  // Advisory only on air: Duffel prices in the airline's/account's currency and
  // has no currency parameter, so an offer is always shown in the currency it
  // was actually quoted in. We never convert.
  const currency = (await resolveCurrency()).code;
  const ops = showOpsPricing();

  const res = await shopFlights({
    origin: from,
    destination: to,
    departDate: depart,
    returnDate: ret,
    adults,
    cabin,
    currency,
  });

  const all = res.flights;
  const flights = requireCheckedBags(all, minBags);
  const liveCount = res.suppliers.filter((s) => s.live).length;
  const bookableCount = res.suppliers.filter((s) => s.live && s.bookable).length;

  const qs = (over: Partial<Record<string, string>>) => {
    const q = new URLSearchParams({ from, to, depart, adults: String(adults), cabin });
    if (ret) q.set("return", ret);
    if (minBags) q.set("bags", String(minBags));
    for (const [k, v] of Object.entries(over)) {
      if (v === undefined || v === "") q.delete(k);
      else q.set(k, v);
    }
    return `/flights?${q}`;
  };

  return (
    <>
      <div className="wrap">
        <div className="results-head">
          <div>
            <Link className="back" href="/">
              ← new search
            </Link>
            <div className="q" style={{ marginTop: 6 }}>
              {from} → {to}
            </div>
            <div className="meta">
              {dayLabel(depart)}
              {ret ? ` – ${dayLabel(ret)}` : " · one way"} · {adults} traveller{adults > 1 ? "s" : ""} ·{" "}
              {cabin.replace("_", " ")}
            </div>
          </div>
          <div className="meta">
            {flights.length} itinerar{flights.length === 1 ? "y" : "ies"}
            {minBags ? ` with ${minBags}+ checked bag` : ""}
            {ops ? ` · incl. ${res.markupPct}% margin` : ""}
          </div>
        </div>

        {/* How many suppliers we checked is a selling point. WHICH suppliers,
            and which of them can ticket, is our supply chain, ops only. */}
        <div className="shopbar">
          <span>
            <b>Air rate-shop:</b> {liveCount} of {res.suppliers.length} supplier
            {res.suppliers.length > 1 ? "s" : ""} live
          </span>
          {ops &&
            res.suppliers.map((s) => (
              <span key={s.code}>
                <span className={`dot ${s.live ? "on" : "off"}`} />
                {s.name}
                {s.live && !s.bookable ? " (shop only)" : ""}
              </span>
            ))}
          <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Link className="chip" href={qs({ bags: minBags ? "" : "1" })}>
              {minBags ? "✓ 1+ checked bag" : "Only with checked bag"}
            </Link>
            {ops && (
              <Link className="back" href="/suppliers">
                suppliers →
              </Link>
            )}
          </span>
        </div>

        {/* Supplier error text is upstream wording aimed at us, not at a
            traveller, so it stays on the ops view. */}
        {ops &&
          res.errors.map((e) => (
            <div className="error" key={e.supplier}>
              {e.supplier}: {e.message}
            </div>
          ))}

        {liveCount === 0 &&
          (ops ? (
            <div className="callout">
              <b>No air supplier connected.</b> Set <code>DUFFEL_TOKEN</code> (self-serve signup, no
              IATA needed, it issues on its own accreditation) and this page goes live immediately.
              Amadeus Self-Service can be added alongside for a second price, but it cannot issue
              tickets.
            </div>
          ) : (
            <div className="callout">
              <b>Flight search is not open yet.</b> We&apos;re finishing our airline ticketing
              connection. Hotels are live now, and an agent can quote a flight for you in the
              meantime. <Link href="/results">Search stays →</Link>
            </div>
          ))}

        {liveCount > 0 && flights.length === 0 && (
          <div className="empty">
            No fares returned for {from} → {to} on {dayLabel(depart)}
            {minBags ? " with a checked bag included" : ""}. Try another date
            {minBags ? ", or drop the checked-bag filter" : ""}.
          </div>
        )}

        <div className="flist" style={{ marginTop: 18 }}>
          {flights.map((f, i) => {
            const out = f.slices[0];
            const p = f.best.priced;
            const canBook = Boolean(f.bestBookable);
            const bookOffer = f.bestBookable;
            return (
              <div className={`frow ${i === 0 ? "win" : ""}`} key={f.itineraryKey}>
                <div className="air">
                  <div className="iata">{f.ownerIata || "··"}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                    <span className="name">{f.ownerName}</span>
                    <span className="meta">
                      {out.segments.map((s) => `${s.carrier}${s.flightNumber}`).join(" · ")}
                      {out.stops === 0 ? " · NON-STOP" : ` · ${out.stops} STOP`}
                    </span>
                    <span className="suprow" style={{ marginTop: 2 }}>
                      <span className={`supbadge ${i === 0 ? "win" : ""}`}>
                        {f.checkedBags > 0 ? `${f.checkedBags} checked bag` : "no checked bag"}
                      </span>
                      {f.supplierCount > 1 && (
                        <span className="supbadge">cheapest of {f.supplierCount}</span>
                      )}
                      {!canBook && <span className="supbadge demo">shop only</span>}
                    </span>
                    {ops && f.supplierCount > 1 && (
                      <span className="supcompare">
                        {f.quotes.map((q, qi) => (
                          <span key={q.supplier} style={{ marginRight: 14 }}>
                            {qi === 0 ? (
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
                        {f.savingVsNext ? (
                          <span className="beat"> · saves {money(f.savingVsNext, p.currency)}</span>
                        ) : null}
                        {!f.comparable && (
                          <span style={{ color: "var(--alert)" }}>
                            {" "}
                            · quotes in different currencies, not directly comparable
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span className="times">
                    {hhmm(out.departAt)}→{hhmm(out.arriveAt)}
                  </span>
                  <span className="dur">{formatDuration(out.durationMin)}</span>
                  {f.slices[1] && (
                    <span className="dur">
                      ret {hhmm(f.slices[1].departAt)}→{hhmm(f.slices[1].arriveAt)}
                    </span>
                  )}
                </div>

                <div>{i === 0 ? <span className="flag">CHEAPEST NET</span> : null}</div>

                <div className="stack-r">
                  <span className="amt">{money(p.sell, p.currency)}</span>
                  {ops && (
                    <span className="was" style={{ textDecoration: "none" }}>
                      net {money(p.net, p.currency)} · margin {money(p.markup, p.currency)}
                    </span>
                  )}
                </div>

                <div className="rowact">
                  {canBook && bookOffer ? (
                    <Link
                      className={`btn ${i === 0 ? "btn-white" : "btn-glass"}`}
                      style={{ fontSize: 13, padding: "10px 20px" }}
                      href={`/flights/book?supplier=${bookOffer.supplier}&offer=${encodeURIComponent(
                        bookOffer.offerId
                      )}`}
                    >
                      Book
                    </Link>
                  ) : (
                    <span className="flag warn" title="This supplier has no ticketing authority">
                      CAN&apos;T ISSUE
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {ops && bookableCount === 0 && liveCount > 0 && (
          <div className="callout">
            Every connected air supplier is <b>shop-only</b>. These are real prices but nothing here can
            be ticketed. Add Duffel (or a consolidator) to close the loop.
          </div>
        )}

        <div className="footer">
          Flight identity is exact (carrier, flight number and date), so &ldquo;cheapest of N&rdquo; on
          air is a true comparison, not a fuzzy match. Ranking is on price; the checked-bag filter is a
          filter, never an invented bag fee.
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
