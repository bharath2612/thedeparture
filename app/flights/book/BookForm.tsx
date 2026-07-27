"use client";

import { useActionState } from "react";
import { bookFlightAction, type BookState } from "./actions";

export default function BookForm({
  supplier,
  offerId,
  count,
  sellLabel,
}: {
  supplier: string;
  offerId: string;
  count: number;
  sellLabel: string;
}) {
  const [state, action, pending] = useActionState<BookState, FormData>(bookFlightAction, {});

  return (
    <form action={action} style={{ marginTop: 26 }}>
      <input type="hidden" name="supplier" value={supplier} />
      <input type="hidden" name="offer" value={offerId} />
      <input type="hidden" name="count" value={count} />

      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Traveller {i + 1}
          </div>
          {/* columns live in CSS, not inline: an inline grid-template-columns
              outranks every media query, so this form could never collapse. */}
          <div className="searchgrid paxgrid">
            <div className="field">
              <label htmlFor={`title_${i}`}>Title</label>
              <select id={`title_${i}`} name={`title_${i}`} defaultValue="mr">
                <option value="mr">Mr</option>
                <option value="ms">Ms</option>
                <option value="mrs">Mrs</option>
                <option value="miss">Miss</option>
                <option value="dr">Dr</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor={`given_${i}`}>Given name</label>
              <input id={`given_${i}`} name={`given_${i}`} placeholder="As in passport" required />
            </div>
            <div className="field">
              <label htmlFor={`family_${i}`}>Family name</label>
              <input id={`family_${i}`} name={`family_${i}`} placeholder="As in passport" required />
            </div>
            <div className="field">
              <label htmlFor={`born_${i}`}>Date of birth</label>
              <input id={`born_${i}`} name={`born_${i}`} type="date" required />
            </div>
          </div>
        </div>
      ))}

      <div className="eyebrow" style={{ margin: "18px 0 10px" }}>
        Contact details. This is the thread your agent uses
      </div>
      <div className="searchgrid contactgrid">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" placeholder="you@example.com" required />
        </div>
        <div className="field">
          <label htmlFor="phone">WhatsApp / phone</label>
          <input id="phone" name="phone" placeholder="+919876543210" required />
        </div>
      </div>

      {state.error && <div className="error">{state.error}</div>}

      <button className="btn btn-white" type="submit" disabled={pending} style={{ marginTop: 22 }}>
        {pending ? "Issuing…" : `Confirm & issue · ${sellLabel}`}
      </button>
      <p style={{ marginTop: 12, fontSize: 12.5, color: "var(--ink-3)" }}>
        We re-price the fare with the supplier at the moment you confirm. If it moved, we stop and tell
        you rather than charging a stale price.
      </p>
    </form>
  );
}
