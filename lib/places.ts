import "server-only";
import raw from "@/data/airports.json";

// Worldwide airport + city index.
//
// Source: OurAirports open data (public domain), filtered at build time to the
// 5,328 airports that hold a real IATA code and are actually served. Shipped as
// a file rather than called at runtime on purpose: no key, no rate limit, no
// third party that can go down and take the search box with it. Rebuild with
// scripts/build-airports.js when the upstream data moves.

interface RawData {
  countries: Record<string, string>;
  // [iata, name, city, countryCode, rank, alt] — rank 0 = large, 1 = medium, 2 = small
  airports: [string, string, string, string, number, string][];
}

// The tuple shape is guaranteed by scripts/build-airports.js; TS only sees a
// widened (string|number)[][] from the JSON import.
const data = raw as unknown as RawData;

// OurAirports records some cities under their older or official name — CCJ is
// "Calicut", not Kozhikode — and its keyword column doesn't always fill the gap.
// These are the corridor renames a traveller will actually type. Kept small and
// explicit rather than pulling in a geocoding dependency.
const ALIASES: Record<string, string[]> = {
  CCJ: ["kozhikode"],
  TRV: ["thiruvananthapuram"],
  BLR: ["bengaluru"],
  BOM: ["bombay"],
  MAA: ["madras"],
  COK: ["cochin", "ernakulam"],
  CNN: ["kannur"],
  SGN: ["saigon"],
  PNQ: ["poona"],
  VNS: ["benares", "kashi"],
  RUH: ["riyad"],
  AUH: ["abudhabi"],
};

export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string; // ISO code
  countryName: string;
  rank: number;
}

export interface CityPlace {
  city: string;
  country: string;
  countryName: string;
  rank: number;
}

// Strip diacritics so "Malmo" finds "Malmö" and "Dusseldorf" finds "Düsseldorf".
function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const AIRPORTS: Airport[] = data.airports.map(([iata, name, city, country, rank]) => ({
  iata,
  name,
  city,
  country,
  countryName: data.countries[country] || country,
  rank,
}));

// Folded search keys, computed once at module load rather than per keystroke.
const KEYS = AIRPORTS.map((a, i) => ({
  iata: a.iata.toLowerCase(),
  city: fold(a.city),
  name: fold(a.name),
  country: fold(a.countryName),
  alt: fold([data.airports[i][5] || "", ...(ALIASES[a.iata] || [])].join(" ")),
}));

// One entry per (city, country). A city is as good as its best airport, so
// rank carries through — that's what puts London ahead of Londrina.
const CITY_ENTRIES: { place: CityPlace; alt: string }[] = (() => {
  const byKey = new Map<string, { place: CityPlace; alt: string }>();
  for (let i = 0; i < AIRPORTS.length; i++) {
    const a = AIRPORTS[i];
    if (!a.city) continue;
    const key = `${fold(a.city)}|${a.country}`;
    const prev = byKey.get(key);
    // A city inherits the alternate names of every airport serving it, so
    // "bombay" finds Mumbai even though only BOM carries that keyword.
    const alt = [prev?.alt || "", KEYS[i].alt].filter(Boolean).join(" ");
    if (!prev || a.rank < prev.place.rank) {
      byKey.set(key, {
        place: { city: a.city, country: a.country, countryName: a.countryName, rank: a.rank },
        alt,
      });
    } else if (alt !== prev.alt) {
      byKey.set(key, { ...prev, alt });
    }
  }
  return [...byKey.values()];
})();

const CITIES: CityPlace[] = CITY_ENTRIES.map((e) => e.place);
const CITY_KEYS = CITY_ENTRIES.map((e) => ({
  city: fold(e.place.city),
  country: fold(e.place.countryName),
  alt: fold(e.alt),
}));

// Lower score = better match. Ranking beats raw substring matching here: typing
// "lon" should surface London, not Long Beach.
function scoreOf(
  q: string,
  k: { iata?: string; city: string; name?: string; country: string; alt?: string }
): number {
  if (k.iata && k.iata === q) return 0; // exact airport code
  if (k.city === q) return 1;
  if (k.city.startsWith(q)) return 2;
  if (k.alt && (k.alt === q || k.alt.startsWith(q) || k.alt.includes(` ${q}`))) return 3;
  if (k.name && k.name.startsWith(q)) return 4;
  if (k.city.includes(` ${q}`)) return 5;
  if (k.name && k.name.includes(` ${q}`)) return 6;
  if (k.name && k.name.includes(q)) return 7;
  if (k.country.startsWith(q)) return 8;
  return -1;
}

// Same score means same kind of match, so break the tie on airport size and
// then on how much of the name the query actually covered — "lon" matches both
// London and Long Beach at score 2, and the shorter name is the one meant.
function compare(
  aScore: number,
  bScore: number,
  aRank: number,
  bRank: number,
  aLen: number,
  bLen: number
): number {
  return aScore - bScore || aRank - bRank || aLen - bLen;
}

export function searchAirports(query: string, limit = 8): Airport[] {
  const q = fold(query);
  if (!q) {
    // Empty query: the busiest hubs, so the dropdown is useful before typing.
    return AIRPORTS.filter((a) => a.rank === 0).slice(0, limit);
  }
  const hits: { i: number; score: number }[] = [];
  for (let i = 0; i < KEYS.length; i++) {
    const s = scoreOf(q, KEYS[i]);
    if (s >= 0) hits.push({ i, score: s });
  }
  hits.sort((a, b) =>
    compare(
      a.score,
      b.score,
      AIRPORTS[a.i].rank,
      AIRPORTS[b.i].rank,
      (AIRPORTS[a.i].city || AIRPORTS[a.i].name).length,
      (AIRPORTS[b.i].city || AIRPORTS[b.i].name).length
    )
  );
  return hits.slice(0, limit).map((h) => AIRPORTS[h.i]);
}

export function searchCities(query: string, limit = 8): CityPlace[] {
  const q = fold(query);
  if (!q) return CITIES.filter((c) => c.rank === 0).slice(0, limit);
  const hits: { i: number; score: number }[] = [];
  for (let i = 0; i < CITY_KEYS.length; i++) {
    const s = scoreOf(q, CITY_KEYS[i]);
    if (s >= 0) hits.push({ i, score: s });
  }
  hits.sort((a, b) =>
    compare(a.score, b.score, CITIES[a.i].rank, CITIES[b.i].rank, CITIES[a.i].city.length, CITIES[b.i].city.length)
  );
  return hits.slice(0, limit).map((h) => CITIES[h.i]);
}

export function airportByIata(code: string): Airport | undefined {
  const c = (code || "").toUpperCase();
  return AIRPORTS.find((a) => a.iata === c);
}

export const airportCount = AIRPORTS.length;
export const cityCount = CITIES.length;
