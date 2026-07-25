"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAnchored } from "./useAnchored";

// Two months side by side need ~522px; one needs ~252px. Below that the panel
// is clamped to the viewport and we drop to a single month rather than letting
// it overflow the screen.
const TWO_MONTH_WIDTH = 522;
const ONE_MONTH_WIDTH = 252;

// Two-month calendar with range selection. No dependency — a date picker is
// ~150 lines and pulling in a library would cost more bytes than the whole
// airport index.
//
// Dates are handled as plain YYYY-MM-DD strings throughout. Constructing Date
// objects for display would re-project them through the browser's timezone and
// can shift a booking by a day either side of midnight.

const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
function ymd(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function todayStr(): string {
  const n = new Date();
  return ymd(n.getFullYear(), n.getMonth(), n.getDate());
}
function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}
// Monday-first offset for the 1st of the month.
function leadingBlanks(y: number, m: number): number {
  return (new Date(y, m, 1).getDay() + 6) % 7;
}
function addMonth(y: number, m: number, delta: number): [number, number] {
  const t = m + delta;
  return [y + Math.floor(t / 12), ((t % 12) + 12) % 12];
}

export function formatShort(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1].slice(0, 3)}${y !== new Date().getFullYear() ? ` ${y}` : ""}`;
}

export default function DateRangePicker({
  label,
  start,
  end,
  onChange,
  rangeMode,
  minDate,
  id,
}: {
  label: string;
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  rangeMode: boolean; // false = single date (one-way)
  minDate?: string;
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pickingEnd, setPickingEnd] = useState(false);
  const [hover, setHover] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const min = minDate || todayStr();
  const [vy, setVy] = useState(() => Number(start.slice(0, 4)) || new Date().getFullYear());
  const [vm, setVm] = useState(() => (Number(start.slice(5, 7)) || new Date().getMonth() + 1) - 1);

  const anchored = useAnchored(open, boxRef, TWO_MONTH_WIDTH);
  // If the viewport forced the panel narrower than two months fit, show one.
  const months = anchored.width >= TWO_MONTH_WIDTH - 1 ? 2 : 1;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const t = e.target as Node;
      if (boxRef.current?.contains(t)) return;
      // The panel is portalled to <body>, so it is not inside boxRef.
      if (popRef.current?.contains(t)) return;
      setOpen(false);
      setPickingEnd(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  function choose(iso: string) {
    if (!rangeMode) {
      onChange(iso, "");
      setOpen(false);
      return;
    }
    if (!pickingEnd) {
      // Starting a new range: clear the old end so the highlight can't show a
      // range that spans a date the user just moved past.
      onChange(iso, "");
      setPickingEnd(true);
      return;
    }
    if (iso < start) {
      onChange(iso, "");
      return;
    }
    onChange(start, iso);
    setPickingEnd(false);
    setOpen(false);
  }

  const summary = rangeMode
    ? start && end
      ? `${formatShort(start)} — ${formatShort(end)}`
      : start
        ? `${formatShort(start)} — …`
        : "Select dates"
    : start
      ? formatShort(start)
      : "Select date";

  function renderMonth(y: number, m: number) {
    const blanks = leadingBlanks(y, m);
    const total = daysInMonth(y, m);
    const cells: (string | null)[] = Array(blanks).fill(null);
    for (let d = 1; d <= total; d++) cells.push(ymd(y, m, d));

    return (
      <div className="cal-month" key={`${y}-${m}`}>
        <div className="cal-title">
          {MONTHS[m]} {y}
        </div>
        <div className="cal-grid cal-dow">
          {DOW.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="cal-grid">
          {cells.map((iso, i) => {
            if (!iso) return <span key={`b${i}`} />;
            const disabled = iso < min;
            const isStart = iso === start;
            const isEnd = iso === end;
            const provisionalEnd = pickingEnd && hover && hover > start ? hover : end;
            const inRange =
              rangeMode && start && provisionalEnd && iso > start && iso < provisionalEnd;
            return (
              <button
                type="button"
                key={iso}
                disabled={disabled}
                className={`cal-day${isStart || isEnd ? " sel" : ""}${inRange ? " in" : ""}`}
                onMouseEnter={() => setHover(iso)}
                onClick={() => choose(iso)}
                aria-label={iso}
              >
                {Number(iso.slice(8))}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const [ny, nm] = addMonth(vy, vm, 1);

  const panel =
    open && anchored.ready ? (
      <div className="cal-pop" ref={popRef} style={anchored.style}>
        <div className="cal-nav">
          <button
            type="button"
            onClick={() => {
              const [y, m] = addMonth(vy, vm, -1);
              setVy(y);
              setVm(m);
            }}
            aria-label="Previous month"
          >
            ←
          </button>
          <span>
            {rangeMode ? (pickingEnd ? "Pick the return date" : "Pick the departure date") : "Pick a date"}
          </span>
          <button
            type="button"
            onClick={() => {
              const [y, m] = addMonth(vy, vm, 1);
              setVy(y);
              setVm(m);
            }}
            aria-label="Next month"
          >
            →
          </button>
        </div>
        <div className="cal-months" onMouseLeave={() => setHover("")}>
          {renderMonth(vy, vm)}
          {months === 2 ? renderMonth(ny, nm) : null}
        </div>
      </div>
    ) : null;

  return (
    <div className="field picker" ref={boxRef}>
      <label htmlFor={id}>{label}</label>
      <button
        type="button"
        id={id}
        className="cal-trigger"
        onClick={() => {
          setOpen((o) => !o);
          setPickingEnd(false);
        }}
        aria-expanded={open}
      >
        {summary}
      </button>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
