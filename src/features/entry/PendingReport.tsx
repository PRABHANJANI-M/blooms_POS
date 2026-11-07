import { useMemo, useState } from 'react';
import { Play, Eraser, X } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Field, SelectInput, TextInput } from '../../components/ui/Field';
import { Panel } from '../../components/ui/Panel';
import { DataTable, type Column } from '../../components/tables/DataTable';
import { DemoNotice } from '../../components/ui/DemoNotice';
import { Badge, statusTone } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAppStore } from '../../store/appStore';
import { voucherHistory } from '../../mock-data/entry';
import { parties } from '../../mock-data/parties';
import { items } from '../../mock-data/items';
import { formatINR } from '../../utils/money';
import { toDisplayDate, todayISO } from '../../utils/date';
import { cn } from '../../utils/cn';
import type { VoucherRow } from '../../types';
import { voucherConfigs, type VoucherKind } from './voucherConfig';

const showOptions = ['Pending only', 'Part billed only', 'Expiring soon (pending)', 'Expired with balance', 'Completed / closed', 'All orders'] as const;
type ShowOption = (typeof showOptions)[number];

/** Pending order / challan report: filter form, Load, Clear, Close — same layout as the Sales Order Pending screen in the video. */
export function PendingReport({ kind }: { kind: VoucherKind }) {
  const cfg = voucherConfigs[kind];
  const toast = useAppStore((s) => s.toast);
  const [from, setFrom] = useState('2026-04-01');
  const [to, setTo] = useState(todayISO());
  const [party, setParty] = useState('');
  const [item, setItem] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [show, setShow] = useState<ShowOption>('Pending only');
  const [includeClosed, setIncludeClosed] = useState(false);
  const [olderThan, setOlderThan] = useState('');
  const [result, setResult] = useState<VoucherRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  const source = useMemo(() => voucherHistory[kind] ?? [], [kind]);

  const load = () => {
    setLoading(true);
    setResult(null);
    window.setTimeout(() => {
      const rows = source.filter((r) => {
        if (r.date < from || r.date > to) return false;
        if (party && !r.party.toLowerCase().includes(party.toLowerCase())) return false;
        if (orderNo && !r.no.toLowerCase().includes(orderNo.toLowerCase())) return false;
        if (item && !items.some((i) => i.name.toLowerCase().includes(item.toLowerCase()))) return false;
        const closed = /closed|completed|billed/i.test(r.status) && !/part/i.test(r.status);
        if (show === 'Completed / closed') return closed;
        if (show === 'All orders') return true;
        if (show === 'Part billed only') return /part/i.test(r.status);
        if (!includeClosed && closed) return false;
        if (olderThan) {
          const days = (Date.now() - new Date(r.date).getTime()) / 86400000;
          if (days < Number(olderThan)) return false;
        }
        return true;
      });
      setResult(rows);
      setLoading(false);
      toast({ tone: rows.length ? 'success' : 'info', title: `${rows.length} record(s) loaded`, message: 'Demo register rows.' });
    }, 450);
  };

  const clear = () => { setParty(''); setItem(''); setOrderNo(''); setShow('Pending only'); setIncludeClosed(false); setOlderThan(''); setResult(null); };

  const columns: Column<VoucherRow>[] = [
    { key: 'no', header: `${cfg.title} No`, render: (r) => <span className="font-semibold text-navy">{r.no}</span> },
    { key: 'date', header: 'Date', sortValue: (r) => r.date, render: (r) => toDisplayDate(r.date) },
    { key: 'party', header: cfg.partyLabel ?? 'Party', sortValue: (r) => r.party, render: (r) => r.party },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
    { key: 'amount', header: 'Value', align: 'right', sortValue: (r) => r.amount, render: (r) => formatINR(r.amount) },
  ];

  return (
    <>
      <PageHeader variant="bill" title={`${cfg.title} Pending`} shortcuts="Enter = next box · Alt+L = load · Esc = dashboard" />
      <div className="mt-3 space-y-3">
        <DemoNotice />
        <Panel bodyClassName="p-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={cfg.partyLabel ?? 'Party'} className="sm:col-span-2">
                <SelectInput value={party} onChange={(e) => setParty(e.target.value)} aria-label="Party filter">
                  <option value="">part of the name</option>
                  {parties.filter((p) => !cfg.partyKind || p.kind === cfg.partyKind).map((p) => <option key={p.id}>{p.name}</option>)}
                </SelectInput>
              </Field>
              <Field label="Item">
                <TextInput value={item} placeholder="part of the item name" onChange={(e) => setItem(e.target.value)} />
              </Field>
              <Field label={`${cfg.title} No`}>
                <TextInput value={orderNo} placeholder="blank = all" onChange={(e) => setOrderNo(e.target.value)} />
              </Field>
              <Field label="Date from" htmlFor="pf"><TextInput id="pf" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
              <Field label="Date to" htmlFor="pt"><TextInput id="pt" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
            </div>
            <div className="grid gap-3">
              <fieldset className="rounded-lg border border-cream-200 p-3">
                <legend className="px-1 text-xs font-bold uppercase tracking-wider text-steel">Show</legend>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {showOptions.map((o) => (
                    <label key={o} className={cn('flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm', show === o && 'bg-steel-100 font-semibold text-navy')}>
                      <input type="radio" name="show" checked={show === o} onChange={() => setShow(o)} className="accent-fiery" />
                      {o}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={includeClosed} onChange={(e) => setIncludeClosed(e.target.checked)} className="h-4 w-4 accent-fiery" />
                  Show closed {cfg.title.toLowerCase()}s
                </label>
                <Field label="Older than (days)">
                  <TextInput type="number" min={0} numeric value={olderThan} placeholder="blank = all" onChange={(e) => setOlderThan(e.target.value)} />
                </Field>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="navy" icon={<Play className="h-4 w-4" />} onClick={load} loading={loading}>Load</Button>
            <Button variant="outline" icon={<Eraser className="h-4 w-4" />} onClick={clear}>Clear</Button>
            <Button variant="ghost" icon={<X className="h-4 w-4" />} onClick={() => window.history.back()}>Close</Button>
          </div>
        </Panel>

        <Panel flush title="Results" bodyClassName="p-0">
          {result === null && !loading ? (
            <EmptyState title="Press Load to view results" message="Filters apply to the demo register for the chosen dates." />
          ) : (
            <DataTable<VoucherRow> columns={columns} rows={result ?? []} rowKey={(r) => r.id} loading={loading} emptyTitle="Nothing pending for these filters" emptyMessage="Try widening the dates or choosing 'All orders'." />
          )}
        </Panel>
      </div>
    </>
  );
}
