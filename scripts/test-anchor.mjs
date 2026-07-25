// Placement tests for the search-bar popovers. Run: node scripts/test-anchor.mjs
//
// These cover the bug that started this: a 380px list anchored at left:0 under
// a ~180px grid column in the right-hand cell ran straight off the viewport.

import { computePlacement, ANCHOR_MARGIN, ANCHOR_GAP } from "../lib/anchor.mjs";

let pass = 0;
let fail = 0;

function check(name, cond, detail) {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
    return;
  }
  console.log(`  ok    ${name}`);
}

function rect(left, top, width, height) {
  return { left, top, right: left + width, bottom: top + height };
}

// The real layouts the search bar renders in.
const VIEWPORTS = [
  { name: "phone 375", vw: 375, vh: 812 },
  { name: "phone 414", vw: 414, vh: 896 },
  { name: "tablet 768", vw: 768, vh: 1024 },
  { name: "laptop 1280", vw: 1280, vh: 800 },
  { name: "desktop 1920", vw: 1920, vh: 1080 },
];

console.log("\nPanel never leaves the viewport (list, 380px):");
for (const v of VIEWPORTS) {
  // Rightmost field of the flights grid sits near the right edge of a 960px
  // card, centred in the viewport.
  const cardLeft = Math.max(0, (v.vw - 960) / 2);
  const fieldLeft = cardLeft + Math.min(960, v.vw) - 200;
  const p = computePlacement(rect(fieldLeft, 420, 180, 52), v.vw, v.vh, 380);
  check(
    `${v.name} rightmost field stays on screen`,
    p.left >= ANCHOR_MARGIN && p.left + p.width <= v.vw - ANCHOR_MARGIN,
    `left=${p.left} width=${p.width} vw=${v.vw}`
  );
}

console.log("\nPanel never leaves the viewport (calendar, 522px):");
for (const v of VIEWPORTS) {
  const cardLeft = Math.max(0, (v.vw - 960) / 2);
  const fieldLeft = cardLeft + Math.min(960, v.vw) - 340;
  const p = computePlacement(rect(fieldLeft, 420, 200, 52), v.vw, v.vh, 522);
  check(
    `${v.name} calendar stays on screen`,
    p.left >= ANCHOR_MARGIN && p.left + p.width <= v.vw - ANCHOR_MARGIN,
    `left=${p.left} width=${p.width} vw=${v.vw}`
  );
}

console.log("\nWidth clamps below the panel's ideal on narrow screens:");
{
  const p375 = computePlacement(rect(20, 400, 180, 52), 375, 812, 522);
  check("phone 375 clamps 522 -> 351", p375.width === 375 - ANCHOR_MARGIN * 2, `width=${p375.width}`);
  check("phone 375 drops to one month", p375.width < 521, `width=${p375.width}`);
  const p1280 = computePlacement(rect(300, 400, 200, 52), 1280, 800, 522);
  check("laptop 1280 keeps both months", p1280.width === 522, `width=${p1280.width}`);
}

console.log("\nLeft-aligns with its field when there is room:");
{
  const p = computePlacement(rect(300, 400, 180, 52), 1920, 1080, 380);
  check("aligns to trigger left edge", p.left === 300, `left=${p.left}`);
}

console.log("\nFlips above when the trigger is low in the viewport:");
{
  const low = computePlacement(rect(300, 700, 180, 52), 1280, 800, 380);
  check("flips up near the bottom", low.flipUp === true, `flipUp=${low.flipUp}`);
  check("uses bottom, not top, when flipped", low.top === null && low.bottom !== null);
  check("flipped panel has usable height", low.maxHeight >= 200, `maxHeight=${low.maxHeight}`);

  const high = computePlacement(rect(300, 300, 180, 52), 1280, 800, 380);
  check("opens downward with room below", high.flipUp === false, `flipUp=${high.flipUp}`);
  check("sits below the trigger", high.top === 300 + 52 + ANCHOR_GAP, `top=${high.top}`);

  // A trigger high on a short viewport: below is cramped but above is worse.
  const cramped = computePlacement(rect(300, 40, 180, 52), 1280, 380, 380);
  check("does not flip when above is worse", cramped.flipUp === false, `flipUp=${cramped.flipUp}`);
}

console.log("\nNever returns a negative or off-screen left:");
{
  const tiny = computePlacement(rect(-40, 400, 180, 52), 320, 600, 380);
  check("clamps a negative trigger left", tiny.left === ANCHOR_MARGIN, `left=${tiny.left}`);
  const past = computePlacement(rect(5000, 400, 180, 52), 1280, 800, 380);
  check("clamps a trigger past the right edge", past.left + past.width <= 1280 - ANCHOR_MARGIN, `left=${past.left}`);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
