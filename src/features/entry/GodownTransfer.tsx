import { useMemo, useState } from 'react';
import { ArrowRight, Boxes, Save, Plus, X } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Field, SelectInput, TextInput } from '../../components/ui/Field';
import { Panel } from '../../components/ui/Panel';
import { DemoNotice } from '../../components/ui/DemoNotice';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../services/api';
import { useAppStore } from '../../store/appStore';
import { useDemoStore, NO_RECORDS } from '../../store/demoStore';
import { items as demoItems } from '../../mock-data/items';
import { formatQty, parseNum } from '../../utils/money';
import { todayISO } from '../../utils/date';

interface Row { id: number; itemId: string; qty: number }

/** Godown (warehouse) to godown stock transfer. Layout follows the Godown Transfer screen in the video. */
export function GodownTransfer() {
  const toast = useAppStore((s) => s.toast);
  const godowns = useDemoStore((s) => s.masters.godowns ?? NO_RECORDS);
  const { data: items } = useAsync(() => api.getItems(), []);
  const [date, setDate] = useState(todayISO());
  const [from, setFrom] = useState('MAIN GODOWN');
  const [to, setTo] = useState('SHOP');
  const [narration, setNarration] = useState('');
  const [rows, setRows] = useState<Row[]>([{ id: 1, itemId: '', qty: 0 }]);
  const [stockOpen, setStockOpen] = useState(false);
  const [saved, setSaved] = useState(0);
  const [number, setNumber] = useState(1);

  const list = items ?? demoItems;
  const valid = rows.filter((r) => r.itemId && r.qty > 0);
  const stockOf = (id: string) => list.find((i) => i.id === id)?.stock ?? 0;
  const totalQty = useMemo(() => valid.reduce((a, r) => a + r.qty, 0), [valid]);

  const setRow = (id: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, { id: Date.now(), itemId: '', qty: 0 }]);

  const save = () => {
    if (from === to) return toast({ tone: 'error', title: 'Choose two different godowns' });
    if (!valid.length) return toast({ tone: 'error', title: 'Add at least one item with quantity' });
    const over = valid.find((r) => r.qty > stockOf(r.itemId));
    if (over) return toast({ tone: 'error', title: 'Not enough stock', message: `${list.find((i) => i.id === over.itemId)?.name} has only ${stockOf(over.itemId)} in ${from}.` });
    setSaved((n) => n + 1);
    setNumber((n) => n + 1);
    toast({ tone: 'success', title: `Transfer GT-${number} saved (demo)`, message: `${formatQty(totalQty)} unit(s) moved ${from} → ${to} in this session only.` });
    setRows([{ id: Date.now(), itemId: '', qty: 0 }]);
    setNarration('');
  };

  return (
    <>
      <PageHeader variant="bill" title="Godown Transfer" shortcuts="Enter = next · Space = item list · F10 = save · Alt+N = new · Esc = dashboard" />
      <div className="mt-3 space-y-3">
        <DemoNotice />
        <Panel bodyClassName="p-3 sm:p-4">
          <div className="grid gap-3 md:grid-cols-[auto_1fr_auto_1fr_1fr]">
            <Field label="No"><div className="flex h-9 w-20 items-center justify-center rounded-lg bg-steel-100 font-bold text-navy">{number}</div></Field>
            <Field label="Date" htmlFor="gdate"><TextInput id="gdate" type="date" compact value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <span className="hidden items-end justify-center pb-2 text-steel md:flex"><ArrowRight className="h-6 w-6" /></span>
            <Field label="From godown" htmlFor="gfrom">
              <SelectInput id="gfrom" compact value={from} onChange={(e) => setFrom(e.target.value)}>
                {godowns.map((g) => <option key={g.id}>{String(g.name)}</option>)}
              </SelectInput>
            </Field>
            <Field label="To godown" htmlFor="gto">
              <SelectInput id="gto" compact value={to} onChange={(e) => setTo(e.target.value)}>
                {godowns.map((g) => <option key={g.id}>{String(g.name)}</option>)}
              </SelectInput>
            </Field>
            <Field label="Narration" className="md:col-span-5">
              <TextInput compact value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="Reason for transfer" />
            </Field>
          </div>
        </Panel>

        <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
          <Panel title="Items" icon={<Boxes className="h-4 w-4" />} flush bodyClassName="p-3" actions={<span className="text-xs text-slate-500">Qty {formatQty(totalQty)}</span>}>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>#</th><th>Code</th><th>Item name</th><th>Unit</th><th className="num">Stock (from)</th><th className="num">Qty</th><th /></tr></thead>
                <tbody>
                  {rows.map((r, i) => {
                    const it = list.find((x) => x.id === r.itemId);
                    return (
                      <tr key={r.id}>
                        <td>{i + 1}</td>
                        <td className="font-mono text-xs">{it?.code ?? ''}</td>
                        <td className="!whitespace-normal">
                          <SelectInput compact value={r.itemId} onChange={(e) => setRow(r.id, { itemId: e.target.value })} aria-label="Item name" className="min-w-[14rem]">
                            <option value="">Space = item list</option>
                            {list.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                          </SelectInput>
                        </td>
                        <td>{it?.unit ?? '—'}</td>
                        <td className="num">{it ? formatQty(it.stock) : '—'}</td>
                        <td className="num"><TextInput compact type="number" min={0} step="any" numeric className="w-24" value={r.qty || ''} onChange={(e) => setRow(r.id, { qty: Math.max(0, parseNum(e.target.value)) })} aria-label="Quantity" /></td>
                        <td><button type="button" className="p-1 text-slate-400 hover:text-fiery" onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))} aria-label="Remove row"><X className="h-4 w-4" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-3"><Button size="sm" variant="ghost" icon={<Plus className="h-4 w-4" />} onClick={addRow}>Add row</Button></div>
          </Panel>

          <Panel title="Transfers (period)" flush>
            {saved === 0 ? <EmptyState title="No transfer in this period" message="Saved transfers in this session will appear here." /> : (
              <p className="p-4 text-sm text-slate-600">{saved} transfer(s) saved this session (demo).</p>
            )}
          </Panel>
        </div>

        <div className="no-print flex flex-wrap gap-2 rounded-xl border border-[#e3d6bd] bg-white p-2.5 shadow-panel">
          <Button variant="outline" icon={<Plus className="h-4 w-4" />} onClick={() => { setRows([{ id: Date.now(), itemId: '', qty: 0 }]); setNarration(''); }}>New (Alt+N)</Button>
          <Button variant="steel" icon={<Boxes className="h-4 w-4" />} onClick={() => setStockOpen(true)}>Godown Stock</Button>
          <Button variant="ghost" icon={<X className="h-4 w-4" />} onClick={() => window.history.back()}>Close (Esc)</Button>
          <Button variant="primary" className="ml-auto" size="lg" icon={<Save className="h-4 w-4" />} onClick={save}>Save (F10)</Button>
        </div>
      </div>

      <Modal open={stockOpen} onClose={() => setStockOpen(false)} title={`Godown stock — ${from}`} width="max-w-2xl">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Item</th><th>Unit</th><th className="num">Stock</th><th className="num">Reorder</th></tr></thead>
            <tbody>
              {list.map((i) => (
                <tr key={i.id}><td>{i.name}</td><td>{i.unit}</td><td className="num">{formatQty(i.stock)}</td><td className="num">{formatQty(i.reorderLevel)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">Demo stock. Stock is not moved between real godowns.</p>
      </Modal>
    </>
  );
}
