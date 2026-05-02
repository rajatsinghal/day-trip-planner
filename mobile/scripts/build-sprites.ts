// Build a MapLibre sprite sheet for the mobile map's pin layer.
//
// One composite per (weather code group × selected? × loading?). Each
// sprite is a colored circle with the weather emoji centered on top,
// optionally with a dark selection ring.
//
// Output: mobile/assets/sprites.png + sprites.json (1x), and
// mobile/assets/sprites@2x.png + sprites@2x.json for retina.
//
// Color palette + emoji mirror src/components/Map.tsx (LOADING_BG,
// weatherCodeToPinBg) and packages/core/src/weather.ts
// (weatherCodeToLabel) — kept in sync by hand. If those drift, the
// pins won't match the web app's color/emoji story.
//
// Run: `npm run build-sprites` from mobile/.

import { createCanvas, type CanvasRenderingContext2D } from 'canvas';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSETS_DIR = path.resolve(__dirname, '..', 'assets');

// Mirrors src/components/Map.tsx LOADING_BG.
const LOADING_BG = '#f8fafc';

// Weather "groups" — one sprite per group rather than per WMO code, since
// many codes share a color/emoji (e.g. all rain codes 61-67 → 🌧️ +
// slate-400). Group key is what the native side puts in MapPin.iconImage.
//
// emoji + color mirror packages/core/src/weather.ts weatherCodeToLabel
// and src/components/Map.tsx weatherCodeToPinBg (representative code per
// group). The sample WMO code is included so consumers can verify the
// palette without re-reading both files.
interface SpriteSpec {
  key: string;
  emoji: string;
  color: string;
  sampleCode: number;
}

const WEATHER_SPRITES: SpriteSpec[] = [
  // Code 0/1: clear / mostly sunny — yellow-300 (we pick the brighter
  // of the two; mostly-sunny code 1 is rare enough that the simpler
  // grouping is fine).
  { key: 'pin-clear', emoji: '☀️', color: '#fde047', sampleCode: 0 },
  // Code 2/3: partly cloudy / overcast — slate-100/200. Pick slate-200
  // as the representative (it covers full cloud, the more common case).
  { key: 'pin-cloudy', emoji: '☁️', color: '#e2e8f0', sampleCode: 3 },
  // Codes 61-67 / 80-82: rain / showers — slate-400.
  { key: 'pin-rain', emoji: '🌧️', color: '#94a3b8', sampleCode: 63 },
  // Codes 71-77 / 85-86: snow — sky-200.
  { key: 'pin-snow', emoji: '🌨️', color: '#bae6fd', sampleCode: 73 },
  // Codes 95+: thunderstorm — slate-600.
  { key: 'pin-thunder', emoji: '⛈️', color: '#475569', sampleCode: 95 },
  // Codes 45-48: fog — slate-200 (matches cloudy in the web app, but
  // the emoji distinguishes them).
  { key: 'pin-fog', emoji: '🌫️', color: '#e2e8f0', sampleCode: 45 },
];

// Single neutral sprite — used until weather has loaded for a destination.
const LOADING_SPRITE: SpriteSpec = {
  key: 'pin-loading',
  emoji: '·',
  color: LOADING_BG,
  sampleCode: -1,
};

// Sprite geometry (1x). 2x is double everything.
const SIZE_1X = 28;
const PADDING_1X = 1; // outer padding so border isn't cropped

function drawSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  spec: SpriteSpec,
  selected: boolean,
): void {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2 - (selected ? 2 : 1);

  // Soft shadow under the pin.
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = size * 0.07;
  ctx.shadowOffsetY = size * 0.04;

  // Background circle.
  ctx.fillStyle = spec.color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Border — heavier dark ring when selected (matches web Map.tsx).
  ctx.strokeStyle = selected ? '#0f172a' : '#cbd5e1';
  ctx.lineWidth = selected ? 2 : 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Emoji centered. font-size mirrors web (20px @ 28px pin → ~71%).
  const fontPx = Math.round(size * 0.71);
  ctx.font = `${fontPx}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText(spec.emoji, cx, cy + size * 0.04);
}

interface SheetFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  pixelRatio: number;
}

interface SheetEntry {
  spec: SpriteSpec;
  selected: boolean;
}

function buildEntries(): SheetEntry[] {
  const entries: SheetEntry[] = [];
  for (const spec of WEATHER_SPRITES) {
    entries.push({ spec, selected: false });
    entries.push({ spec, selected: true });
  }
  // Loading has no -selected variant — if a pin is selected before its
  // weather loads, we still want the loading look (the user can see the
  // pin highlights via the list/sheet).
  entries.push({ spec: LOADING_SPRITE, selected: false });
  return entries;
}

function writeSheet(scale: 1 | 2): void {
  const size = SIZE_1X * scale;
  const padding = PADDING_1X * scale;
  const cell = size + padding * 2;

  const entries = buildEntries();
  const cols = 4;
  const rows = Math.ceil(entries.length / cols);
  const w = cols * cell;
  const h = rows * cell;

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  const json: Record<string, SheetFrame> = {};
  entries.forEach((entry, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * cell + padding;
    const y = row * cell + padding;
    drawSprite(ctx, x, y, size, entry.spec, entry.selected);
    const key = entry.selected ? `${entry.spec.key}-selected` : entry.spec.key;
    json[key] = { x, y, width: size, height: size, pixelRatio: scale };
  });

  const suffix = scale === 2 ? '@2x' : '';
  fs.writeFileSync(
    path.join(ASSETS_DIR, `sprites${suffix}.png`),
    canvas.toBuffer('image/png'),
  );
  fs.writeFileSync(
    path.join(ASSETS_DIR, `sprites${suffix}.json`),
    JSON.stringify(json, null, 2) + '\n',
  );
  // eslint-disable-next-line no-console
  console.log(`wrote sprites${suffix}.png + sprites${suffix}.json (${entries.length} sprites, ${w}×${h})`);
}

function main(): void {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
  writeSheet(1);
  writeSheet(2);
}

main();
