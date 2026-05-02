// FROZEN as of Phase 2.5 — modifications require a Phase 2.5 amendment.
//
// Color tokens for the DTP mobile app.
// Extracted from tailwind.config.js (Tailwind defaults used by web components)
// and src/components/Map.tsx (weather pin colors).

// ── Core palette (Tailwind default shades used in web components) ──────────

export const colors = {
  // slate — primary UI neutrals (sidebar, cards, text)
  slate50:  '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate300: '#cbd5e1',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1e293b',
  slate900: '#0f172a',

  // sky — accent, weather-related highlights
  sky100:   '#e0f2fe',
  sky200:   '#bae6fd',
  sky300:   '#7dd3fc',
  sky400:   '#38bdf8',
  sky500:   '#0ea5e9',
  sky600:   '#0284c7',

  // yellow — sunny weather pins, warm accents
  yellow200: '#fef08a',
  yellow300: '#fde047',
  yellow400: '#facc15',

  // zinc/neutral — subtle backgrounds
  zinc50:  '#fafafa',
  zinc100: '#f4f4f5',
  zinc200: '#e4e4e7',

  // neutrals
  white:   '#ffffff',
  black:   '#000000',

  // scrim / backdrop
  scrim:   'rgba(15, 23, 42, 0.4)',   // slate-900 at 40% — sheet backdrops
  scrimLight: 'rgba(15, 23, 42, 0.2)', // lighter overlay
} as const;

export type ColorToken = keyof typeof colors;

// ── Weather pin background colors ─────────────────────────────────────────
// Mirrored exactly from src/components/Map.tsx weatherCodeToPinBg()
// and the LOADING_BG constant. Key is either 'loading' or a WMO code string.

export const weatherColors = {
  loading:       '#f8fafc', // slate-50 — pins with no weather data yet
  clear:         '#fde047', // yellow-300 — WMO code 0, bright sun
  mostlySunny:   '#fef08a', // yellow-200 — WMO code 1
  partlyCloudy:  '#f1f5f9', // slate-100 — WMO code 2
  cloudy:        '#e2e8f0', // slate-200 — WMO code 3
  fog:           '#e2e8f0', // slate-200 — WMO codes 45–48
  drizzle:       '#cbd5e1', // slate-300 — WMO codes 51–57
  snow:          '#bae6fd', // sky-200   — WMO codes 71–77, 85–86
  thunderstorm:  '#475569', // slate-600 — WMO codes ≥95
  rain:          '#94a3b8', // slate-400 — WMO codes 61–67
  showers:       '#94a3b8', // slate-400 — WMO codes 80–82
  unknown:       '#f8fafc', // slate-50  — fallback
} as const;

export type WeatherColorToken = keyof typeof weatherColors;

/** Returns the pin background hex for a WMO weather code. */
export function weatherCodeToPinColor(code: number): string {
  if (code === 0) return weatherColors.clear;
  if (code === 1) return weatherColors.mostlySunny;
  if (code === 2) return weatherColors.partlyCloudy;
  if (code === 3) return weatherColors.cloudy;
  if (code >= 45 && code <= 48) return weatherColors.fog;
  if (code >= 51 && code <= 57) return weatherColors.drizzle;
  if (code >= 71 && code <= 77) return weatherColors.snow;
  if (code >= 85 && code <= 86) return weatherColors.snow;
  if (code >= 95) return weatherColors.thunderstorm;
  if (code >= 61 && code <= 67) return weatherColors.rain;
  if (code >= 80 && code <= 82) return weatherColors.showers;
  return weatherColors.unknown;
}

// ── Dark-mode variant ──────────────────────────────────────────────────────
// Same tokens for now — dark-mode palette expansion is a future amendment.
// Components should reference darkColors at call sites so swapping is trivial.

export const darkColors: typeof colors = {
  ...colors,
  // Override surface colors for dark mode (placeholder — same as light for v1)
};

export default colors;
