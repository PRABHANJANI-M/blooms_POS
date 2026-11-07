import { useEffect, useMemo, useState } from 'react';
import { CalendarRange, Check } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Field, TextInput } from '../../components/ui/Field';
import { Panel } from '../../components/ui/Panel';
import { DemoNotice } from '../../components/ui/DemoNotice';
import { useAppStore } from '../../store/appStore';
import { toDisplayDate, todayISO, financialYearLabel } from '../../utils/date';

/** Change the working period used by reports and day books. Alt+F2 opens this screen from anywhere. */
export function ChangePeriodPage() {
  const periodFrom = useAppStore((s) => s.periodFrom);
  const periodTo = useAppStore((s) => s.periodTo);
  const setPeriod = useAppStore((s) => s.setPeriod);
  const toast = useAppStore((s) => s.toast);
  const [from, setFrom] = useState(periodFrom);
  const [to, setTo] = useState(periodTo);

  useEffect(() => { setFrom(periodFrom); setTo(periodTo); }, [periodFrom, periodTo]);

  const error = useMemo(() => {
    if (!from || !to) return 'Enter both dates.';
    if (from > to) return 'The start date must be on or before the end date.';
    const days = (new Date(to).getTime() - new Date(from).getTime()) / 86400000;
    if (days > 366) return 'A period can be at most one year.';
    return '';
  }, [from, to]);

  const apply = () => {
    if (error) return toast({ tone: 'error', title: 'Check the dates', message: error });
    setPeriod(from, to);
    toast({ tone: 'success', title: 'Period changed', message: `${toDisplayDate(from)} to ${toDisplayDate(to)}` });
  };

  const quick = (f: string, t: string) => { setFrom(f); setTo(t); };
  const today = todayISO();
  const fyStart = `${today.slice(0, 4) === '2026' && today.slice(5, 7) < '04' ? '2025' : today.slice(0, 4)}-04-01`;

  return (
    <>
      <PageHeader title="Change Period" subtitle="Choose the period used by reports, ledgers and day books." actions={<span className="badge badge-steel">Shortcut: Alt+F2</span>} />
      <div className="space-y-4">
        <DemoNotice />
        <div className="grid gap-4 xl:grid-cols-3">
          <Panel title="Current period" icon={<CalendarRange className="h-4 w-4" />} className="xl:col-span-1">
            <p className="text-2xl font-extrabold text-navy">{toDisplayDate(periodFrom)} – {toDisplayDate(periodTo)}</p>
            <p className="mt-1 text-sm text-slate-600">Financial year {financialYearLabel(periodFrom)}</p>
          </Panel>
          <Panel title="Select period" className="xl:col-span-2" bodyClassName="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="From" htmlFor="p-from"><TextInput id="p-from" type="date" value={from} error={!!error} onChange={(e) => setFrom(e.target.value)} /></Field>
              <Field label="To" htmlFor="p-to"><TextInput id="p-to" type="date" value={to} error={!!error} onChange={(e) => setTo(e.target.value)} /></Field>
            </div>
            {error && <p className="error-text" role="alert">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => quick(periodFrom, periodTo)}>Current accounting period</Button>
              <Button size="sm" variant="outline" onClick={() => quick(fyStart, today)}>Year to date</Button>
              <Button size="sm" variant="outline" onClick={() => quick(`${today.slice(0, 8)}01`, today)}>This month</Button>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" icon={<Check className="h-4 w-4" />} onClick={apply} disabled={!!error}>Apply period</Button>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
