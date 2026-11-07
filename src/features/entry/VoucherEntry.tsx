import { useMemo, useState } from 'react';
import { Plus, Save, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Field, SelectInput, TextInput } from '../../components/ui/Field';
import { Panel } from '../../components/ui/Panel';
import { DemoNotice } from '../../components/ui/DemoNotice';
import { useAppStore } from '../../store/appStore';
import { useDemoStore, NO_RECORDS } from '../../store/demoStore';
import { formatINR, formatMoneyPlain, parseNum, round2 } from '../../utils/money';
import { todayISO } from '../../utils/date';
import { cn } from '../../utils/cn';

interface Entry { id: number; account: string; dr: number; cr: number }
const voucherTypes = ['Receipt', 'Payment', 'Contra', 'Journal'] as const;

/** Double-entry voucher: debits must equal credits before it can be saved. */
export function VoucherEntry() {
  const toast = useAppStore((s) => s.toast);
  const addVoucher = useDemoStore((s) => s.addVoucher);
  const ledgers = useDemoStore((s) => s.masters.ledgers ?? NO_RECORDS);
  const [type, setType] = useState<(typeof voucherTypes)[number]>('Receipt');
  const [no, setNo] = useState(102);
  const [date, setDate] = useState(todayISO());
  const [narration, setNarration] = useState('');
  const [entries, setEntries] = useState<Entry[]>([{ id: 1, account: '', dr: 0, cr: 0 }, { id: 2, account: '', dr: 0, cr: 0 }]);

  const dr = useMemo(() => round2(entries.reduce((a, e) => a + e.dr, 0)), [entries]);
  const cr = useMemo(() => round2(entries.reduce((a, e) => a + e.cr, 0)), [entries]);
  const diff = round2(dr - cr);
  const balanced = dr > 0 && diff === 0;

  const update = (id: number, patch: Partial<Entry>) => setEntries((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const save = () => {
    const used = entries.filter((e) => e.account && (e.dr || e.cr));
    if (used.length < 2) return toast({ tone: 'error', title: 'Add at least two accounts', message: 'A voucher needs a debit and a credit side.' });
    if (!balanced) return toast({ tone: 'error', title: 'Debit and credit do not match', message: `Difference ${formatINR(Math.abs(diff))}.` });
    addVoucher('voucher', { id: `vc-${Date.now()}`, no: `${type.slice(0, 4).toUpperCase()}-${no}`, date, party: used[0].account, amount: dr, status: type });
    toast({ tone: 'success', title: `${type} ${no} saved (demo)`, message: 'Recorded for this session only. Ledger balances are not changed.' });
    setNo((n) => n + 1);
    setEntries([{ id: Date.now(), account: '', dr: 0, cr: 0 }, { id: Date.now() + 1, account: '', dr: 0, cr: 0 }]);
    setNarration('');
  };

  return (
    <>
      <PageHeader variant="bill" title="Voucher" shortcuts="Enter = next · Alt+N = new · Ctrl+S = save · Esc = dashboard" />
      <div className="mt-3 space-y-3">
        <DemoNotice />
        <Panel bodyClassName="p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Field label="Voucher type" htmlFor="vtype">
              <SelectInput id="vtype" compact value={type} onChange={(e) => setType(e.target.value as (typeof voucherTypes)[number])}>
                {voucherTypes.map((t) => <option key={t}>{t}</option>)}
              </SelectInput>
            </Field>
            <Field label="Voucher No"><TextInput compact numeric type="number" min={1} value={no} onChange={(e) => setNo(Math.max(1, Math.floor(parseNum(e.target.value))))} aria-label="Voucher number" /></Field>
            <Field label="Date" htmlFor="vdate"><TextInput id="vdate" type="date" compact value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Narration" className="xl:col-span-2"><TextInput compact value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="Being cash received from…" /></Field>
          </div>
        </Panel>

        <Panel title="Accounts" flush bodyClassName="p-3">
          <div className="table-wrap">
            <table className="data-table min-w-[640px]">
              <thead><tr><th>#</th><th>Account (ledger)</th><th className="num">Debit (Dr)</th><th className="num">Credit (Cr)</th><th /></tr></thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e.id}>
                    <td>{i + 1}</td>
                    <td>
                      <SelectInput compact className="min-w-[16rem]" value={e.account} onChange={(ev) => update(e.id, { account: ev.target.value })} aria-label="Account">
                        <option value="">Select account…</option>
                        {ledgers.map((l) => <option key={String(l.id)}>{String(l.name)}</option>)}
                      </SelectInput>
                    </td>
                    <td className="num"><TextInput compact numeric type="number" min={0} step="0.01" className="w-32" value={e.dr || ''} onChange={(ev) => update(e.id, { dr: Math.max(0, parseNum(ev.target.value)), cr: 0 })} aria-label="Debit amount" /></td>
                    <td className="num"><TextInput compact numeric type="number" min={0} step="0.01" className="w-32" value={e.cr || ''} onChange={(ev) => update(e.id, { cr: Math.max(0, parseNum(ev.target.value)), dr: 0 })} aria-label="Credit amount" /></td>
                    <td><button type="button" className="p-1 text-slate-400 hover:text-fiery" onClick={() => setEntries((xs) => (xs.length > 2 ? xs.filter((x) => x.id !== e.id) : xs))} aria-label="Remove account row"><X className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={2}>Total</td><td className="num">{formatMoneyPlain(dr)}</td><td className="num">{formatMoneyPlain(cr)}</td><td /></tr>
              </tfoot>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <Button size="sm" variant="ghost" icon={<Plus className="h-4 w-4" />} onClick={() => setEntries((xs) => [...xs, { id: Date.now(), account: '', dr: 0, cr: 0 }])}>Add account</Button>
            <div className={cn('flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold', balanced ? 'bg-green-50 text-[#1d6b40]' : 'bg-red-50 text-fiery')}>
              {balanced ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {balanced ? 'Debit equals credit' : `Difference ${formatINR(Math.abs(diff))}`}
            </div>
          </div>
        </Panel>

        <div className="no-print flex flex-wrap gap-2 rounded-xl border border-[#e3d6bd] bg-white p-2.5 shadow-panel">
          <Button variant="outline" icon={<X className="h-4 w-4" />} onClick={() => setEntries([{ id: Date.now(), account: '', dr: 0, cr: 0 }, { id: Date.now() + 1, account: '', dr: 0, cr: 0 }])}>Cancel</Button>
          <Button variant="primary" className="ml-auto" icon={<Save className="h-4 w-4" />} onClick={save}>Save voucher</Button>
        </div>
      </div>
    </>
  );
}
