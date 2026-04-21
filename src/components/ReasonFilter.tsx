import type { ReasonsToVisit } from '../hubs';
import { REASON_META, REASON_ORDER } from '../lib/reasons_to_visit';

interface ChipsProps {
  selected: Set<ReasonsToVisit>;
  onToggle: (r: ReasonsToVisit) => void;
}

// The reasons chip buttons. Returned as a fragment so the host can place
// them inside its own flex-wrap container — this lets sibling elements
// (e.g. the count) flow alongside the chips and wrap with them.
export function ReasonChips({ selected, onToggle }: ChipsProps) {
  return (
    <>
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
              'inline-flex flex-shrink-0 items-center justify-center gap-1 rounded-full px-2 py-1 text-xs leading-tight transition-colors border md:gap-1.5 md:px-[0.7rem] md:py-1 md:text-sm ' +
              (active
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100')
            }
          >
            <span
              className="flex h-[1.25em] w-[1.25em] flex-shrink-0 items-center justify-center text-xs md:text-base"
              aria-hidden
            >
              {meta.emoji}
            </span>
            <span>{meta.label}</span>
          </button>
        );
      })}
    </>
  );
}

interface CountProps {
  totalCount: number;
  matchCount: number;
  hasSelection: boolean;
  onClear: () => void;
}

export function ReasonCount({ totalCount, matchCount, hasSelection, onClear }: CountProps) {
  return (
    <div className="flex flex-shrink-0 items-center gap-2 text-xs text-slate-500">
      <span className="tabular-nums">
        {hasSelection
          ? `${matchCount} of ${totalCount} results`
          : `All ${totalCount} results`}
      </span>
      {hasSelection && (
        <button
          onClick={onClear}
          className="text-slate-600 underline hover:text-slate-900"
        >
          clear
        </button>
      )}
    </div>
  );
}
