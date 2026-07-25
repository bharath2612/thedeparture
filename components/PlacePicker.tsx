"use client";

import { useEffect, useRef, useState } from "react";

// Typeahead over the worldwide airport/city index. Keyboard-first: ↑/↓ to move,
// Enter to take the highlighted row, Esc to close. Requests are debounced and
// stale responses are discarded, so fast typing can't leave an older result set
// on screen.

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
  const [results, setResults] = useState<Place[]>([]);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  // Close when focus leaves the whole control, not just the input — clicking a
  // result must not count as leaving.
  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
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

  const shown = value && !open ? (kind === "airport" ? `${value.city || value.primary} · ${value.code}` : value.primary) : text;

  return (
    <div className="field picker" ref={boxRef}>
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
      {open && results.length > 0 && (
        <ul className="picker-list" id={`${inputId}-list`} role="listbox">
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
      )}
    </div>
  );
}
