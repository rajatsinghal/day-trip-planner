import type { DayOption } from '../lib/days';

interface Props {
  options: DayOption[];
  selected: string;
  onSelect: (iso: string) => void;
}

export function DayChips({ options, selected, onSelect }: Props) {
  return (
    <div className="flex gap-1.5 overflow-x-auto">
      {options.map((opt) => {
        const isActive = opt.isoDate === selected;
        return (
          <button
            key={opt.isoDate}
            onClick={() => onSelect(opt.isoDate)}
            className={
              'flex flex-col items-center rounded-lg px-3 py-1.5 text-sm transition-colors ' +
              (isActive
                ? 'bg-slate-900 text-white shadow'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200')
            }
          >
            <span className="font-semibold leading-tight">{opt.label}</span>
            <span className="text-[11px] opacity-70 leading-tight">{opt.sublabel}</span>
          </button>
        );
      })}
    </div>
  );
}
