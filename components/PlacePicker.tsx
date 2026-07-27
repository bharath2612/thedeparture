"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAnchored } from "./useAnchored";

// Typeahead over the worldwide airport/city index. Keyboard-first: ↑/↓ to move,
// Enter to take the highlighted row, Esc to close. Requests are debounced and
// stale responses are discarded, so fast typing can't leave an older result set
// on screen.
//
// The result list renders in a portal on <body>: the search card clips its
// children and its backdrop-filter traps fixed positioning, so an in-place
// dropdown gets cut off. See useAnchored.

export interface Place {
  id: string;
  primary: string;
  secondary: string;
  code: string;
  city: string;
  country: string;
}

export default function PlacePicker({
  label,
  kind,
  value,
  onChange,
  placeholder,
  inputId,
}: {
  label: string;
  kind: "airport" | "city";
  value: Place | null;
  onChange: (p: Place) => void;
  placeholder?: string;
  inputId: string;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [results, setResults] = useState<Place[]>([]);
  const [active, setActive] = useState(0);
  const fieldRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLUListElement>(null);
  const reqId = useRef(0);

  const anchored = useAnchored(open, fieldRef, 380);

  useEffect(() => setMounted(true), []);

  // Close when the click lands outside BOTH the field and the portalled list ,
  // the list is not a DOM descendant of the field, so one check isn't enough.
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

  useEffect(() => {
    if (!open) return;
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places?kind=${kind}&q=${encodeURIComponent(text)}`);
        const j = (await res.json()) as { results: Place[] };
        if (id === reqId.current) {
          setResults(j.results || []);
          setActive(0);
        }
      } catch {
        if (id === reqId.current) setResults([]);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [text, kind, open]);

  function pick(p: Place) {
    onChange(p);
    setText("");
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      if (results[active]) {
        e.preventDefault();
        pick(results[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const shown =
    value && !open
      ? kind === "airport"
        ? `${value.city || value.primary} · ${value.code}`
        : value.primary
      : text;

  const list =
    open && anchored.ready && results.length > 0 ? (
      <ul
        className="picker-list"
        id={`${inputId}-list`}
        role="listbox"
        ref={popRef}
        style={anchored.style}
      >
        {results.map((r, i) => (
          <li
            key={r.id}
            role="option"
            aria-selected={i === active}
            className={i === active ? "on" : ""}
            onMouseEnter={() => setActive(i)}
            onMouseDown={(e) => {
              // mousedown, not click: the input's blur would close the list first.
              e.preventDefault();
              pick(r);
            }}
          >
            <span className="p">{r.primary}</span>
            <span className="s">{r.secondary}</span>
            <span className="c">{r.code}</span>
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <div className="field picker" ref={fieldRef}>
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        value={shown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${inputId}-list`}
        onFocus={() => {
          setOpen(true);
          setText("");
        }}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {value && !open && <span className="picker-sub">{value.secondary}</span>}
      {mounted && list ? createPortal(list, document.body) : null}
    </div>
  );
}
