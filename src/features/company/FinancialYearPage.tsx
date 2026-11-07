import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Field, TextInput } from '../../components/ui/Field';
import { Panel } from '../../components/ui/Panel';
import { DemoNotice } from '../../components/ui/DemoNotice';
import { useDemoStore } from '../../store/demoStore';
import { useAppStore } from '../../store/appStore';
import { financialYearLabel, toDisplayDate } from '../../utils/date';

const monthsBetween = (a: string, b: string) => {
  const d1 = new Date(a); const d2 = new Date(b);
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
};

/** Financial year start and end. Must be 6 to 18 months, and the end must come after the start. */
export function FinancialYearPage() {
  const companyId = useAppStore((s) => s.companyId);
  const company = useDemoStore((s) => s.companies.find((c) => c.id === companyId));
  const saveCompany = useDemoStore((s) => s.saveCompany);
  const setPeriod = useAppStore((s) => s.setPeriod);
  const toast = useAppStore((s) => s.toast);
  const [start, setStart] = useState(company?.fyStart ?? '2026-04-01');
  const [end, setEnd] = useState(company?.fyEnd ?? '2027-03-31');

  const error = useMemo(() => {
    if (!start || !end) return 'Enter both dates.';
    if (end <= start) return 'The end date must be after the start date.';
    const m = monthsBetween(start, end);
    if (m < 6 || m > 18) return 'A financial year must be between 6 and 18 months.';
    return '';
  }, [start, end]);

  const save = () => {
    if (error || !company) return toast({ tone: 'error', title: 'Check the dates', message: error });
    saveCompany({ ...company, fyStart: start, fyEnd: end });
    setPeriod(start, end);
    toast({ tone: 'success', title: 'Financial year saved (demo)', message: `${toDisplayDate(start)} – ${toDisplayDate(end)}` });
  };

  return (
    <>
      <PageHeader title="Financial Year Dates" subtitle="Set the start and end of the financial year for this company." />
      <div className="space-y-4">
        <DemoNotice />
        <div className="grid gap-4 xl:grid-cols-3">
          <Panel title="Active financial year" className="xl:col-span-1">
            <p className="text-3xl font-extrabold text-navy">{financialYearLabel(start)}</p>
            <p className="mt-1 text-sm text-slate-600">{toDisplayDate(start)} – {toDisplayDate(end)}</p>
          </Panel>
          <Panel title="Edit dates" className="xl:col-span-2" bodyClassName="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Start date" error={error && end > start ? error : undefined} htmlFor="fy-start"><TextInput id="fy-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
              <Field label="End date" error={error && end <= start ? error : undefined} htmlFor="fy-end"><TextInput id="fy-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
            </div>
            {error && end > start && <p className="error-text" role="alert">{error}</p>}
            <Button variant="primary" icon={<Save className="h-4 w-4" />} onClick={save} disabled={!!error}>Save financial year</Button>
          </Panel>
        </div>
      </div>
    </>
  );
}
