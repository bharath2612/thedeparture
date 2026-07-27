import Link from "next/link";
import { redirect } from "next/navigation";
import { shopHotel, prebookVia } from "@/lib/rateshop";
import { priceUp, money, defaultMarkupPct } from "@/lib/markup";
import { LiteApiError } from "@/lib/liteapi";
import { showOpsPricing } from "@/lib/opsview";

export const dynamic = "force-dynamic";

interface SP {
  city?: string;
  country?: string;
  checkin?: string;
  checkout?: string;
  adults?: string;
}

function nightsBetween(a: string, b: string): number {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 864e5));
}

// Server action: prebook via whichever supplier the chosen room came from.
async function reserve(formData: FormData) {
  "use server";
  const supplier = String(formData.get("supplier") || "");
  const offerId = String(formData.get("offerId") || "");
  const hotelName = String(formData.get("hotelName") || "");
  const room = String(formData.get("room") || "");
  const board = String(formData.get("board") || "");
  const checkin = String(formData.get("checkin") || "");
  const checkout = String(formData.get("checkout") || "");
  const nights = String(formData.get("nights") || "1");
  const supplierName = String(formData.get("supplierName") || supplier);
  if (!offerId || !supplier) redirect("/");

  const pb = await prebookVia(supplier, offerId);
  const p = priceUp(pb.net, pb.currency, defaultMarkupPct());
  const q = new URLSearchParams({
    ref: pb.prebookId,
    supplier: supplierName,
    hotel: hotelName,
    room,
    board,
    checkin,
    checkout,
    nights,
    net: String(p.net),
    markup: String(p.markup),
    pct: String(p.markupPct),
    sell: String(p.sell),
    ccy: p.currency,
  });
  redirect(`/quote?${q.toString()}`);
}

export default async function HotelDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SP>;
}) {
  const { id } = await params;
  const mapKey = decodeURIComponent(id);
  const sp = await searchParams;
  const city = sp.city || "Dubai";
  const country = (sp.country || "AE").toUpperCase();
  const checkin = sp.checkin || new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const checkout = sp.checkout || new Date(Date.now() + 33 * 864e5).toISOString().slice(0, 10);
  const adults = Math.max(1, Number(sp.adults) || 2);
  const nights = nightsBetween(checkin, checkout);
  const currency = process.env.DEFAULT_CURRENCY || "AED";
  const markupPct = defaultMarkupPct();

  let data: Awaited<ReturnType<typeof shopHotel>> | null = null;
  let error: string | null = null;
  try {
    data = await shopHotel(
      { city, countryCode: country, checkin, checkout, occupancies: [{ adults }], currency, guestNationality: country },
      mapKey
    );
  } catch (e) {
    error = e instanceof LiteApiError ? e.message : "Could not load this hotel.";
  }

  const hotel = data?.hotel || null;
  const rooms = data?.rooms || [];
  const backParams = new URLSearchParams({ city, country, checkin, checkout, adults: String(adults) });
  const dateLabel = `${new Date(checkin).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })} – ${new Date(checkout).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;

  return (
    <div className="wrap">
      <div className="detail-top">
        <Link className="back" href={`/results?${backParams.toString()}`}>
          ← back to {city}
        </Link>
        <div className="name" style={{ marginTop: 8 }}>
          {hotel?.name || "Hotel"}
        </div>
        <div className="sub">
          {[hotel?.city, hotel?.country].filter(Boolean).join(", ") || city} · {dateLabel} · {nights}{" "}
          night{nights > 1 ? "s" : ""} · {adults} guest{adults > 1 ? "s" : ""}
        </div>
        {showOpsPricing() && hotel && hotel.supplierCount > 1 && (
          <div className="supcompare">
            Priced across {hotel.supplierCount} suppliers:{" "}
            {hotel.quotes.map((q, i) => (
              <span key={q.supplier} style={{ marginRight: 14 }}>
                {i === 0 ? (
                  <span className="beat">
                    {q.supplierName} {money(q.net, q.currency)} ✓
                  </span>
                ) : (
                  <s>
                    {q.supplierName} {money(q.net, q.currency)}
                  </s>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {error && <div className="error">{error}</div>}
      {!error && rooms.length === 0 && (
        <div className="empty">No rooms available for these dates. Try adjusting your search.</div>
      )}

      <div className="roomlist">
        {rooms.map((room, i) => {
          const isDemo = room.supplier === "demo";
          return (
            <div className="room" key={room.offerId + i}>
              <div>
                <div className="rname">{room.roomName}</div>
                <div className="suprow">
                  <span className={`supbadge win ${isDemo ? "demo" : ""}`}>via {room.supplierName}</span>
                  <span className="supbadge">{room.board}</span>
                  <span className="supbadge">{room.refundable ? "Free cancellation" : "Non-refundable"}</span>
                </div>
              </div>
              <div className="rprice">
                <div className="amt">{money(room.priced.sell, room.priced.currency)}</div>
                {showOpsPricing() && (
                  <div
                    className="per"
                    style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)" }}
                  >
                    net {money(room.priced.net, room.priced.currency)} · +{markupPct}% ={" "}
                    {money(room.priced.markup, room.priced.currency)}
                  </div>
                )}
                <form action={reserve}>
                  <input type="hidden" name="supplier" value={room.supplier} />
                  <input type="hidden" name="supplierName" value={room.supplierName} />
                  <input type="hidden" name="offerId" value={room.offerId} />
                  <input type="hidden" name="hotelName" value={hotel?.name || "Hotel"} />
                  <input type="hidden" name="room" value={room.roomName} />
                  <input type="hidden" name="board" value={room.board} />
                  <input type="hidden" name="checkin" value={checkin} />
                  <input type="hidden" name="checkout" value={checkout} />
                  <input type="hidden" name="nights" value={String(nights)} />
                  <button className="bookbtn" type="submit" disabled={isDemo}>
                    {isDemo ? "synthetic — not bookable" : "Lock price & quote →"}
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>

      {showOpsPricing() && rooms.length > 0 && (
        <div className="opstrip">
          <div>
            <div className="k">Cheapest net (you pay)</div>
            <div className="v">{money(rooms[0].priced.net, rooms[0].priced.currency)}</div>
          </div>
          <div>
            <div className="k">Won by</div>
            <div className="v" style={{ fontSize: 16 }}>
              {rooms[0].supplierName}
            </div>
          </div>
          <div>
            <div className="k">Your margin ({markupPct}%)</div>
            <div className="v good">{money(rooms[0].priced.markup, rooms[0].priced.currency)}</div>
          </div>
          <div>
            <div className="k">Traveller pays</div>
            <div className="v">{money(rooms[0].priced.sell, rooms[0].priced.currency)}</div>
          </div>
          <p className="say">
            Cheapest room wins regardless of which aggregator it came from. Add suppliers → the floor
            drops.
          </p>
        </div>
      )}
    </div>
  );
}
