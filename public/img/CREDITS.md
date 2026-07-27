# Image credits

All photographs in this directory are from [Unsplash](https://unsplash.com)
and are used under the [Unsplash License](https://unsplash.com/license), which
permits commercial use and does not require attribution. Credit is recorded
here anyway so the provenance of every asset on the site is traceable, and so
a future swap to licensed stock is a one-line change rather than an audit.

Each file was fetched pre-cropped and converted to WebP at the size it is
actually displayed, via Unsplash's image parameters (`w`, `h`, `fit=crop`,
`fm=webp`, `q=72`). Do not replace these with full-resolution originals — the
whole point is that the landing page ships under a megabyte of imagery.

| File | Unsplash photo ID | Subject |
|---|---|---|
| `hero.webp` | `1623039541649-7cbe31b08d65` | Aircraft wing above cloud at sunset |
| `cta.webp` | `1699701081013-01b1d58d8664` | Airport terminal lit at night |
| `step-1.webp` | `1721592872734-3398900b195c` | Split-flap departure board |
| `step-2.webp` | `1746020681437-bb0a721cf2fa` | Travellers crossing a terminal concourse |
| `step-3.webp` | `1629221731259-4f0760e3ee89` | Widebody at the gate at night |
| `dest-DXB.webp` | `1512453979798-5ea266f8880c` | Dubai — Burj Khalifa and Sheikh Zayed Road |
| `dest-SIN.webp` | `1525625293386-3f8f99389edd` | Singapore — Marina Bay Sands |
| `dest-LHR.webp` | `1513635269975-59663e0ac1ad` | London — Tower Bridge and the Thames |

## Adding a destination

`DESTINATIONS` in `lib/showcase.ts` requires an `image` for every entry, so a
new destination cannot be added without one. Name it `dest-<IATA>.webp`, crop
to 820×460, and add a row above.
