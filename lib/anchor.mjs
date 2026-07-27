// Popover placement math, kept pure and framework-free so it can be tested
// without a browser (see scripts/test-anchor.mjs). The React hook in
// components/useAnchored.ts only feeds it a DOMRect and the viewport size.

export const ANCHOR_MARGIN = 12; // keep this much clear of the viewport edge
export const ANCHOR_GAP = 8; // distance between trigger and panel

/**
 * @typedef {{ left: number, top: number, bottom: number, right: number }} Rect
 * @typedef {{ left: number, width: number, top: number|null, bottom: number|null,
 *             maxHeight: number, flipUp: boolean }} Placement
 */

/**
 * Place a panel against a trigger, clamped to the viewport.
 *
 * Left-aligns with the trigger by default, then slides left only as far as
 * needed to stay on screen, so the panel still reads as belonging to its
 * field instead of jumping to a corner. Flips above the trigger only when
 * below is genuinely cramped AND above is roomier; flipping on a near-tie
 * makes the panel jitter as the page scrolls.
 *
 * @param {Rect} rect trigger bounding rect, in viewport coordinates
 * @param {number} vw viewport width
 * @param {number} vh viewport height
 * @param {number} desiredWidth width the panel would like
 * @returns {Placement}
 */
export function computePlacement(rect, vw, vh, desiredWidth) {
  const width = Math.min(desiredWidth, vw - ANCHOR_MARGIN * 2);

  let left = rect.left;
  if (left + width > vw - ANCHOR_MARGIN) left = vw - ANCHOR_MARGIN - width;
  if (left < ANCHOR_MARGIN) left = ANCHOR_MARGIN;

  const below = vh - rect.bottom - ANCHOR_GAP - ANCHOR_MARGIN;
  const above = rect.top - ANCHOR_GAP - ANCHOR_MARGIN;
  const flipUp = below < 260 && above > below;

  return {
    left,
    width,
    top: flipUp ? null : rect.bottom + ANCHOR_GAP,
    bottom: flipUp ? vh - rect.top + ANCHOR_GAP : null,
    maxHeight: Math.max(200, flipUp ? above : below),
    flipUp,
  };
}
