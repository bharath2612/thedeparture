import Link from "next/link";
import { money } from "@/lib/markup";
import { showOpsPricing } from "@/lib/opsview";

interface SP {
  ref?: string;
  supplier?: string;
  hotel?: string;
  room?: string;
  board?: string;
  checkin?: string;
  checkout?: string;
  nights?: string;
  net?: string;
  markup?: string;
  pct?: string;
  sell?: string;
  ccy?: string;
}

export default async function Quote({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  if (!sp.ref || !sp.sell) {
    return (
      <div className="wrap">
        <div className="empty">
          No quote to show. <Link className="back" href="/">Start a search →</Link>
        </div>
      </div>
    );
  }

  const ccy = sp.ccy || "AED";
  const sell = Number(sp.sell);
  const net = Number(sp.net);
  const markup = Number(sp.markup);
  const nights = Number(sp.nights) || 1;
  const dateLabel =
    sp.checkin && sp.checkout
      ? `${new Date(sp.checkin).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${new Date(
          sp.checkout
        ).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
      : "";

  return (
    <div className="wrap">
      <div style={{ paddingTop: 30 }}>
        <Link className="back" href="/">
          ← new search
        </Link>
        <p className="eyebrow" style={{ marginTop: 18 }}>
          Price locked · ref {sp.ref}
        </p>
        <h1>
          Your quote. <span className="quiet">Held at this price.</span>
        </h1>
      </div>

      <div className="ticket">
        <div className="ticket-top">
          <div className="route">{sp.hotel}</div>
          <div className="sub">
            {sp.room}
            {sp.board ? ` · ${sp.board}` : ""} · {dateLabel} · {nights} night{nights > 1 ? "s" : ""}
          </div>
        </div>
        <div className="ticket-body">
          <div className="tline total">
            <span>Total</span>
            <span>{money(sell, ccy)}</span>
          </div>
          <div className="tline">
            <span>Per night</span>
            <span>{money(sell / nights, ccy)}</span>
          </div>
          <div className="tline">
            <span>Sourced via</span>
            <span>{sp.supplier || "supplier"}</span>
          </div>
          <div className="tline locked">
            <span>Price locked at supplier</span>
            <span>ref {sp.ref}</span>
          </div>
          {showOpsPricing() && (
            <p className="callout" style={{ marginTop: 22 }}>
              This is the number the traveller sees — <b>one price, no components.</b> Behind it: net{" "}
              {money(net, ccy)} + your {sp.pct}% margin {money(markup, ccy)}. Next step in the build:
              collect guest details, debit the agent wallet, and call <b>/rates/book</b> to confirm.
            </p>
          )}
        </div>
      </div>

      <div className="footer">
        Prebook holds the net rate against ref <b>{sp.ref}</b> · confirm before it expires to guarantee
        the price.
      </div>
    </div>
  );
}
