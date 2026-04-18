import { useEffect, useRef } from 'react';
import maplibregl, { Map as MLMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { EnrichedDestination } from '../App';
import { ORIGIN } from '../data/destinations';
import { weatherCodeToLabel } from '../lib/weather';

interface Props {
  rows: EnrichedDestination[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
}

const BAND_HEX: Record<'great' | 'ok' | 'poor', string> = {
  great: '#10b981',
  ok: '#0ea5e9',
  poor: '#94a3b8',
};

// OpenFreeMap vector tiles — truly free, no API key.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

// Outer wrapper is positioned by MapLibre (don't touch its transform).
// All styling / scaling happens on the inner element.
function makePinEl(color: string, emoji: string, selected: boolean): HTMLDivElement {
  const wrapper = document.createElement('div');

  const inner = document.createElement('div');
  inner.className = 'dtp-pin';
  inner.style.width = '28px';
  inner.style.height = '28px';
  inner.style.borderRadius = '50%';
  inner.style.background = color;
  inner.style.border = selected ? '3px solid #0f172a' : '2px solid white';
  inner.style.boxShadow = '0 1px 4px rgba(0,0,0,0.35)';
  inner.style.display = 'flex';
  inner.style.alignItems = 'center';
  inner.style.justifyContent = 'center';
  inner.style.fontSize = '15px';
  inner.style.lineHeight = '1';
  inner.style.cursor = 'pointer';
  inner.style.transition = 'transform 150ms';
  inner.textContent = emoji;
  if (selected) inner.style.transform = 'scale(1.2)';

  wrapper.appendChild(inner);
  return wrapper;
}

function updatePinEl(wrapper: HTMLElement, color: string, emoji: string, selected: boolean) {
  const inner = wrapper.firstElementChild as HTMLElement | null;
  if (!inner) return;
  inner.style.background = color;
  inner.style.border = selected ? '3px solid #0f172a' : '2px solid white';
  inner.style.transform = selected ? 'scale(1.2)' : 'scale(1)';
  if (inner.textContent !== emoji) inner.textContent = emoji;
}

function makeOriginEl(): HTMLDivElement {
  const wrapper = document.createElement('div');
  const inner = document.createElement('div');
  inner.style.width = '26px';
  inner.style.height = '26px';
  inner.style.display = 'flex';
  inner.style.alignItems = 'center';
  inner.style.justifyContent = 'center';
  inner.style.fontSize = '22px';
  inner.textContent = '🏠';
  inner.title = ORIGIN.name;
  wrapper.appendChild(inner);
  return wrapper;
}

export function MapView({ rows, selectedId, hoveredId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [ORIGIN.lon, ORIGIN.lat],
      zoom: 7.2,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    new maplibregl.Marker({ element: makeOriginEl() })
      .setLngLat([ORIGIN.lon, ORIGIN.lat])
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
      const color = BAND_HEX[row.band ?? 'poor'];
      const emoji = row.weather ? weatherCodeToLabel(row.weather.weatherCode).emoji : '·';
      const isSelected = row.id === selectedId || row.id === hoveredId;
      const existing = markersRef.current.get(row.id);
      if (existing) {
        updatePinEl(existing.getElement(), color, emoji, isSelected);
      } else {
        const el = makePinEl(color, emoji, isSelected);
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
