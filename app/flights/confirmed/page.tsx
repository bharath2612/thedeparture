import Link from "next/link";
import { money, priceUp } from "@/lib/markup";
import { SiteFooter, AgentChip, SlaBadge } from "@/components/Bits";

export const dynamic = "force-dynamic";

export default async function Confirmed({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; order?: string; net?: string; currency?: string; supplier?: string }>;
}) {
  const sp = await searchParams;
  const ref = sp.ref || "—";
  const currency = sp.currency || "USD";
  const net = Number(sp.net) || 0;
  const p = priceUp(net, currency);

  return (
    <>
      <div className="wrap" style={{ maxWidth: 760 }}>
        <div className="detail-top">
          <div className="name">Ticketed.</div>
          <div className="sub">
            Issued via {sp.supplier || "supplier"} · order {sp.order || "—"}
          </div>
        </div>

        <div className="ticket">
          <div className="ticket-top">
            <div className="route">PNR {ref}</div>
            <div className="sub">Airline booking reference — quote this at check-in.</div>
          </div>
          <div className="ticket-body">
            <div className="tline">
              <span>Traveller pays</span>
              <span>{money(p.sell, currency)}</span>
            </div>
            <div className="tline">
              <span>Supplier net</span>
              <span>{money(p.net, currency)}</span>
            </div>
            <div className="tline total">
              <span>Your margin</span>
              <span>{money(p.markup, currency)}</span>
            </div>
            <div className="tline locked" style={{ borderBottom: "none" }}>
              <span>Status</span>
              <span>CONFIRMED</span>
            </div>
          </div>
        </div>

        <div className="panel" style={{ marginTop: 26, gridTemplateColumns: "1fr" }}>
          <div className="left" style={{ padding: 28, gap: 16 }}>
            <AgentChip name="Priya Nair" />
            <p style={{ fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
              Your agent is attached to this booking. If the flight moves, we already know — rebook
              options are held before you notice.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="eyebrow">Replies in</span>
              <SlaBadge seconds={42} />
            </div>
          </div>
        </div>

        <div className="footer">
          <Link href="/flights">Book another flight →</Link> · <Link href="/results">Add a hotel →</Link>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
