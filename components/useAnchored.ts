"use client";

import { useCallback, useEffect, useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";
import { computePlacement } from "@/lib/anchor.mjs";

// Positions a popover against its trigger, in viewport coordinates.
//
// Why this exists rather than `position: absolute; top: 100%`:
// the search card sets `overflow: hidden` (to clip its rounded corners) AND
// `backdrop-filter` (for the glass effect). The first clips an absolutely
// positioned dropdown; the second makes the card a containing block for
// fixed-position descendants, so `position: fixed` gets trapped and clipped
// too. The only reliable escape is to render the popover in a portal on
// <body> and place it by hand — which is what this hook computes.
//
// It also does what a naive `left: 0` cannot: keep the panel on screen. A
// 320px list hanging off a 180px column in the right-hand grid cell runs
// straight off the viewport edge on a laptop, and off every phone.

// The placement maths lives in lib/anchor.mjs so it can be tested without a
// browser: node scripts/test-anchor.mjs. This hook only supplies the rect.

export interface Anchored {
  style: CSSProperties;
  width: number; // the width actually granted, after clamping
  ready: boolean;
}

export function useAnchored(
  open: boolean,
  anchor: RefObject<HTMLElement | null>,
  desiredWidth: number
): Anchored {
  const [state, setState] = useState<Anchored>({ style: {}, width: desiredWidth, ready: false });

  const place = useCallback(() => {
    const el = anchor.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = computePlacement(
      r,
      document.documentElement.clientWidth,
      document.documentElement.clientHeight,
      desiredWidth
    );
    setState({
      style: {
        position: "fixed",
        left: p.left,
        width: p.width,
        top: p.top ?? "auto",
        bottom: p.bottom ?? "auto",
        maxHeight: p.maxHeight,
      },
      width: p.width,
      ready: true,
    });
  }, [anchor, desiredWidth]);

  useLayoutEffect(() => {
    if (!open) {
      setState((s) => (s.ready ? { ...s, ready: false } : s));
      return;
    }
    place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    // `true` for scroll: the page itself may not scroll, but an ancestor can,
    // and a capture-phase listener catches every one of them.
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  return state;
}

// Small helper so components can pick a layout from the width they were granted
// (e.g. the calendar showing one month instead of two on a phone).
export function useViewportWidth(): number {
  const [w, setW] = useState(0);
  useEffect(() => {
    const read = () => setW(document.documentElement.clientWidth);
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return w;
}
