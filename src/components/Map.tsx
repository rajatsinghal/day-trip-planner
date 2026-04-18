import { useEffect, useRef } from 'react';
import maplibregl, { Map as MLMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { EnrichedDestination } from '../App';
import { weatherCodeToLabel } from '../lib/weather';

interface Props {
  rows: EnrichedDestination[];
  center: { name: string; lat: number; lon: number };
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
}

// OpenFreeMap vector tiles — truly free, no API key.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

const LOADING_BG = '#f8fafc'; // slate-50, for pins we don't have weather for yet

// Background color per WMO code — a sky gradient from sunny yellow through
// cloudy gray to rainy slate to thunder. Matches how people naturally
// associate sky/weather with color.
function weatherCodeToPinBg(code: number): string {
  if (code === 0) return '#fde047'; // yellow-300, bright sun
  if (code === 1) return '#fef08a'; // yellow-200, mostly sunny
  if (code === 2) return '#f1f5f9'; // slate-100, partly cloudy (warm-neutral)
  if (code === 3) return '#e2e8f0'; // slate-200, cloudy
  if (code >= 45 && code <= 48) return '#e2e8f0'; // fog — similar to cloudy
  if (code >= 51 && code <= 57) return '#cbd5e1'; // slate-300, drizzle
  if (code >= 71 && code <= 77) return '#bae6fd'; // sky-200, snow
  if (code >= 85 && code <= 86) return '#bae6fd'; // snow showers
  if (code >= 95) return '#475569'; // slate-600, thunderstorm
  if (code >= 61 && code <= 67) return '#94a3b8'; // slate-400, rain
  if (code >= 80 && code <= 82) return '#94a3b8'; // showers
  return '#f8fafc'; // unknown — neutral
}

// Outer wrapper is positioned by MapLibre (don't touch its transform).
// All styling / scaling happens on the inner element. Pin color tracks the
// weather (sunny → cloudy → rain → thunder); the emoji inside still says
// exactly what's going on.
function makePinEl(emoji: string, bg: string, selected: boolean): HTMLDivElement {
  const wrapper = document.createElement('div');

  const inner = document.createElement('div');
  inner.className = 'dtp-pin';
  inner.style.width = '28px';
  inner.style.height = '28px';
  inner.style.borderRadius = '50%';
  inner.style.background = bg;
  inner.style.border = selected ? '2px solid #0f172a' : '1px solid #cbd5e1';
  inner.style.boxShadow = '0 1px 3px rgba(0,0,0,0.25)';
  inner.style.display = 'flex';
  inner.style.alignItems = 'center';
  inner.style.justifyContent = 'center';
  inner.style.fontSize = '20px';
  inner.style.lineHeight = '1';
  inner.style.cursor = 'pointer';
  inner.style.transition = 'transform 150ms';
  inner.textContent = emoji;
  if (selected) inner.style.transform = 'scale(1.2)';

  wrapper.appendChild(inner);
  return wrapper;
}

function updatePinEl(wrapper: HTMLElement, emoji: string, bg: string, selected: boolean) {
  const inner = wrapper.firstElementChild as HTMLElement | null;
  if (!inner) return;
  inner.style.background = bg;
  inner.style.border = selected ? '2px solid #0f172a' : '1px solid #cbd5e1';
  inner.style.transform = selected ? 'scale(1.2)' : 'scale(1)';
  if (inner.textContent !== emoji) inner.textContent = emoji;
}

function makeOriginEl(name: string): HTMLDivElement {
  const wrapper = document.createElement('div');
  const inner = document.createElement('div');
  inner.style.width = '26px';
  inner.style.height = '26px';
  inner.style.display = 'flex';
  inner.style.alignItems = 'center';
  inner.style.justifyContent = 'center';
  inner.style.fontSize = '22px';
  inner.textContent = '🏠';
  inner.title = name;
  wrapper.appendChild(inner);
  return wrapper;
}

export function MapView({ rows, center, selectedId, hoveredId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());

  // Initial mount only — captures the center at mount time. When the area
  // picker (item #4) lets users switch hubs, the map will need a separate
  // effect to fly to the new center; the home marker will also need to be
  // remade. For now (single hub) this is the right shape.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [center.lon, center.lat],
      zoom: 7.2,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    new maplibregl.Marker({ element: makeOriginEl(center.name) })
      .setLngLat([center.lon, center.lat])
      .addTo(map);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const [id, marker] of markersRef.current.entries()) {
      if (!rows.some((r) => r.id === id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    for (const row of rows) {
      const emoji = row.weather ? weatherCodeToLabel(row.weather.weatherCode).emoji : '·';
      const bg = row.weather ? weatherCodeToPinBg(row.weather.weatherCode) : LOADING_BG;
      const isSelected = row.id === selectedId || row.id === hoveredId;
      const existing = markersRef.current.get(row.id);
      if (existing) {
        updatePinEl(existing.getElement(), emoji, bg, isSelected);
      } else {
        const el = makePinEl(emoji, bg, isSelected);
        el.addEventListener('click', () => onSelect(row.id));
        const m = new maplibregl.Marker({ element: el })
          .setLngLat([row.lon, row.lat])
          .addTo(map);
        markersRef.current.set(row.id, m);
      }
    }
  }, [rows, selectedId, hoveredId, onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const row = rows.find((r) => r.id === selectedId);
    if (!row) return;
    map.flyTo({ center: [row.lon, row.lat], zoom: Math.max(map.getZoom(), 8), duration: 700 });
  }, [selectedId, rows]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
