"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import PlacePicker, { type Place } from "./PlacePicker";
import DateRangePicker from "./DateRangePicker";

// The glass search bar from the landing design, wired to the real rails.
// Flights → /flights (Duffel + any other live air supplier)
// Hotels  → /results (the multi-supplier hotel rate-shop)
//
// Both destination fields search the full worldwide index (5,328 airports,
// 236 countries) rather than a curated shortlist. Dates come from a real
// two-month range calendar, not a native date input.

export interface SearchDefaults {
  depart: string;
  return: string;
  checkin: string;
  checkout: string;
}

const DEFAULT_FROM: Place = {
  id: "DEL",
  primary: "New Delhi",
  secondary: "Indira Gandhi International Airport · India",
  code: "DEL",
  city: "New Delhi",
  country: "IN",
};
const DEFAULT_TO: Place = {
  id: "DXB",
  primary: "Dubai",
  secondary: "Dubai International Airport · United Arab Emirates",
  code: "DXB",
  city: "Dubai",
  country: "AE",
};
const DEFAULT_CITY: Place = {
  id: "Dubai|AE",
  primary: "Dubai",
  secondary: "United Arab Emirates",
  code: "AE",
  city: "Dubai",
  country: "AE",
};

export default function SearchPanel({
  defaults,
  flightsLive,
  flightsNote,
  supplierLine,
}: {
  defaults: SearchDefaults;
  flightsLive: boolean;
  flightsNote: string;
  supplierLine: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"flights" | "hotels">(flightsLive ? "flights" : "hotels");
  const [loading, setLoading] = useState(false);

  // flights
  const [from, setFrom] = useState<Place>(DEFAULT_FROM);
  const [to, setTo] = useState<Place>(DEFAULT_TO);
  const [trip, setTrip] = useState<"return" | "oneway">("return");
  const [depart, setDepart] = useState(defaults.depart);
  const [ret, setRet] = useState(defaults.return);
  const [pax, setPax] = useState(1);
  const [cabin, setCabin] = useState("economy");

  // hotels
  const [dest, setDest] = useState<Place>(DEFAULT_CITY);
  const [checkin, setCheckin] = useState(defaults.checkin);
  const [checkout, setCheckout] = useState(defaults.checkout);
  const [guests, setGuests] = useState(2);

  const [error, setError] = useState("");

  function searchFlights(e: React.FormEvent) {
    e.preventDefault();
    if (from.code === to.code) {
      setError("Origin and destination are the same airport.");
      return;
    }
    if (trip === "return" && !ret) {
      setError("Pick a return date, or switch to one way.");
      return;
    }
    setError("");
    setLoading(true);
    const q = new URLSearchParams({ from: from.code, to: to.code, depart, adults: String(pax), cabin });
    if (trip === "return") q.set("return", ret);
    router.push(`/flights?${q}`);
  }

  function searchHotels(e: React.FormEvent) {
    e.preventDefault();
    if (!checkout || checkout <= checkin) {
      setError("Check-out must be after check-in.");
      return;
    }
    setError("");
    setLoading(true);
    const q = new URLSearchParams({
      city: dest.city,
      country: dest.country,
      checkin,
      checkout,
      adults: String(guests),
    });
    router.push(`/results?${q}`);
  }

  return (
    <div className="searchpanel">
      <div className="searchcard">
        <div className="tabs">
          <button
            type="button"
            className={`tab ${tab === "flights" ? "on" : ""}`}
            onClick={() => setTab("flights")}
            title={flightsLive ? undefined : flightsNote}
          >
            Flights
          </button>
          <button
            type="button"
            className={`tab ${tab === "hotels" ? "on" : ""}`}
            onClick={() => setTab("hotels")}
          >
            Hotels
          </button>
        </div>

        {tab === "flights" ? (
          <form onSubmit={searchFlights}>
            <div className="trips">
              <button
                type="button"
                className={`trip ${trip === "return" ? "on" : ""}`}
                onClick={() => setTrip("return")}
              >
                Return
              </button>
              <button
                type="button"
                className={`trip ${trip === "oneway" ? "on" : ""}`}
                onClick={() => setTrip("oneway")}
              >
                One way
              </button>
            </div>
            <div className="searchgrid flights">
              <PlacePicker
                inputId="from"
                label="From"
                kind="airport"
                value={from}
                onChange={setFrom}
                placeholder="City or airport"
              />
              <PlacePicker
                inputId="to"
                label="To"
                kind="airport"
                value={to}
                onChange={setTo}
                placeholder="City or airport"
              />
              <DateRangePicker
                id="flightdates"
                label={trip === "return" ? "Depart · Return" : "Depart"}
                start={depart}
                end={ret}
                rangeMode={trip === "return"}
                onChange={(s, e2) => {
                  setDepart(s);
                  setRet(e2);
                }}
              />
              <div className="field">
                <label htmlFor="pax">Travellers</label>
                <select
                  id="pax"
                  value={`${pax}|${cabin}`}
                  onChange={(e) => {
                    const [p, c] = e.target.value.split("|");
                    setPax(Number(p));
                    setCabin(c);
                  }}
                >
                  {[1, 2, 3, 4, 5, 6].flatMap((n) =>
                    ["economy", "premium_economy", "business", "first"].map((c) => (
                      <option key={`${n}|${c}`} value={`${n}|${c}`}>
                        {n} · {c === "premium_economy" ? "Premium" : c[0].toUpperCase() + c.slice(1)}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <button className="searchbtn" type="submit" disabled={loading}>
                {loading ? "Searching…" : "Search"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={searchHotels}>
            <div className="searchgrid hotels">
              <PlacePicker
                inputId="dest"
                label="Destination"
                kind="city"
                value={dest}
                onChange={setDest}
                placeholder="Any city worldwide"
              />
              <DateRangePicker
                id="staydates"
                label="Check-in · Check-out"
                start={checkin}
                end={checkout}
                rangeMode
                onChange={(s, e2) => {
                  setCheckin(s);
                  setCheckout(e2);
                }}
              />
              <div className="field">
                <label htmlFor="guests">Guests</label>
                <select id="guests" value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n} · 1 room
                    </option>
                  ))}
                </select>
              </div>
              <button className="searchbtn" type="submit" disabled={loading}>
                {loading ? "Searching…" : "Search"}
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="searchfoot" style={{ color: "var(--alert)", paddingTop: 0 }}>
            {error}
          </div>
        )}

        <div className="searchfoot">
          <span className="dot" />
          <span>{supplierLine}</span>
        </div>
      </div>
    </div>
  );
}
