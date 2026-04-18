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

// OpenFreeMap vector tiles — truly free, no API key.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

// Outer wrapper is positioned by MapLibre (don't touch its transform).
// All styling / scaling happens on the inner element. Pins are plain white
// disks with the weather emoji doing the work of signaling quality.
function makePinEl(emoji: string, selected: boolean): HTMLDivElement {
  const wrapper = document.createElement('div');

  const inner = document.createElement('div');
  inner.className = 'dtp-pin';
  inner.style.width = '28px';
  inner.style.height = '28px';
  inner.style.borderRadius = '50%';
  inner.style.background = 'white';
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

function updatePinEl(wrapper: HTMLElement, emoji: string, selected: boolean) {
  const inner = wrapper.firstElementChild as HTMLElement | null;
  if (!inner) return;
  inner.style.border = selected ? '2px solid #0f172a' : '1px solid #cbd5e1';
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
      const emoji = row.weather ? weatherCodeToLabel(row.weather.weatherCode).emoji : '·';
      const isSelected = row.id === selectedId || row.id === hoveredId;
      const existing = markersRef.current.get(row.id);
      if (existing) {
        updatePinEl(existing.getElement(), emoji, isSelected);
      } else {
        const el = makePinEl(emoji, isSelected);
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
