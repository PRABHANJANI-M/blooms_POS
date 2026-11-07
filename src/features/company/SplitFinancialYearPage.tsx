import { useMemo, useState } from 'react';
import { ShieldCheck, Eye, Scissors } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Field, SelectInput, TextInput } from '../../components/ui/Field';
import { Panel } from '../../components/ui/Panel';
import { DemoNotice } from '../../components/ui/DemoNotice';
import { useAppStore } from '../../store/appStore';
import { toDisplayDate } from '../../utils/date';
import { Modal } from '../../components/ui/Modal';

/**
 * Split financial year: preview first, then a typed confirmation.
 * In demo mode the preview is calculated from sample counts and no record is changed.
 */
export function SplitFinancialYearPage() {
  const toast = useAppStore((s) => s.toast);
  const [fromFy, setFromFy] = useState('2026-27');
  const [splitDate, setSplitDate] = useState('2026-09-30');
  const [protect, setProtect] = useState(true);
  const [previewed, setPreviewed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState('');

  const error = useMemo(() => {
    if (!splitDate) return 'Choose the split date.';
    if (splitDate < '2026-04-02' || splitDate >= '2027-03-31') return 'The split date must fall inside the selected financial year.';
    return '';
  }, [splitDate]);

  const preview = useMemo(() => ({
    before: { vouchers: 186, from: '01-04-2026', to: toDisplayDate(splitDate) },
    after: { vouchers: 28, from: toDisplayDate(splitDate), to: '31-03-2027' },
    openingCarried: 'Closing balances of each ledger move to the opening balances of the next year.',
  }), [splitDate]);

  const confirm = () => {
    setConfirmOpen(false);
    setTyped('');
    toast({ tone: 'info', title: 'Split previewed only (demo)', message: 'No records were changed. A connected backend is needed to perform a split.' });
  };

  return (
    <>
      <PageHeader title="Split Financial Year" subtitle="Divide one financial year at a date. Always preview and back up first." />
      <div className="space-y-4">
        <DemoNotice>The preview uses sample numbers. Splitting is not performed in this frontend.</DemoNotice>
        <div className="grid gap-4 xl:grid-cols-3">
          <Panel title="1. Choose" bodyClassName="space-y-3" className="xl:col-span-1">
            <Field label="Financial year to split">
              <SelectInput value={fromFy} onChange={(e) => { setFromFy(e.target.value); setPreviewed(false); }}>
                <option value="2025-26">2025-26</option><option value="2026-27">2026-27</option>
              </SelectInput>
            </Field>
            <Field label="Split from date" error={error || undefined} htmlFor="split-date">
              <TextInput id="split-date" type="date" value={splitDate} onChange={(e) => { setSplitDate(e.target.value); setPreviewed(false); }} />
            </Field>
            <label className="flex items-start gap-2 text-sm text-navy">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-fiery" checked={protect} onChange={(e) => setProtect(e.target.checked)} />
              <span><b>Protect accounting records</b><br /><span className="text-slate-600">Lock vouchers before the split date so they cannot be edited.</span></span>
            </label>
            <Button variant="navy" icon={<Eye className="h-4 w-4" />} onClick={() => setPreviewed(true)} disabled={!!error}>Preview operation</Button>
          </Panel>

          <Panel title="2. Preview" icon={<ShieldCheck className="h-4 w-4" />} className="xl:col-span-2" bodyClassName="space-y-4">
            {!previewed ? <p className="text-sm text-slate-600">Press Preview operation to see what will change. Nothing is changed by previewing.</p> : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-navy p-4 text-white"><p className="text-xs uppercase opacity-70">Period A (closes)</p><p className="font-bold">{toDisplayDate('2026-04-01')} – {preview.before.to}</p><p className="text-sm opacity-80">{preview.before.vouchers} vouchers</p></div>
                  <div className="rounded-lg bg-steel p-4 text-white"><p className="text-xs uppercase opacity-80">Period B (new year)</p><p className="font-bold">{preview.after.from} – 31-03-2027</p><p className="text-sm opacity-90">{preview.after.vouchers} vouchers</p></div>
                </div>
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                  <li>{preview.openingCarried}</li>
                  <li>{protect ? 'Vouchers before the split date will be locked (protected).' : 'Vouchers stay editable; this is not recommended.'}</li>
                  <li>A backup is taken before the split and kept in Backup / Restore.</li>
                </ul>
                <Button variant="danger" icon={<Scissors className="h-4 w-4" />} onClick={() => setConfirmOpen(true)}>Split {fromFy}</Button>
              </>
            )}
          </Panel>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setTyped(''); }}
        title="Confirm financial year split"
        width="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setConfirmOpen(false); setTyped(''); }}>Cancel</Button>
            <Button variant="danger" disabled={typed !== 'SPLIT'} onClick={confirm}>Split now</Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-slate-700">
          <p>Splitting a financial year changes accounting periods in a real system and cannot be undone from this screen. Type <b>SPLIT</b> to confirm.</p>
          <TextInput value={typed} onChange={(e) => setTyped(e.target.value.toUpperCase())} placeholder="Type SPLIT" aria-label="Type SPLIT to confirm" />
        </div>
      </Modal>
    </>
  );
}
