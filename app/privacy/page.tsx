import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY, addressLines, registrationLine } from "@/lib/company";
import { SiteFooter } from "@/components/Bits";

export const metadata: Metadata = {
  title: `Privacy Policy · ${COMPANY.brand}`,
  description: `How ${COMPANY.legalName} collects, uses and protects personal data.`,
};

export default function Privacy() {
  return (
    <>
      <div className="wrap legal">
        <div className="detail-top">
          <Link className="back" href="/">
            ← home
          </Link>
          <div className="name" style={{ marginTop: 8 }}>
            Privacy Policy
          </div>
          <div className="sub">
            {COMPANY.legalName} · last updated {COMPANY.lastUpdated}
          </div>
        </div>

        <h2 className="legal-h">1. Who we are</h2>
        <p>
          {COMPANY.brand} is operated by <b>{COMPANY.legalName}</b>, a limited liability partnership
          registered in India
          {registrationLine() ? ` (${registrationLine()})` : ""}, with its registered office at:
        </p>
        <address>
          {addressLines().map((l) => (
            <span key={l}>{l}</span>
          ))}
        </address>
        <p>
          For the purposes of the Digital Personal Data Protection Act, 2023, we are the{" "}
          <b>Data Fiduciary</b> for the personal data described here. Contact us at{" "}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
        </p>

        <h2 className="legal-h">2. What we collect</h2>
        <p>We collect only what a booking actually requires:</p>
        <ul>
          <li>
            <b>Search details.</b> origin, destination, dates, number of travellers, cabin or room
            preference. Collected the moment you search, whether or not you book.
          </li>
          <li>
            <b>Traveller details.</b> name as it appears on your passport or ID, date of birth,
            gender where an airline requires it. Airlines and hotels will not issue a booking without
            these.
          </li>
          <li>
            <b>Contact details.</b> email and phone number, including WhatsApp number where you choose
            to reach us that way.
          </li>
          <li>
            <b>Technical data.</b> IP address, browser type, and pages viewed. We use the country
            derived from your IP address to pick a default display currency; you can override it at any
            time and your choice is stored in a cookie on your device.
          </li>
          <li>
            <b>Payment data.</b> handled by our payment provider. We do not receive or store full card
            numbers.
          </li>
        </ul>

        <h2 className="legal-h">3. Why we use it, and on what basis</h2>
        <ul>
          <li>
            <b>To fulfil your booking.</b> we must pass traveller details to the airline, hotel, or
            supplier who issues it. Without this we cannot provide the service you asked for.
          </li>
          <li>
            <b>To support you.</b> to contact you about schedule changes, delays, cancellations and
            refunds, and to let an assigned agent act on your booking.
          </li>
          <li>
            <b>To meet legal obligations.</b> tax, accounting, and any government or regulatory
            requirement applicable to travel bookings.
          </li>
          <li>
            <b>With your consent.</b> for marketing messages, which you can withdraw at any time
            without affecting any booking you have already made.
          </li>
        </ul>

        <h2 className="legal-h">4. Who we share it with</h2>
        <p>
          We share personal data only with parties who need it to deliver your trip: the airline, hotel
          or supplier fulfilling your booking; the aggregators through whom we source rates; our payment
          provider; and our messaging provider where you contact us on WhatsApp. Suppliers may be
          located outside India, and a cross-border booking necessarily involves transferring your
          details to the destination country.
        </p>
        <p>
          <b>We do not sell personal data, and we do not share it with advertisers.</b>
        </p>

        <h2 className="legal-h">5. How long we keep it</h2>
        <p>
          Booking records are retained for as long as required for tax and statutory purposes. Search
          history is retained only briefly, to make repeat searches faster. When a retention period
          ends, data is deleted or anonymised.
        </p>

        <h2 className="legal-h">6. Your rights</h2>
        <p>
          Under the DPDP Act you may request access to your personal data, correction of anything
          inaccurate, erasure where we have no continuing legal reason to keep it, and withdrawal of any
          consent you have given. You may also nominate another person to exercise these rights on your
          behalf. Write to <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> and we will respond
          within the statutory period.
        </p>

        <h2 className="legal-h">7. Cookies</h2>
        <p>
          We use a small number of functional cookies, including one that remembers your chosen display
          currency. We do not use advertising or cross-site tracking cookies.
        </p>

        <h2 className="legal-h">8. Security</h2>
        <p>
          Supplier API credentials are held server-side and never reach your browser. Data in transit is
          encrypted. No system is perfectly secure, and we will notify you and the Data Protection Board
          of a personal data breach as required by law.
        </p>

        <h2 className="legal-h">9. Children</h2>
        <p>
          We do not knowingly collect data from a child except as a named traveller on a booking made by
          a parent or guardian.
        </p>

        <h2 className="legal-h">10. Grievance Officer</h2>
        <p>
          In accordance with the Information Technology Act, 2000 and the rules made under it, the
          Grievance Officer is:
        </p>
        <address>
          <span>{COMPANY.grievanceOfficer.name}</span>
          <span>
            <a href={`mailto:${COMPANY.grievanceOfficer.email}`}>{COMPANY.grievanceOfficer.email}</a>
          </span>
          {COMPANY.grievanceOfficer.phone ? <span>{COMPANY.grievanceOfficer.phone}</span> : null}
          <span>{COMPANY.legalName}</span>
          {addressLines().map((l) => (
            <span key={l}>{l}</span>
          ))}
        </address>
        <p>
          We acknowledge every complaint within 24 hours of receipt and resolve it within 15 days, as
          required by the rules.
        </p>

        <h2 className="legal-h">11. Changes</h2>
        <p>
          If we change this policy we will update the date at the top of this page, and tell you
          directly where the change is significant.
        </p>

        <div className="footer">
          <Link href="/terms">Terms &amp; Conditions →</Link>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
