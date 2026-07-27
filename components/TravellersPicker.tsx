"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAnchored } from "./useAnchored";

// The occupancy control. It replaces a <select> that held the full cartesian
// product of travellers × cabin, 24 options to pick two independent things.
// Two things, two controls: a stepper and a cabin list, in one popover, with
// a summary line in the bar. Same pattern every OTA uses, for the same reason.
//
// Portalled and placed by useAnchored for the same reason PlacePicker is: the
// bar clips its children, so an in-place dropdown gets cut off.

export const CABINS = [
  { id: "economy", label: "Economy" },
  { id: "premium_economy", label: "Premium economy" },
  { id: "business", label: "Business" },
  { id: "first", label: "First" },
] as const;

export type CabinId = (typeof CABINS)[number]["id"];

const MAX = 9;

export default function TravellersPicker({
  id,
  mode,
  count,
  cabin,
  onCount,
  onCabin,
}: {
  id: string;
  mode: "flights" | "hotels";
  count: number;
  cabin?: CabinId;
  onCount: (n: number) => void;
  onCabin?: (c: CabinId) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const anchored = useAnchored(open, fieldRef, 300);

  useEffect(() => setMounted(true), []);

  // Close on a click outside BOTH the field and the portalled popover, the
  // popover is not a DOM descendant of the field, so one check isn't enough.
  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const t = e.target as Node;
      if (fieldRef.current?.contains(t)) return;
      if (popRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  const label = mode === "flights" ? "Travellers" : "Guests";
  const noun = mode === "flights" ? "traveller" : "guest";
  const plural = `${count} ${noun}${count > 1 ? "s" : ""}`;
  const summary =
    mode === "flights"
      ? `${plural} · ${CABINS.find((c) => c.id === cabin)?.label || "Economy"}`
      : `${plural} · 1 room`;

  const pop =
    open && anchored.ready ? (
      <div className="occpop" ref={popRef} style={anchored.style} role="dialog" aria-label={label}>
        <div className="occrow">
          <span className="l">{label}</span>
          <span className="stepper">
            <button
              type="button"
              onClick={() => onCount(Math.max(1, count - 1))}
              disabled={count <= 1}
              aria-label={`One fewer ${noun}`}
            >
              −
            </button>
            <span className="n">{count}</span>
            <button
              type="button"
              onClick={() => onCount(Math.min(MAX, count + 1))}
              disabled={count >= MAX}
              aria-label={`One more ${noun}`}
            >
              +
            </button>
          </span>
        </div>

        {mode === "flights" && onCabin ? (
          <>
            <div className="occsep" />
            <div className="occcabins" role="radiogroup" aria-label="Cabin">
              {CABINS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={cabin === c.id}
                  className={cabin === c.id ? "on" : ""}
                  onClick={() => onCabin(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </>
        ) : null}

        <div className="occsep" />
        <button type="button" className="occdone" onClick={() => setOpen(false)}>
          Done
        </button>
      </div>
    ) : null;

  return (
    <div className="field picker" ref={fieldRef}>
      <label htmlFor={id}>{label}</label>
      <button
        id={id}
        type="button"
        className="fieldvalue"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {summary}
      </button>
      {mounted ? createPortal(pop, document.body) : null}
    </div>
  );
}
