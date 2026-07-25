import Link from "next/link";
import BookForm from "./BookForm";
import { getFlightSupplier } from "@/lib/flights/registry";
import { formatDuration } from "@/lib/flights/types";
import { money, priceUp, defaultMarkupPct } from "@/lib/markup";
import { SiteFooter } from "@/components/Bits";

export const dynamic = "force-dynamic";

function hhmm(iso: string): string {
  return (iso || "").slice(11, 16);
}
function dayLabel(iso: string): string {
  if (!iso) return "";
  return new Date(iso.slice(0, 10)).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ supplier?: string; offer?: string }>;
}) {
  const sp = await searchParams;
  const supplier = getFlightSupplier(sp.supplier || "");
  const offerId = sp.offer || "";

  if (!supplier || !offerId) {
    return (
      <div className="wrap">
        <div className="error" style={{ marginTop: 40 }}>
          Missing offer. <Link href="/flights">Search again →</Link>
        </div>
      </div>
    );
  }
  if (!supplier.book || !supplier.offer) {
    return (
      <div className="wrap">
        <div className="error" style={{ marginTop: 40 }}>
          {supplier.name} can price this fare but cannot issue the ticket.{" "}
          <Link href="/flights">Back to results →</Link>
        </div>
      </div>
    );
  }

  let offer = null;
  let paxCount = 1;
  let error: string | null = null;
  try {
    // The offer carries one passenger slot per traveller it was priced for —
    // that count, not a guess from the URL, decides how many name fields to ask
    // for. Duffel rejects an order whose passenger list doesn't match.
    const [o, slots] = await Promise.all([
      supplier.offer(offerId),
      supplier.passengerSlots ? supplier.passengerSlots(offerId) : Promise.resolve([]),
    ]);
    offer = o;
    paxCount = Math.max(1, slots.length);
  } catch (e) {
    error = String((e as Error).message || e);
  }

  if (error || !offer) {
    return (
      <>
        <div className="wrap">
          <div className="error" style={{ marginTop: 40 }}>
            {error || "This fare is no longer available."} <Link href="/flights">Search again →</Link>
          </div>
        </div>
        <SiteFooter />
      </>
    );
  }

  const pct = defaultMarkupPct();
  const p = priceUp(offer.net, offer.currency, pct);
  const expired = offer.expiresAt ? new Date(offer.expiresAt).getTime() < Date.now() : false;
  const first = offer.slices[0];
  const last = offer.slices[offer.slices.length - 1];

  return (
    <>
      <div className="wrap" style={{ maxWidth: 860 }}>
        <div className="detail-top">
          <Link className="back" href="/flights">
            ← back to results
          </Link>
          <div className="name" style={{ marginTop: 8 }}>
            {first.origin} → {last.destination}
          </div>
          <div className="sub">
            {offer.ownerName} · {dayLabel(first.departAt)} · {offer.slices.length > 1 ? "return" : "one way"} ·{" "}
            issued by {offer.supplierName}
          </div>
        </div>

        {expired && (
          <div className="error">
            This fare has expired. <Link href="/flights">Search again →</Link>
          </div>
        )}

        <div className="roomlist">
          {offer.slices.map((s, i) => (
            <div className="room" key={i} style={{ alignItems: "flex-start" }}>
              <div>
                <div className="rname">
                  {i === 0 ? "Outbound" : "Return"} · {s.origin} → {s.destination}
                </div>
                <div className="rcancel" style={{ marginTop: 6 }}>
                  {s.segments.map((g, gi) => (
                    <div key={gi}>
                      {g.carrier}
                      {g.flightNumber} · {g.origin} {hhmm(g.departAt)} → {g.destination} {hhmm(g.arriveAt)}
                      {g.aircraft ? ` · ${g.aircraft}` : ""}
                      {g.cabin ? ` · ${g.cabin}` : ""}
                    </div>
                  ))}
                </div>
                <div className="rboard">
                  {formatDuration(s.durationMin)} · {s.stops === 0 ? "non-stop" : `${s.stops} stop`}
                </div>
              </div>
              <div className="rprice">
                <div className="rcancel">{dayLabel(s.departAt)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="opstrip">
          <div>
            <div className="k">Supplier net</div>
            <div className="v">{money(p.net, p.currency)}</div>
          </div>
          <div>
            <div className="k">Your margin ({p.markupPct}%)</div>
            <div className="v good">{money(p.markup, p.currency)}</div>
          </div>
          <div>
            <div className="k">Traveller pays</div>
            <div className="v">{money(p.sell, p.currency)}</div>
          </div>
          <div className="say">
            The traveller sees one price. Net and margin are operator-only — this strip never renders on
            a customer-facing screen.
          </div>
        </div>

        <div className="suprow" style={{ marginTop: 18 }}>
          <span className="supbadge">
            {offer.checkedBags > 0 ? `${offer.checkedBags} checked bag included` : "no checked bag"}
          </span>
          {offer.refundable !== undefined && (
            <span className="supbadge">{offer.refundable ? "refundable" : "non-refundable"}</span>
          )}
          {offer.changeable !== undefined && (
            <span className="supbadge">{offer.changeable ? "changeable" : "no changes"}</span>
          )}
          {offer.expiresAt && !expired && (
            <span className="supbadge demo">holds until {hhmm(offer.expiresAt)} UTC</span>
          )}
        </div>

        {!expired && (
          <BookForm
            supplier={supplier.code}
            offerId={offerId}
            count={paxCount}
            sellLabel={money(p.sell, p.currency)}
          />
        )}
      </div>
      <SiteFooter />
    </>
  );
}
