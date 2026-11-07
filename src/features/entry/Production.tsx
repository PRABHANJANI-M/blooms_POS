import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Save, ListChecks, X } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Field, SelectInput, TextInput } from '../../components/ui/Field';
import { Panel } from '../../components/ui/Panel';
import { DemoNotice } from '../../components/ui/DemoNotice';
import { useAppStore } from '../../store/appStore';
import { useDemoStore } from '../../store/demoStore';
import { items } from '../../mock-data/items';
import { formatINR, formatMoneyPlain, formatQty, parseNum, round2 } from '../../utils/money';
import { todayISO } from '../../utils/date';

interface Finished { id: number; itemId: string; qty: number; costPct: number }
interface Raw { id: number; itemId: string; qty: number; rate: number }
interface Expense { id: number; label: string; type: 'Amt' | '%'; value: number }

const blank = (): { f: Finished; r: Raw } => ({ f: { id: Date.now(), itemId: '', qty: 0, costPct: 0 }, r: { id: Date.now() + 1, itemId: '', qty: 0, rate: 0 } });

/** Production (manufacturing) entry: finished goods, raw materials, expenses and cost summary. Mirrors the video layout. */
export function Production() {
  const toast = useAppStore((s) => s.toast);
  const addVoucher = useDemoStore((s) => s.addVoucher);
  const [prodNo, setProdNo] = useState(1);
  const [date, setDate] = useState(todayISO());
  const [narration, setNarration] = useState('');
  const [finished, setFinished] = useState<Finished[]>([{ id: 1, itemId: '', qty: 0, costPct: 0 }]);
  const [raws, setRaws] = useState<Raw[]>([{ id: 2, itemId: '', qty: 0, rate: 0 }]);
  const [expenses, setExpenses] = useState<Expense[]>([{ id: 3, label: 'LABOUR', type: 'Amt', value: 0 }, { id: 4, label: '', type: 'Amt', value: 0 }]);
  const [updateCost, setUpdateCost] = useState<'Yes' | 'No'>('Yes');

  const rawValue = useMemo(() => round2(raws.reduce((a, r) => a + r.qty * r.rate, 0)), [raws]);
  const rawQty = useMemo(() => raws.reduce((a, r) => a + r.qty, 0), [raws]);
  const expTotal = useMemo(() => round2(expenses.reduce((a, e) => a + (e.type === '%' ? (rawValue * e.value) / 100 : e.value), 0)), [expenses, rawValue]);
  const totalCost = round2(rawValue + expTotal);
  const finishedQty = finished.reduce((a, f) => a + f.qty, 0);
  const costPerUnit = finishedQty ? round2(totalCost / finishedQty) : 0;
  const productionPct = rawQty ? round2((finishedQty / rawQty) * 100) : 0;
  const wastagePct = rawQty && finishedQty < rawQty ? round2(((rawQty - finishedQty) / rawQty) * 100) : 0;

  const itemName = (id: string) => items.find((i) => i.id === id);

  const save = () => {
    if (!finished.some((f) => f.itemId && f.qty > 0)) return toast({ tone: 'error', title: 'Add a finished item with quantity' });
    if (!raws.some((r) => r.itemId && r.qty > 0)) return toast({ tone: 'error', title: 'Add at least one raw material' });
    addVoucher('production', { id: `pr-${Date.now()}`, no: `PRD-${prodNo}`, date, party: 'Production', amount: totalCost, status: 'Saved (demo)' });
    setProdNo((n) => n + 1);
    toast({ tone: 'success', title: `Production PRD-${prodNo} saved (demo)`, message: `Cost ${formatINR(totalCost)}. Stock is not changed in a real ledger.` });
    const b = blank();
    setFinished([b.f]); setRaws([b.r]); setNarration('');
  };

  return (
    <>
      <PageHeader variant="bill" title="Production" shortcuts="Enter = next · Alt+L = last recipe · F10 = save · Alt+N = new · Esc = dashboard" />
      <div className="mt-3 space-y-3">
        <DemoNotice />
        <Panel bodyClassName="p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-[8rem_12rem_1fr]">
            <Field label="Prod No"><TextInput compact readOnly value={prodNo} aria-label="Production number" /></Field>
            <Field label="Date" htmlFor="pdate"><TextInput id="pdate" type="date" compact value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Narration"><TextInput compact value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="Batch remarks" /></Field>
          </div>
        </Panel>

        <div className="grid gap-3 xl:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            <Panel title="Finished Goods (Production)" flush bodyClassName="p-3" actions={<span className="text-xs text-slate-500">Qty {formatQty(finishedQty)}</span>}>
              <div className="table-wrap"><table className="data-table">
                <thead><tr><th>#</th><th>Item produced</th><th>Unit</th><th className="num">Qty</th><th className="num">Cost %</th><th className="num">Unit cost</th><th className="num">Amount</th><th /></tr></thead>
                <tbody>
                  {finished.map((f, i) => {
                    const it = itemName(f.itemId);
                    const share = finishedQty ? totalCost * (f.qty / finishedQty) : 0;
                    return (
                      <tr key={f.id}>
                        <td>{i + 1}</td>
                        <td><SelectInput compact className="min-w-[14rem]" value={f.itemId} onChange={(e) => setFinished((xs) => xs.map((x) => (x.id === f.id ? { ...x, itemId: e.target.value } : x)))} aria-label="Finished item"><option value="">Item produced — choose…</option>{items.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</SelectInput></td>
                        <td>{it?.unit ?? '—'}</td>
                        <td className="num"><TextInput compact numeric type="number" min={0} step="any" className="w-24" value={f.qty || ''} onChange={(e) => setFinished((xs) => xs.map((x) => (x.id === f.id ? { ...x, qty: Math.max(0, parseNum(e.target.value)) } : x)))} aria-label="Finished quantity" /></td>
                        <td className="num"><TextInput compact numeric type="number" min={0} className="w-20" value={f.costPct || ''} onChange={(e) => setFinished((xs) => xs.map((x) => (x.id === f.id ? { ...x, costPct: Math.max(0, parseNum(e.target.value)) } : x)))} aria-label="Cost percent" /></td>
                        <td className="num">{f.qty ? formatMoneyPlain(round2(share / f.qty)) : '—'}</td>
                        <td className="num">{formatMoneyPlain(round2(share))}</td>
                        <td><button type="button" className="p-1 text-slate-400 hover:text-fiery" onClick={() => setFinished((xs) => xs.filter((x) => x.id !== f.id))} aria-label="Remove finished row"><X className="h-4 w-4" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table></div>
              <div className="p-3"><Button size="sm" variant="ghost" icon={<Plus className="h-4 w-4" />} onClick={() => setFinished((xs) => [...xs, { id: Date.now(), itemId: '', qty: 0, costPct: 0 }])}>Add finished item</Button></div>
            </Panel>

            <Panel title="Raw Materials (Consumption)" flush bodyClassName="p-3" actions={<span className="text-xs text-slate-500">Qty {formatQty(rawQty)} · Value {formatINR(rawValue)}</span>}>
              <div className="table-wrap"><table className="data-table">
                <thead><tr><th>#</th><th>Raw material</th><th>Unit</th><th className="num">Stock</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">Amount</th><th /></tr></thead>
                <tbody>
                  {raws.map((r, i) => {
                    const it = itemName(r.itemId);
                    return (
                      <tr key={r.id}>
                        <td>{i + 1}</td>
                        <td><SelectInput compact className="min-w-[14rem]" value={r.itemId} onChange={(e) => { const it2 = itemName(e.target.value); setRaws((xs) => xs.map((x) => (x.id === r.id ? { ...x, itemId: e.target.value, rate: it2?.rate ?? 0 } : x))); }} aria-label="Raw material"><option value="">raw material — space = list</option>{items.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</SelectInput></td>
                        <td>{it?.unit ?? '—'}</td>
                        <td className="num">{it ? formatQty(it.stock) : '—'}</td>
                        <td className="num"><TextInput compact numeric type="number" min={0} step="any" className="w-24" value={r.qty || ''} onChange={(e) => setRaws((xs) => xs.map((x) => (x.id === r.id ? { ...x, qty: Math.max(0, parseNum(e.target.value)) } : x)))} aria-label="Raw quantity" /></td>
                        <td className="num"><TextInput compact numeric type="number" min={0} className="w-24" value={r.rate || ''} onChange={(e) => setRaws((xs) => xs.map((x) => (x.id === r.id ? { ...x, rate: Math.max(0, parseNum(e.target.value)) } : x)))} aria-label="Raw rate" /></td>
                        <td className="num">{formatMoneyPlain(round2(r.qty * r.rate))}</td>
                        <td><button type="button" className="p-1 text-slate-400 hover:text-fiery" onClick={() => setRaws((xs) => xs.filter((x) => x.id !== r.id))} aria-label="Remove raw row"><X className="h-4 w-4" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table></div>
              <div className="p-3"><Button size="sm" variant="ghost" icon={<Plus className="h-4 w-4" />} onClick={() => setRaws((xs) => [...xs, { id: Date.now(), itemId: '', qty: 0, rate: 0 }])}>Add raw material</Button></div>
            </Panel>
          </div>

          <div className="space-y-3">
            <Panel title="Expenses" bodyClassName="p-3" actions={<span className="font-bold text-navy">{formatINR(expTotal)}</span>}>
              <p className="mb-2 text-xs text-slate-500">Labour, power, packing… Type % = percent of raw material value.</p>
              <div className="space-y-2">
                {expenses.map((e) => (
                  <div key={e.id} className="grid grid-cols-[1fr_5rem_6rem] gap-2">
                    <TextInput compact value={e.label} placeholder="Expense" onChange={(ev) => setExpenses((xs) => xs.map((x) => (x.id === e.id ? { ...x, label: ev.target.value.toUpperCase() } : x)))} aria-label="Expense name" />
                    <SelectInput compact value={e.type} onChange={(ev) => setExpenses((xs) => xs.map((x) => (x.id === e.id ? { ...x, type: ev.target.value as 'Amt' | '%' } : x)))} aria-label="Expense type">
                      <option value="Amt">Amt</option><option value="%">%</option>
                    </SelectInput>
                    <TextInput compact numeric type="number" min={0} value={e.value || ''} onChange={(ev) => setExpenses((xs) => xs.map((x) => (x.id === e.id ? { ...x, value: Math.max(0, parseNum(ev.target.value)) } : x)))} aria-label="Expense value" />
                  </div>
                ))}
              </div>
              <Button size="sm" variant="ghost" className="mt-2" icon={<Plus className="h-4 w-4" />} onClick={() => setExpenses((xs) => [...xs, { id: Date.now(), label: '', type: 'Amt', value: 0 }])}>Add expense</Button>
            </Panel>

            <Panel title="Production Cost" bodyClassName="p-3">
              <dl className="space-y-1.5 text-sm">
                <Line k="Raw material value" v={formatINR(rawValue)} />
                <Line k="Expenses" v={formatINR(expTotal)} />
                <Line k="Total production cost" v={formatINR(totalCost)} strong />
                <Line k="Finished qty" v={formatQty(finishedQty)} />
                <Line k="Production %" v={productionPct ? `${productionPct}%` : '—'} />
                <Line k="Wastage %" v={wastagePct ? `${wastagePct}%` : '—'} />
                <Line k="Cost per unit" v={costPerUnit ? formatINR(costPerUnit) : '—'} strong />
              </dl>
              <label className="mt-4 flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-navy">Update item cost rate</span>
                <SelectInput compact className="w-28" value={updateCost} onChange={(e) => setUpdateCost(e.target.value as 'Yes' | 'No')} aria-label="Update item cost rate">
                  <option>Yes</option><option>No</option>
                </SelectInput>
              </label>
              <p className="mt-1 text-xs text-slate-500">Finished goods take the unit cost above when Yes.</p>
            </Panel>
          </div>
        </div>

        <div className="no-print flex flex-wrap gap-2 rounded-xl border border-[#e3d6bd] bg-white p-2.5 shadow-panel">
          <Button variant="outline" icon={<ChevronLeft className="h-4 w-4" />} onClick={() => setProdNo((n) => Math.max(1, n - 1))}>Prev</Button>
          <Button variant="outline" icon={<ChevronRight className="h-4 w-4" />} onClick={() => setProdNo((n) => n + 1)}>Next</Button>
          <Button variant="steel" icon={<Plus className="h-4 w-4" />} onClick={() => { const b = blank(); setFinished([b.f]); setRaws([b.r]); setNarration(''); }}>New (Alt+N)</Button>
          <Button variant="outline" icon={<ListChecks className="h-4 w-4" />} onClick={() => toast({ tone: 'info', title: 'Display', message: 'Open Entry → Production → Display for the register.' })}>Display</Button>
          <Button variant="ghost" icon={<X className="h-4 w-4" />} onClick={() => window.history.back()}>Close (Esc)</Button>
          <Button variant="primary" className="ml-auto" size="lg" icon={<Save className="h-4 w-4" />} onClick={save}>Save (F10)</Button>
        </div>
      </div>
    </>
  );
}

function Line({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 border-b border-cream-200 pb-1 ${strong ? 'font-bold text-navy' : 'text-slate-600'}`}>
      <dt>{k}</dt><dd className="tabular-nums">{v}</dd>
    </div>
  );
}
