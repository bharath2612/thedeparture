// Build a compact worldwide airport index from OurAirports open data
// (public domain). Output ships in the repo, no key, no runtime dependency.
const fs = require("fs");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const src = process.argv[2];
const countriesSrc = process.argv[3];
const out = process.argv[4];

const rows = parseCsv(fs.readFileSync(src, "utf8"));
const head = rows[0];
const col = (n) => head.indexOf(n);
const C = {
  type: col("type"),
  name: col("name"),
  country: col("iso_country"),
  city: col("municipality"),
  sched: col("scheduled_service"),
  iata: col("iata_code"),
  keywords: col("keywords"),
};

const countryRows = parseCsv(fs.readFileSync(countriesSrc, "utf8"));
const cHead = countryRows[0];
const cCode = cHead.indexOf("code");
const cName = cHead.indexOf("name");
const countries = {};
for (let i = 1; i < countryRows.length; i++) {
  const r = countryRows[i];
  if (r[cCode]) countries[r[cCode]] = r[cName];
}

const RANK = { large_airport: 0, medium_airport: 1, small_airport: 2 };

const airports = [];
const seen = new Set();
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  const iata = (r[C.iata] || "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(iata)) continue;
  if (seen.has(iata)) continue;
  const type = r[C.type];
  if (!(type in RANK)) continue;
  // Scheduled service is the honest filter for "somewhere you can actually fly
  // to": it drops ~3k airstrips that hold an IATA code but no airline serves.
  const scheduled = r[C.sched] === "yes";
  if (!scheduled && RANK[type] === 2) continue;
  seen.add(iata);
  const name = r[C.name].replace(/\s+/g, " ").trim();
  const city = (r[C.city] || "").trim();
  // Keywords carry former and local-language names ("Saigon", "Bombay"), which
  // is exactly what a traveller types. Keep only the words that aren't already
  // in the name or city, so the shipped file doesn't pay for duplicates.
  const known = `${name} ${city}`.toLowerCase();
  const alt = (r[C.keywords] || "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s && s.length < 32 && !known.includes(s.toLowerCase()))
    .slice(0, 3)
    .join(" ")
    .slice(0, 60);
  airports.push([iata, name, city, r[C.country], scheduled ? RANK[type] : RANK[type] + 1, alt]);
}

// Sort by rank then IATA so the shipped file has a stable diff.
airports.sort((a, b) => a[4] - b[4] || a[0].localeCompare(b[0]));

const usedCountries = {};
for (const a of airports) if (countries[a[3]]) usedCountries[a[3]] = countries[a[3]];

fs.writeFileSync(out, JSON.stringify({ countries: usedCountries, airports }));
const stat = fs.statSync(out);
console.log(
  `airports: ${airports.length}  countries: ${Object.keys(usedCountries).length}  size: ${(stat.size / 1024).toFixed(0)} KB`
);
const byRank = {};
for (const a of airports) byRank[a[4]] = (byRank[a[4]] || 0) + 1;
console.log("by rank:", byRank);
console.log("samples:", airports.slice(0, 3), airports.filter((a) => ["DXB", "COK", "JFK"].includes(a[0])));
