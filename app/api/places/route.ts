import { NextResponse } from "next/server";
import { searchAirports, searchCities } from "@/lib/places";

// Typeahead backend for the search bar. Reads a local index, so it answers in
// well under a millisecond and cannot be rate-limited or taken down.

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const kind = searchParams.get("kind") === "city" ? "city" : "airport";
  const limit = Math.min(12, Math.max(1, Number(searchParams.get("limit")) || 8));

  const results =
    kind === "city"
      ? searchCities(q, limit).map((c) => ({
          id: `${c.city}|${c.country}`,
          primary: c.city,
          secondary: c.countryName,
          code: c.country,
          city: c.city,
          country: c.country,
        }))
      : searchAirports(q, limit).map((a) => ({
          id: a.iata,
          primary: a.city || a.name,
          secondary: `${a.name} · ${a.countryName}`,
          code: a.iata,
          city: a.city,
          country: a.country,
        }));

  return NextResponse.json(
    { results },
    {
      // The dataset only changes when we rebuild it, so let the edge hold it.
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
    }
  );
}
