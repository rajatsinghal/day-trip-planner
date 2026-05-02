export interface DayOption {
  isoDate: string;
  label: string;
  sublabel: string;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Day chips rule: always Today + Tomorrow. If today is a weekday (Mon-Fri),
// also include the coming Saturday and Sunday (dedup if already covered).
export function computeDayOptions(now: Date = new Date()): DayOption[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const results: Date[] = [today, addDays(today, 1)];

  const dow = today.getDay(); // 0 = Sun, 6 = Sat
  const isWeekday = dow >= 1 && dow <= 5;
  if (isWeekday) {
    const daysUntilSat = (6 - dow + 7) % 7;
    const sat = addDays(today, daysUntilSat);
    const sun = addDays(sat, 1);
    for (const d of [sat, sun]) {
      const iso = toIsoDate(d);
      if (!results.some((r) => toIsoDate(r) === iso)) {
        results.push(d);
      }
    }
  }

  return results.map((d, idx) => {
    const iso = toIsoDate(d);
    const weekday = WEEKDAY_SHORT[d.getDay()];
    const monthDay = `${d.getMonth() + 1}/${d.getDate()}`;
    let label: string;
    if (idx === 0) label = 'Today';
    else if (idx === 1) label = 'Tomorrow';
    else label = weekday;
    return { isoDate: iso, label, sublabel: monthDay };
  });
}
