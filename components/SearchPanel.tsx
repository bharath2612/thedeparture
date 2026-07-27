"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import PlacePicker, { type Place } from "./PlacePicker";
import DateRangePicker from "./DateRangePicker";
import TravellersPicker, { type CabinId } from "./TravellersPicker";

// The search bar, wired to the real rails.
// Flights → /flights (Duffel + any other live air supplier)
// Hotels  → /results (the multi-supplier hotel rate-shop)
//
// Both destination fields search the full worldwide index (5,328 airports,
// 236 countries) rather than a curated shortlist. Dates come from a real
// two-month range calendar, not a native date input.
//
// Layout follows the OTA convention: mode tabs and the trip toggle sit ABOVE
// the bar, and the bar itself is one connected object rather than a row of
// separate boxes — the accent colour is its background, showing through 3px
// gaps as the dividers between fields. Everything the traveller has to fill in
// is inside one ring, and the only thing outside it is the choice of what
// they're shopping for.

export interface SearchDefaults {
  depart: string;
  return: string;
  checkin: string;
  checkout: string;
}

// The band headline changes with the tab, so it has to read the tab state,
// which lives here. The words themselves stay in page.tsx — this component
// picks which set to show, it doesn't own the copy.
export interface BandCopy {
  badge: string;
  title: ReactNode;
  sub: string;
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
  copy,
}: {
  defaults: SearchDefaults;
  flightsLive: boolean;
  flightsNote: string;
  supplierLine: string;
  copy: Record<"flights" | "hotels", BandCopy>;
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
  const [cabin, setCabin] = useState<CabinId>("economy");

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

  function swap() {
    setFrom(to);
    setTo(from);
  }

  const c = copy[tab];

  return (
    <div className="searchpanel">
      <div className="bandcopy">
        <span className="badge">
          <span className="live-dot" />
          {c.badge}
        </span>
        <h1>{c.title}</h1>
        <p className="sub">{c.sub}</p>
      </div>

      <div className="barhead">
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

        {tab === "flights" && (
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
        )}
      </div>

      {tab === "flights" ? (
        <form onSubmit={searchFlights}>
          <div className="searchbar flights">
            <PlacePicker
              inputId="from"
              label="From"
              kind="airport"
              value={from}
              onChange={setFrom}
              placeholder="City or airport"
            />
            <div className="swapcell">
              <button type="button" className="swapbtn" onClick={swap} aria-label="Swap origin and destination">
                ⇄
              </button>
            </div>
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
            <TravellersPicker
              id="pax"
              mode="flights"
              count={pax}
              cabin={cabin}
              onCount={setPax}
              onCabin={setCabin}
            />
            <button className="searchbtn" type="submit" disabled={loading}>
              {loading ? "Searching…" : "Search"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={searchHotels}>
          <div className="searchbar hotels">
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
            <TravellersPicker id="guests" mode="hotels" count={guests} onCount={setGuests} />
            <button className="searchbtn" type="submit" disabled={loading}>
              {loading ? "Searching…" : "Search"}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="searchfoot" style={{ color: "var(--alert)" }}>
          {error}
        </div>
      )}

      <div className="searchfoot">
        <span className="dot" />
        <span>{supplierLine}</span>
      </div>
    </div>
  );
}
