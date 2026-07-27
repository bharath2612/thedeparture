import Link from "next/link";
import { notFound } from "next/navigation";
import { SUPPLIERS } from "@/lib/suppliers/registry";
import { FLIGHT_SUPPLIERS } from "@/lib/flights/registry";
import { SiteFooter } from "@/components/Bits";
import { showOpsPricing } from "@/lib/opsview";

export const dynamic = "force-dynamic";

// This page lists who we buy from and which of them are connected — our supply
// chain, on a page that was linked from the public nav and footer. It 404s
// unless the ops view is on.
export default function Suppliers() {
  if (!showOpsPricing()) notFound();

  const hotels = SUPPLIERS.map((s) => s.status());
  const air = FLIGHT_SUPPLIERS.map((s) => s.status());
  const live = hotels.filter((r) => r.live).length + air.filter((r) => r.live).length;
  const total = hotels.length + air.length;

  return (
    <>
      <div className="wrap">
        <section style={{ padding: "48px 0 8px" }}>
          <Link className="back" href="/">
            ← home
          </Link>
          <p className="eyebrow" style={{ marginTop: 18 }}>
            Rate-shop · {live} of {total} suppliers live
          </p>
          <h1 style={{ fontSize: "clamp(30px,4vw,46px)", marginTop: 12 }}>
            Every supplier we onboard. <span className="grad-3">Cheapest wins.</span>
          </h1>
          <p className="standfirst" style={{ marginTop: 18, maxWidth: "62ch" }}>
            The platform queries all live suppliers in parallel and sells the lowest net. Onboarding one
            is: get its key, implement its adapter, flip it live. No single supplier is cheapest on
            everything — that&apos;s the whole point.
          </p>
        </section>

        <h2 className="sm" style={{ marginTop: 44, fontSize: 24 }}>
          Air
        </h2>
        <div className="tablewrap">
        <table className="suptable">
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Status</th>
              <th>Can issue?</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {air.map((r) => (
              <tr key={r.code}>
                <td className="sname">{r.name}</td>
                <td>
                  {r.live ? (
                    <span className="pill live">● live</span>
                  ) : r.connected ? (
                    <span className="pill key">key set</span>
                  ) : (
                    <span className="pill off">not connected</span>
                  )}
                </td>
                <td>
                  {r.bookable ? (
                    <span className="pill live">ticketing</span>
                  ) : (
                    <span className="pill off">shop only</span>
                  )}
                </td>
                <td>{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <h2 className="sm" style={{ marginTop: 44, fontSize: 24 }}>
          Hotels
        </h2>
        <div className="tablewrap">
        <table className="suptable">
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {hotels.map((r) => (
              <tr key={r.code}>
                <td className="sname">{r.name}</td>
                <td>
                  {r.live ? (
                    <span className="pill live">● live</span>
                  ) : r.connected ? (
                    <span className="pill key">key set</span>
                  ) : (
                    <span className="pill off">not connected</span>
                  )}
                </td>
                <td>{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <div className="callout" style={{ marginTop: 30 }}>
          To onboard a supplier: add its key to <b>.env.local</b> (e.g. <b>DUFFEL_TOKEN=…</b> or{" "}
          <b>REZLIVE_KEY=…</b>), implement its adapter, and register it. Air and hotel rails share the
          same shape — fan out, group by identity, sell the cheapest net. The one rule the code
          enforces: a supplier without ticketing authority can price a flight but can never be handed a
          booking.
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
