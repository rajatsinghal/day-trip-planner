import type { ReasonsToVisit } from '../hubs';
import { REASON_META, REASON_ORDER } from '../lib/reasons_to_visit';

interface Props {
  selected: Set<ReasonsToVisit>;
  onToggle: (r: ReasonsToVisit) => void;
  onClear: () => void;
  totalCount: number;
  matchCount: number;
}

// Chip row under the header. If nothing is selected, every destination shows.
// Clicking a chip toggles it; a destination is visible if it has any of the
// currently-selected reasons_to_visit.
export function ReasonFilter({ selected, onToggle, onClear, totalCount, matchCount }: Props) {
  const any = selected.size > 0;
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2">
      {REASON_ORDER.map((r) => {
        const meta = REASON_META[r];
        const active = selected.has(r);
        return (
          <button
            key={r}
            onClick={() => onToggle(r)}
            title={meta.label}
            aria-pressed={active}
            className={
              'flex-shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors border ' +
              (active
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100')
            }
          >
            <span className="text-sm leading-none" aria-hidden>
              {meta.emoji}
            </span>
            <span className="hidden sm:inline">{meta.label}</span>
          </button>
        );
      })}
      <div className="ml-auto flex items-center gap-2 pl-2 text-xs text-slate-500 flex-shrink-0">
        <span className="tabular-nums">
          {any ? `${matchCount} of ${totalCount}` : `All ${totalCount}`}
        </span>
        {any && (
          <button
            onClick={onClear}
            className="text-slate-600 underline hover:text-slate-900"
          >
            clear
          </button>
        )}
      </div>
    </div>
  );
}
