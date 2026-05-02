// Build mobile/assets/map.html by inlining MapLibre GL JS + CSS into
// mobile/assets/map.template.html.
//
// The result is a single self-contained file the WebView can load via
// `source={{ html: <inlined>, baseUrl: 'https://localhost' }}` — no
// network round-trip for the map library itself.
//
// Run: `npm run build-map-html` from mobile/.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.resolve(ROOT, 'assets');

const require = createRequire(pathToFileURL(__filename));

function resolveMaplibreFile(rel: string): string {
  // Resolve via require — works whether maplibre-gl is hoisted to the
  // workspace root or installed in mobile/node_modules.
  const pkg = require.resolve('maplibre-gl/package.json');
  return path.join(path.dirname(pkg), rel);
}

function main(): void {
  const templatePath = path.join(ASSETS, 'map.template.html');
  const outPath = path.join(ASSETS, 'map.html');

  const template = fs.readFileSync(templatePath, 'utf8');
  const mlJs = fs.readFileSync(resolveMaplibreFile('dist/maplibre-gl.js'), 'utf8');
  const mlCss = fs.readFileSync(resolveMaplibreFile('dist/maplibre-gl.css'), 'utf8');

  // Replace placeholders. Use unique sentinel strings so the template
  // is unambiguous even if MapLibre's code happens to contain a
  // Mustache-style sequence.
  let out = template;
  out = out.replace('/*__MAPLIBRE_CSS__*/', () => mlCss);
  out = out.replace('/*__MAPLIBRE_JS__*/', () => mlJs);

  fs.writeFileSync(outPath, out);
  // eslint-disable-next-line no-console
  console.log(`wrote ${path.relative(ROOT, outPath)} (${out.length} bytes)`);
}

main();
