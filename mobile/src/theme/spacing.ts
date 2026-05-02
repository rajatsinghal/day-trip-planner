// FROZEN as of Phase 2.5 — modifications require a Phase 2.5 amendment.
//
// Spacing and border-radius tokens for the DTP mobile app.
// Based on a 4px base grid — all values are multiples of 4.

// ── Spacing ───────────────────────────────────────────────────────────────

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  '2xl': 32,
  '3xl': 48,
} as const;

export type SpacingToken = keyof typeof spacing;

// ── Border radius ─────────────────────────────────────────────────────────

export const borderRadius = {
  sm:   4,
  md:   8,
  lg:   12,
  full: 9999,
} as const;

export type BorderRadiusToken = keyof typeof borderRadius;

export default spacing;
