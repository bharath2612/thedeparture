"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// The glass search bar from the landing design, wired to the real rails.
// Flights → /flights (Duffel + any other live air supplier)
// Hotels  → /results (the existing multi-supplier hotel rate-shop)
//
// Dates are passed in from the server so SSR and the client agree — computing
// "today + 30" on both sides would mismatch across a midnight boundary.

export interface SearchDefaults {
  depart: string;
  return: string;
  checkin: string;
  checkout: string;
}

// LiteAPI needs a country code alongside the city, so destination is a fixed
// list rather than free text. These are the corridor cities that actually have
// inventory; a free-text box that silently returns nothing is worse UX.
const HOTEL_CITIES = [
  { label: "Dubai, UAE", city: "Dubai", country: "AE" },
  { label: "Abu Dhabi, UAE", city: "Abu Dhabi", country: "AE" },
  { label: "Sharjah, UAE", city: "Sharjah", country: "AE" },
  { label: "Mumbai, India", city: "Mumbai", country: "IN" },
  { label: "Kochi, India", city: "Kochi", country: "IN" },
  { label: "Bengaluru, India", city: "Bengaluru", country: "IN" },
  { label: "New Delhi, India", city: "New Delhi", country: "IN" },
  { label: "Chennai, India", city: "Chennai", country: "IN" },
  { label: "Doha, Qatar", city: "Doha", country: "QA" },
  { label: "Muscat, Oman", city: "Muscat", country: "OM" },
  { label: "Riyadh, Saudi Arabia", city: "Riyadh", country: "SA" },
  { label: "Singapore", city: "Singapore", country: "SG" },
  { label: "Bangkok, Thailand", city: "Bangkok", country: "TH" },
  { label: "London, UK", city: "London", country: "GB" },
];

const AIRPORTS = [
  { code: "DEL", label: "Delhi · DEL" },
  { code: "BOM", label: "Mumbai · BOM" },
  { code: "COK", label: "Kochi · COK" },
  { code: "MAA", label: "Chennai · MAA" },
  { code: "BLR", label: "Bengaluru · BLR" },
  { code: "HYD", label: "Hyderabad · HYD" },
  { code: "CCJ", label: "Kozhikode · CCJ" },
  { code: "TRV", label: "Thiruvananthapuram · TRV" },
  { code: "DXB", label: "Dubai · DXB" },
  { code: "SHJ", label: "Sharjah · SHJ" },
  { code: "AUH", label: "Abu Dhabi · AUH" },
  { code: "DOH", label: "Doha · DOH" },
  { code: "MCT", label: "Muscat · MCT" },
  { code: "RUH", label: "Riyadh · RUH" },
  { code: "JED", label: "Jeddah · JED" },
  { code: "SIN", label: "Singapore · SIN" },
  { code: "LHR", label: "London · LHR" },
];

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
  const [from, setFrom] = useState("DEL");
  const [to, setTo] = useState("DXB");
  const [trip, setTrip] = useState<"return" | "oneway">("return");
  const [depart, setDepart] = useState(defaults.depart);
  const [ret, setRet] = useState(defaults.return);
  const [pax, setPax] = useState(1);
  const [cabin, setCabin] = useState("economy");

  // hotels
  const [dest, setDest] = useState(HOTEL_CITIES[0].label);
  const [checkin, setCheckin] = useState(defaults.checkin);
  const [checkout, setCheckout] = useState(defaults.checkout);
  const [guests, setGuests] = useState(2);

  function searchFlights(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const q = new URLSearchParams({
      from,
      to,
      depart,
      adults: String(pax),
      cabin,
    });
    if (trip === "return") q.set("return", ret);
    router.push(`/flights?${q}`);
  }

  function searchHotels(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const picked = HOTEL_CITIES.find((c) => c.label === dest) || HOTEL_CITIES[0];
    const q = new URLSearchParams({
      city: picked.city,
      country: picked.country,
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
            disabled={!flightsLive}
            title={flightsLive ? undefined : flightsNote}
          >
            Flights{flightsLive ? "" : " · soon"}
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
              <div className="field">
                <label htmlFor="from">From</label>
                <select id="from" value={from} onChange={(e) => setFrom(e.target.value)}>
                  {AIRPORTS.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="to">To</label>
                <select id="to" value={to} onChange={(e) => setTo(e.target.value)}>
                  {AIRPORTS.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="depart">Depart</label>
                <input
                  id="depart"
                  type="date"
                  value={depart}
                  onChange={(e) => setDepart(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="ret">{trip === "return" ? "Return" : "Return · off"}</label>
                <input
                  id="ret"
                  type="date"
                  value={ret}
                  disabled={trip !== "return"}
                  onChange={(e) => setRet(e.target.value)}
                />
              </div>
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
                  {[1, 2, 3, 4].flatMap((n) =>
                    ["economy", "business"].map((c) => (
                      <option key={`${n}|${c}`} value={`${n}|${c}`}>
                        {n} · {c === "economy" ? "Economy" : "Business"}
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
              <div className="field">
                <label htmlFor="dest">Destination</label>
                <select id="dest" value={dest} onChange={(e) => setDest(e.target.value)}>
                  {HOTEL_CITIES.map((c) => (
                    <option key={c.label} value={c.label}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="checkin">Check-in</label>
                <input
                  id="checkin"
                  type="date"
                  value={checkin}
                  onChange={(e) => setCheckin(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="checkout">Check-out</label>
                <input
                  id="checkout"
                  type="date"
                  value={checkout}
                  onChange={(e) => setCheckout(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="guests">Guests</label>
                <select
                  id="guests"
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                >
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

        <div className="searchfoot">
          <span className="dot" />
          <span>{supplierLine}</span>
        </div>
      </div>
    </div>
  );
}
