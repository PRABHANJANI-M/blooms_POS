import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TextInput, SelectInput, Field } from '../ui/Field';
import { addDays, todayISO } from '../../utils/date';
import { useAppStore } from '../../store/appStore';

export type RangeOption = 'today' | 'yesterday' | 'week' | 'month' | 'fy' | 'custom';

/** From / To date filter with day-stepper arrows and quick ranges (mirrors the Display screens in the reference video). */
export function DateRange({ from, to, onChange, showQuick = true }: {
  from: string; to: string; onChange: (from: string, to: string, option: RangeOption) => void; showQuick?: boolean;
}) {
  const fyFrom = useAppStore((s) => s.periodFrom);
  const fyTo = useAppStore((s) => s.periodTo);

  const quick = (opt: RangeOption) => {
    const t = todayISO();
    if (opt === 'today') return onChange(t, t, opt);
    if (opt === 'yesterday') return onChange(addDays(t, -1), addDays(t, -1), opt);
    if (opt === 'week') return onChange(addDays(t, -6), t, opt);
    if (opt === 'month') return onChange(`${t.slice(0, 8)}01`, t, opt);
    if (opt === 'fy') return onChange(fyFrom, fyTo, opt);
  };

  const step = (days: number) => onChange(addDays(from, days), addDays(to, days), 'custom');

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Field label="From" className="w-40">
        <TextInput type="date" value={from} compact onChange={(e) => onChange(e.target.value, to, 'custom')} />
      </Field>
      <Field label="To" className="w-40">
        <TextInput type="date" value={to} compact onChange={(e) => onChange(from, e.target.value, 'custom')} />
      </Field>
      <div className="flex items-center gap-1 pb-0.5">
        <button type="button" className="btn btn-outline btn-sm btn-icon" onClick={() => step(-1)} aria-label="Previous day"><ChevronLeft className="h-4 w-4" /></button>
        <button type="button" className="btn btn-outline btn-sm btn-icon" onClick={() => step(1)} aria-label="Next day"><ChevronRight className="h-4 w-4" /></button>
      </div>
      {showQuick && (
        <Field label="Quick" className="w-44">
          <SelectInput compact defaultValue="" onChange={(e) => e.target.value && quick(e.target.value as RangeOption)}>
            <option value="">Quick…</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">Last 7 days</option>
            <option value="month">This month</option>
            <option value="fy">Accounting period</option>
          </SelectInput>
        </Field>
      )}
    </div>
  );
}
