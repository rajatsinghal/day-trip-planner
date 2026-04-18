import { useEffect, useRef } from 'react';
import maplibregl, { Map as MLMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { EnrichedDestination } from '../App';
import { ORIGIN } from '../data/destinations';

interface Props {
  rows: EnrichedDestination[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
}

const BAND_HEX: Record<'great' | 'ok' | 'poor', string> = {
  great: '#10b981',
  ok: '#f59e0b',
  poor: '#94a3b8',
};

// OpenFreeMap vector tiles — truly free, no API key.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

function makePinEl(color: string, selected: boolean): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'dtp-pin';
  el.style.width = '18px';
  el.style.height = '18px';
  el.style.borderRadius = '50%';
  el.style.background = color;
  el.style.border = selected ? '3px solid #0f172a' : '2px solid white';
  el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.35)';
  el.style.cursor = 'pointer';
  el.style.transition = 'transform 150ms';
  if (selected) el.style.transform = 'scale(1.25)';
  return el;
}

function makeOriginEl(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.width = '24px';
  el.style.height = '24px';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.fontSize = '20px';
  el.textContent = '🏠';
  el.title = ORIGIN.name;
  return el;
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
      const isSelected = row.id === selectedId || row.id === hoveredId;
      const existing = markersRef.current.get(row.id);
      if (existing) {
        existing.getElement().style.background = color;
        existing.getElement().style.border = isSelected ? '3px solid #0f172a' : '2px solid white';
        existing.getElement().style.transform = isSelected ? 'scale(1.25)' : 'scale(1)';
      } else {
        const el = makePinEl(color, isSelected);
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
