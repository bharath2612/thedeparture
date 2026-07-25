import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY, addressLines, orPlaceholder } from "@/lib/company";
import { SiteFooter } from "@/components/Bits";

export const metadata: Metadata = {
  title: `Terms & Conditions — ${COMPANY.brand}`,
  description: `The terms on which ${COMPANY.legalName} provides travel booking services.`,
};

export default function Terms() {
  return (
    <>
      <div className="wrap legal">
        <div className="detail-top">
          <Link className="back" href="/">
            ← home
          </Link>
          <div className="name" style={{ marginTop: 8 }}>
            Terms &amp; Conditions
          </div>
          <div className="sub">
            {COMPANY.legalName} · last updated {COMPANY.lastUpdated}
          </div>
        </div>

        <div className="callout" style={{ marginTop: 24 }}>
          <b>Draft pending legal review.</b> Written to match how the platform actually operates, but
          not reviewed by a lawyer. Several details are still missing (marked <code>[…]</code>). Two
          clauses in particular need a commercial decision before you publish: <b>cancellation and
          refund handling (§6)</b> and <b>limitation of liability (§9)</b>.
        </div>

        <h2 className="legal-h">1. About these terms</h2>
        <p>
          These terms govern your use of {COMPANY.brand}, operated by <b>{COMPANY.legalName}</b>, LLPIN{" "}
          {orPlaceholder(COMPANY.llpin, "LLPIN")}, GSTIN {orPlaceholder(COMPANY.gstin, "GSTIN")},
          registered at:
        </p>
        <address>
          {addressLines().map((l) => (
            <span key={l}>{l}</span>
          ))}
        </address>
        <p>By searching, booking, or otherwise using the platform, you accept these terms.</p>

        <h2 className="legal-h">2. What we are</h2>
        <p>
          <b>We act as an agent, not as the carrier or the hotel.</b> We source rates from airlines,
          hotels and travel aggregators, and arrange bookings with them on your behalf. The flight is
          operated by the airline and the stay is provided by the hotel; each is governed by that
          supplier&apos;s own conditions of carriage or booking terms, which apply to you in addition to
          these terms.
        </p>
        <p>
          This distinction matters when something goes wrong: a cancelled flight is the airline&apos;s
          contractual obligation to you. We will act for you in pursuing it, but we do not become the
          carrier by having sold you the ticket.
        </p>

        <h2 className="legal-h">3. Prices and currency</h2>
        <p>
          Prices shown include our service margin and are quoted in the currency the supplier priced in.
          We do not convert between currencies; if you change the displayed currency, we re-query
          suppliers rather than applying an exchange rate of our own. Where a supplier can only price in
          its own currency, that currency is shown against the price.
        </p>
        <p>
          <b>Airfares and hotel rates change constantly.</b> A price shown in search results is an offer
          from the supplier at that moment and is not held until it is confirmed. We re-check the price
          with the supplier immediately before issuing. If it has moved, we stop and tell you rather
          than charging the older price. Taxes and fees are included in the total shown unless stated
          otherwise; charges levied directly by a hotel at check-in (city or tourism taxes, resort fees,
          deposits) are payable by you on arrival.
        </p>

        <h2 className="legal-h">4. Booking and traveller details</h2>
        <p>
          You must give traveller names exactly as they appear on the passport or ID that will be used
          to travel. Airlines commonly refuse to correct names after issue, or charge to do so, and a
          mismatch can invalidate a ticket. You are responsible for the accuracy of what you submit.
        </p>
        <p>
          A booking is confirmed only when we send you a confirmation containing a booking reference or
          PNR. Until then, no contract for travel exists.
        </p>

        <h2 className="legal-h">5. Passports, visas and entry rules</h2>
        <p>
          You are responsible for holding a valid passport, the correct visa, and any health documents
          required by your destination or by countries you transit. Entry requirements change without
          notice and are decided by the destination&apos;s authorities, not by us or the airline. We are
          not liable if you are refused boarding or entry.
        </p>

        <h2 className="legal-h">6. Changes, cancellations and refunds</h2>
        <p>
          Whether a booking can be changed or cancelled, and on what terms, is set by the supplier&apos;s
          fare or rate rules — shown to you before you book. Many of the lowest fares and rates are
          non-refundable.
        </p>
        <p>
          Where a refund is due, we claim it from the supplier and pass it on once received. Airline and
          hotel refunds routinely take several billing cycles, and we cannot pay out money a supplier has
          not yet released.{" "}
          <b>
            [Service fee on cancellation, and whether our margin is refundable, to be confirmed before
            publication.]
          </b>
        </p>

        <h2 className="legal-h">7. Delays, disruption and our service promise</h2>
        <p>
          Where a flight is delayed or cancelled, we will contact you, assign an agent, and work the
          rebooking or refund with the supplier. Compensation for disruption, where any is payable, is
          owed by the airline under the applicable regulation and is not a payment we make ourselves.
        </p>

        <h2 className="legal-h">8. Your conduct</h2>
        <p>
          You agree not to use the platform for fraudulent or speculative bookings, not to scrape or
          bulk-query it by automated means, and not to interfere with its operation. We may cancel a
          booking we reasonably believe to be fraudulent.
        </p>

        <h2 className="legal-h">9. Liability</h2>
        <p>
          We are liable for our own failures in arranging your booking. We are not liable for the acts
          or omissions of an airline, hotel or other supplier, nor for events outside reasonable control
          — weather, air traffic control, strikes, civil unrest, epidemics, or government action.{" "}
          <b>[Liability cap to be set on legal advice before publication.]</b>
        </p>
        <p>Nothing in these terms limits liability that cannot lawfully be limited.</p>

        <h2 className="legal-h">10. Complaints</h2>
        <p>
          Tell us first — most problems are fixed fastest by the agent already on your booking. Write to{" "}
          {orPlaceholder(COMPANY.email, "contact email")}. If you are not satisfied, escalate to the
          Grievance Officer named in our <Link href="/privacy">Privacy Policy</Link>.
        </p>

        <h2 className="legal-h">11. Governing law</h2>
        <p>
          These terms are governed by the laws of India. The courts at Hyderabad, Telangana have
          exclusive jurisdiction over any dispute arising from them.
        </p>

        <div className="footer">
          <Link href="/privacy">Privacy Policy →</Link>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
