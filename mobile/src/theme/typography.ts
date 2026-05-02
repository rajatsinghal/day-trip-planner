// FROZEN as of Phase 2.5 — modifications require a Phase 2.5 amendment.
//
// Typography presets for the DTP mobile app.
// Uses the system font stack — Bricolage Grotesque (web) does not load
// on native without bundling the font files, which is out of scope for v1.

import { TextStyle } from 'react-native';

// ── Text style presets ────────────────────────────────────────────────────

export const typography = {
  caption: {
    fontSize:   12,
    lineHeight: 16,
    fontWeight: '400',
  },
  body: {
    fontSize:   14,
    lineHeight: 20,
    fontWeight: '400',
  },
  bodyLarge: {
    fontSize:   16,
    lineHeight: 24,
    fontWeight: '400',
  },
  headline: {
    fontSize:   18,
    lineHeight: 26,
    fontWeight: '600',
  },
  title: {
    fontSize:   24,
    lineHeight: 32,
    fontWeight: '700',
  },
} as const satisfies Record<string, TextStyle>;

export type TypographyToken = keyof typeof typography;

export default typography;
