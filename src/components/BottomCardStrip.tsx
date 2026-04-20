import { useEffect, useRef } from 'react';
import type { EnrichedDestination } from '../App';
import { formatDriveTime } from '../lib/geo';
import { REASON_META } from '../lib/reasons_to_visit';
import { formatTemp, formatWind, type TempUnit } from '../lib/units';
import { weatherCodeToLabel } from '../lib/weather';

interface Props {
  rows: EnrichedDestination[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  tempUnit: TempUnit;
}

const SCROLL_SETTLE_MS = 150;

// Mobile-only horizontal carousel of destination cards, anchored to the bottom
// of the map. Pattern: Google/Apple Maps "swipe through pins" UX.
//   - Tap a pin → strip scrolls to that destination's card.
//   - Swipe to a card → that destination is selected (map flies to its pin).
// The strip is the mobile substitute for the desktop side list — same data,
// same selection state, just a horizontal lens instead of a vertical one.
export function BottomCardStrip({ rows, selectedId, onSelect, tempUnit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // The id we most recently scrolled to programmatically. Used to suppress the
  // scroll-settled listener from firing onSelect on the same card we just
  // scrolled to (which would be a no-op but is also a wasted React update).
  const lastScrolledId = useRef<string | null>(null);

  // External selection (pin tap, list filter change) → scroll strip to card.
  useEffect(() => {
    if (!selectedId) return;
    const container = containerRef.current;
    if (!container) return;
    const card = container.querySelector<HTMLElement>(`[data-card-id="${selectedId}"]`);
    if (!card) return;
    lastScrolledId.current = selectedId;
    card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedId]);

  // Swipe → select. Listen for scroll, debounce until the strip has been still
  // for SCROLL_SETTLE_MS, then pick whichever card is closest to the strip's
  // horizontal center and select it. Avoids the IntersectionObserver pitfall
  // where mid-scroll cards briefly appear "most visible" and get selected by
  // accident — which previously caused pin taps to bounce back to the prior
  // selection because the inbound card hadn't centered yet.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let timer: number | null = null;

    const handleScrollSettle = () => {
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;
      let closestId: string | null = null;
      let closestDistance = Infinity;
      container.querySelectorAll<HTMLElement>('[data-card-id]').forEach((card) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const distance = Math.abs(cardCenter - containerCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestId = card.dataset.cardId ?? null;
        }
      });
      if (!closestId) return;
      if (closestId === selectedId) return;
      if (closestId === lastScrolledId.current) return;
      onSelect(closestId);
    };

    const onScroll = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(handleScrollSettle, SCROLL_SETTLE_MS);
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      if (timer) window.clearTimeout(timer);
    };
  }, [selectedId, onSelect]);

  if (rows.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="pointer-events-auto flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth px-3 pb-3"
    >
        {rows.map((row) => {
          const wx = row.weather;
          const label = wx ? weatherCodeToLabel(wx.weatherCode) : null;
          const isSelected = row.id === selectedId;
          return (
            <div
              key={row.id}
              data-card-id={row.id}
              onClick={() => onSelect(row.id)}
              className={
                'flex w-[260px] flex-shrink-0 snap-center cursor-pointer gap-2.5 rounded-lg border bg-white p-3 shadow-md transition-shadow ' +
                (isSelected ? 'border-slate-900' : 'border-slate-200')
              }
            >
              {/* Big leading weather emoji — the at-a-glance signal. Users
                  decide for themselves what's "good" weather (sun for some,
                  snow for others), so the raw icon beats a 3-color band. */}
              <span
                className="flex-shrink-0 self-start text-3xl leading-none"
                aria-hidden
              >
                {label ? label.emoji : '·'}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="truncate font-semibold text-slate-900">{row.name}</h3>
                  <span className="flex-shrink-0 text-xs text-slate-500">
                    {formatDriveTime(row.driveMinutes)}
                  </span>
                </div>
                {wx && label ? (
                  <div className="text-xs text-slate-600">
                    {formatTemp(wx.tMaxC, tempUnit)}/{formatTemp(wx.tMinC, tempUnit)} · Rain {wx.precipProb}% · Wind {formatWind(wx.windMaxKmh, tempUnit)}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">No forecast</div>
                )}
                {row.reasons_to_visit.length > 0 && (
                  <div className="flex items-center gap-1.5 text-base" aria-hidden>
                    {row.reasons_to_visit.slice(0, 5).map((r) => (
                      <span key={r} title={REASON_META[r].label}>
                        {REASON_META[r].emoji}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}
