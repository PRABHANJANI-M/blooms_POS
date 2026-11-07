import { useMemo, useState } from 'react';
import { Save, Printer, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Field, TextInput, TextArea } from '../../components/ui/Field';
import { Panel } from '../../components/ui/Panel';
import { StatCard } from '../../components/ui/StatCard';
import { DemoNotice } from '../../components/ui/DemoNotice';
import { Badge } from '../../components/ui/Badge';
import { DataTable, type Column } from '../../components/tables/DataTable';
import { useAppStore } from '../../store/appStore';
import { counterDenominations } from '../../mock-data/entry';
import { formatINR, parseNum, round2 } from '../../utils/money';
import { toDisplayDate, todayISO } from '../../utils/date';
import { cn } from '../../utils/cn';

const bills = [
  { no: 30, party: 'Sedhu Provision Store', type: 'CREDIT', bill: 300, cash: 0, card: 0, upi: 0, credit: 300, ref: '' },
];

/** Counter closing: expected cash position vs physical denomination count. Demo only. */
export function CounterClosing() {
  const navigate = useNavigate();
  const toast = useAppStore((s) => s.toast);
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [coins, setCoins] = useState('');
  const [remarks, setRemarks] = useState('');
  const [date, setDate] = useState(todayISO());

  const expectedCash = 7965;
  const counted = useMemo(() => {
    const notes = counterDenominations.reduce((a, d) => a + d * parseNum(counts[d]), 0);
    return round2(notes + parseNum(coins));
  }, [counts, coins]);
  const short = round2(counted - expectedCash);

  const billColumns: Column<(typeof bills)[number]>[] = [
    { key: 'no', header: 'No', render: (r) => r.no },
    { key: 'party', header: 'Party', render: (r) => r.party },
    { key: 'type', header: 'Type', render: (r) => <Badge tone="amber">{r.type}</Badge> },
    { key: 'bill', header: 'Bill', align: 'right', render: (r) => formatINR(r.bill) },
    { key: 'cash', header: 'Cash', align: 'right', render: (r) => formatINR(r.cash) },
    { key: 'card', header: 'Card', align: 'right', render: (r) => formatINR(r.card) },
    { key: 'upi', header: 'UPI', align: 'right', render: (r) => formatINR(r.upi) },
    { key: 'credit', header: 'Credit', align: 'right', render: (r) => formatINR(r.credit) },
  ];

  return (
    <>
      <PageHeader variant="bill" title="Counter Closing" shortcuts="Enter = next denomination · Esc = dashboard"
        actions={
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-white/90">Date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input input-sm w-40 bg-white" aria-label="Closing date" />
            </label>
            <span className="rounded-md bg-white/15 px-2.5 py-1 text-xs font-semibold">Counter: MAIN</span>
          </div>
        }
      />
      <div className="mt-3 space-y-3">
        <DemoNotice>Expected cash is a sample figure. Saving a closing does not post to accounts.</DemoNotice>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard tone="steel" label="Sales (1 bills)" value={formatINR(300)} />
          <StatCard tone="cream" label="Cash" value={formatINR(0)} />
          <StatCard tone="maroon" label="Card" value={formatINR(0)} />
          <StatCard tone="steel" label="UPI" value={formatINR(0)} />
          <StatCard tone="fiery" label="On Credit" value={formatINR(300)} />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          <Panel title="Cash Position" icon={<CreditCard className="h-4 w-4" />}>
            <dl className="space-y-2 text-sm">
              {[
                ['Opening Cash (end of 03-11-2026)', 7965],
                ['+ Cash Sales (cash bills less card / UPI)', 0],
                ['+ Cash received on Credit Bills', 0],
                ['− Sales Return (cash)', 0],
                ['− Purchase (cash)', 0],
                ['+ Purchase Return (cash)', 0],
                ['+ Vouchers − cash in (receipts / contra)', 0],
                ['− Vouchers − cash out (payments / contra)', 0],
              ].map(([label, v]) => (
                <div key={String(label)} className="flex justify-between gap-3 border-b border-cream-200 pb-1.5">
                  <dt className="text-slate-600">{label}</dt>
                  <dd className="tabular-nums font-semibold text-navy">{formatINR(Number(v))}</dd>
                </div>
              ))}
              <div className="flex justify-between rounded-md bg-cream-200 px-2 py-2 font-bold text-navy">
                <dt>Cash expected in counter</dt><dd className="tabular-nums">{formatINR(expectedCash)}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <p className="section-title mb-2">Bills of the day</p>
              <DataTable columns={billColumns} rows={bills} rowKey={(r) => String(r.no)} emptyTitle="No bills today" />
            </div>
          </Panel>

          <Panel title="Cash Count (Denomination)" icon={<Save className="h-4 w-4" />}>
            <div className="space-y-2">
              {counterDenominations.map((d) => (
                <div key={d} className="grid grid-cols-[5.5rem_1.5rem_1fr_6rem] items-center gap-2 text-sm">
                  <span className="font-semibold text-navy">₹ {d}</span>
                  <span className="text-slate-400">×</span>
                  <TextInput type="number" min={0} step={1} numeric compact aria-label={`Count of ₹${d} notes`} value={counts[d] ?? ''} placeholder="0"
                    onChange={(e) => setCounts((c) => ({ ...c, [d]: e.target.value }))} />
                  <span className="text-right tabular-nums text-slate-700">{formatINR(d * parseNum(counts[d]))}</span>
                </div>
              ))}
              <div className="grid grid-cols-[5.5rem_1.5rem_1fr_6rem] items-center gap-2 text-sm">
                <span className="font-semibold text-navy">Coins / Other</span><span className="text-slate-400">=</span>
                <TextInput type="number" min={0} numeric compact aria-label="Coins and other" value={coins} placeholder="0" onChange={(e) => setCoins(e.target.value)} />
                <span className="text-right tabular-nums">{formatINR(parseNum(coins))}</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-cream-50 p-3"><p className="text-xs text-slate-500">Counted</p><p className="text-lg font-bold text-navy">{formatINR(counted)}</p></div>
              <div className={cn('rounded-lg p-3', short === 0 ? 'bg-green-50' : 'bg-red-50')}>
                <p className="text-xs text-slate-500">{short < 0 ? 'Short' : short > 0 ? 'Excess' : 'Tallied'}</p>
                <p className={cn('text-lg font-bold', short === 0 ? 'text-[#1d6b40]' : 'text-fiery')}>{formatINR(Math.abs(short))}</p>
              </div>
            </div>
            <Field label="Remarks (short / excess reason, handed over to)" className="mt-4">
              <TextArea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Short / excess reason, handed over to …" />
            </Field>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="primary" icon={<Save className="h-4 w-4" />} onClick={() => toast({ tone: 'success', title: 'Counter closing saved (demo)', message: `Counted ${formatINR(counted)}. Not stored in a database.` })}>Save Closing</Button>
              <Button variant="navy" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Print</Button>
              <Button variant="steel" icon={<CreditCard className="h-4 w-4" />} onClick={() => navigate('/entry/sales/card-upi-settlement')}>Card / UPI Settlement</Button>
            </div>
            <p className="mt-3 text-xs text-slate-500">Closing date {toDisplayDate(date)}</p>
          </Panel>
        </div>
      </div>
    </>
  );
}
