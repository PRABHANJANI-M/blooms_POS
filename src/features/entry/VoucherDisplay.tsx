import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Filter, XCircle, Trash2, Printer, FilePlus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { DataTable, type Column } from '../../components/tables/DataTable';
import { DateRange, type RangeOption } from '../../components/common/DateRange';
import { ExportBar } from '../../components/common/ExportBar';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DemoNotice } from '../../components/ui/DemoNotice';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge, statusTone } from '../../components/ui/Badge';
import { Panel } from '../../components/ui/Panel';
import { Modal } from '../../components/ui/Modal';
import { Field, SelectInput, TextInput } from '../../components/ui/Field';
import { useAppStore } from '../../store/appStore';
import { useDemoStore, NO_ROWS } from '../../store/demoStore';
import { recentSalesBills, voucherHistory } from '../../mock-data/entry';
import { formatINR } from '../../utils/money';
import { toDisplayDate, todayISO, addDays } from '../../utils/date';
import type { VoucherRow } from '../../types';
import { computeTotals } from '../../utils/billing';
import { useHotkeys } from '../../hooks/useHotkeys';
import { InvoicePreview } from '../billing/InvoicePreview';
import type { QuotationTransfer } from './VoucherForm';
import { voucherConfigs, type VoucherKind } from './voucherConfig';

/**
 * Generic register ("Display") used by every Display submenu in the Entry module.
 * Filters by date range, supports search, selection, Excel/PDF/Print exports and Delete Loaded.
 */
export function VoucherDisplay({ kind }: { kind: VoucherKind }) {
  const cfg = voucherConfigs[kind];
  const isSalesReturn = kind === 'sales-return';
  const isQuotation = kind === 'quotation';
  const isSalesOrder = kind === 'sales-order';
  const isPurchaseRegister = kind === 'purchase-bill';
  const isPurchaseOrderRegister = kind === 'purchase-order';
  const isSpecialRegister = isSalesReturn || isQuotation || isSalesOrder;
  const isDedicatedRegister = isSpecialRegister || isPurchaseRegister || isPurchaseOrderRegister;
  const navigate = useNavigate();
  const toast = useAppStore((s) => s.toast);
  const saved = useDemoStore((s) => s.vouchers[kind] ?? NO_ROWS);

  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [query, setQuery] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [detailed, setDetailed] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [billToPrint, setBillToPrint] = useState<VoucherRow | null>(null);

  const base: VoucherRow[] = useMemo(() => {
    if (kind === 'sales') {
      return recentSalesBills.map((b) => ({ id: `s${b.no}`, no: String(b.no), date: b.date, party: b.party, amount: b.amount, status: b.status, mode: b.mode, paid: b.paid }));
    }
    return voucherHistory[kind] ?? [];
  }, [kind]);

  const rows = useMemo(() => {
    const all = [...saved, ...base];
    return all.filter((r) => {
      const amount = Number(r.amount) || 0;
      return r.date >= from && r.date <= to
        && (!query || `${r.no} ${r.party}`.toLowerCase().includes(query.toLowerCase()))
        && (!statusFilter || r.status === statusFilter)
        && (minAmount === '' || amount >= Number(minAmount))
        && (maxAmount === '' || amount <= Number(maxAmount));
    });
  }, [saved, base, from, to, query, statusFilter, minAmount, maxAmount]);

  const net = rows.reduce((a, r) => a + r.amount, 0);
  const onRange = (f: string, t: string, _o: RangeOption) => { setFrom(f); setTo(t); setLoaded(true); };

  const columns: Column<VoucherRow>[] = [
    { key: 'no', header: 'No', sortValue: (r) => r.no, render: (r) => <span className="font-semibold text-navy">{r.no}</span> },
    { key: 'date', header: 'Date', sortValue: (r) => r.date, render: (r) => toDisplayDate(r.date) },
    { key: 'party', header: cfg.partyLabel ?? 'Name', sortValue: (r) => r.party, render: (r) => r.party },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
    ...(detailed ? (isSalesReturn ? [
      { key: 'items', header: 'Items', render: (r: VoucherRow) => r.lines?.filter((line) => line.name).map((line) => line.name).join(', ') || '—' },
      { key: 'extra', header: 'Return details', render: (r: VoucherRow) => r.extra || '—' },
    ] : isQuotation ? [
      { key: 'items', header: 'Items', render: (r: VoucherRow) => r.lines?.filter((line) => line.name).map((line) => line.name).join(', ') || '—' },
      { key: 'terms', header: 'Terms / Agent', render: (r: VoucherRow) => r.extra || '—' },
    ] : isSalesOrder ? [
      { key: 'items', header: 'Items', render: (r: VoucherRow) => r.lines?.filter((line) => line.name).map((line) => `${line.name} × ${line.qty}`).join(', ') || '—' },
      { key: 'orderDetails', header: 'Order details', render: (r: VoucherRow) => r.extra || '—' },
    ] : isPurchaseRegister || isPurchaseOrderRegister ? [
      { key: 'items', header: 'Items', render: (r: VoucherRow) => r.lines?.filter((line) => line.name).map((line) => `${line.name} × ${line.qty}`).join(', ') || '—' },
      { key: 'purchaseDetails', header: isPurchaseOrderRegister ? 'Order details' : 'Supplier invoice / details', render: (r: VoucherRow) => r.extra || '—' },
    ] : [
      { key: 'mode', header: 'Payment', render: (r: VoucherRow) => r.mode ?? '—' },
      { key: 'paid', header: 'Paid', align: 'right' as const, sortValue: (r: VoucherRow) => r.paid ?? 0, render: (r: VoucherRow) => formatINR(r.paid ?? 0) },
      { key: 'balance', header: 'Balance', align: 'right' as const, sortValue: (r: VoucherRow) => Math.max(0, r.amount - (r.paid ?? 0)), render: (r: VoucherRow) => formatINR(Math.max(0, r.amount - (r.paid ?? 0))) },
    ]) : []),
    ...(cfg.stockOnly ? [] : [{ key: 'amount', header: 'Amount', align: 'right' as const, sortValue: (r: VoucherRow) => r.amount, render: (r: VoucherRow) => formatINR(r.amount) }]),
  ];

  const exportCols = [
    { key: 'no', label: 'No' }, { key: 'date', label: 'Date' }, { key: 'party', label: cfg.partyLabel ?? 'Name' },
    { key: 'status', label: 'Status' },
      ...(detailed && isSalesReturn
        ? [{ key: 'items', label: 'Items' }, { key: 'extra', label: 'Return details' }]
        : detailed && isQuotation
          ? [{ key: 'items', label: 'Items' }, { key: 'extra', label: 'Terms / Agent' }]
        : detailed && isSalesOrder
          ? [{ key: 'items', label: 'Items' }, { key: 'extra', label: 'Order details' }]
        : detailed && (isPurchaseRegister || isPurchaseOrderRegister)
          ? [{ key: 'items', label: 'Items' }, { key: 'extra', label: isPurchaseOrderRegister ? 'Order details' : 'Supplier invoice / details' }]
        : detailed ? [{ key: 'mode', label: 'Payment' }, { key: 'paid', label: 'Paid' }] : []),
    { key: 'amount', label: 'Amount' },
    ];
    const exportRows = rows.map((row) => ({
      ...row,
      items: row.lines?.filter((line) => line.name)
        .map((line) => isSalesOrder || isPurchaseRegister || isPurchaseOrderRegister ? `${line.name} × ${line.qty}` : line.name)
        .join(', ') ?? '',
    }));

  const isBillKind = ['sales', 'sales-return', 'quotation', 'sales-order', 'delivery-challan', 'purchase-bill', 'purchase-order', 'purchase-return', 'credit-note', 'debit-note'].includes(kind);
  const newPath = `/entry/${cfg.displayPath.split('/')[2]}/create`;
  const loadedSavedIds = new Set(rows.filter((row) => saved.some((entry) => entry.id === row.id)).map((row) => row.id));
  const clearLoadedSaved = () => useDemoStore.setState((state) => ({
    vouchers: { ...state.vouchers, [kind]: (state.vouchers[kind] ?? []).filter((row) => !loadedSavedIds.has(row.id)) },
  }));
  const selectedRow = rows.find((row) => row.id === selected);
  const quickStatuses = [...new Set([...saved, ...base].map((row) => row.status))];
  const resetAdvanced = () => { setStatusFilter(''); setMinAmount(''); setMaxAmount(''); };
  useHotkeys(isPurchaseRegister || isPurchaseOrderRegister ? {
    PageUp: () => { setFrom((value) => addDays(value, -1)); setTo((value) => addDays(value, -1)); },
    PageDown: () => { setFrom((value) => addDays(value, 1)); setTo((value) => addDays(value, 1)); },
    Escape: () => navigate('/'),
  } : {});
  const printSelectedBill = () => {
    document.body.classList.add('print-selected-bill');
    window.addEventListener('afterprint', () => document.body.classList.remove('print-selected-bill'), { once: true });
    window.print();
    window.setTimeout(() => document.body.classList.remove('print-selected-bill'), 1500);
  };
  const makeSelectedQuotationBill = () => {
    if (!selectedRow) {
      toast({ tone: 'warning', title: 'Select a quotation first' });
      return;
    }
    if (!selectedRow.lines?.length) {
      toast({ tone: 'warning', title: 'Quotation has no saved item details', message: 'Create a new quotation with items, then use Make Bill.' });
      return;
    }
    const readTerm = (label: string) => {
      const match = selectedRow.extra?.match(new RegExp(`(?:^| · )${label}: (\\d+)`));
      return match ? Number(match[1]) : 0;
    };
    const throughTerm = selectedRow.extra?.split(' · ').find((term) => term.startsWith('Through: '));
    const transfer: QuotationTransfer = {
      date: selectedRow.date,
      type: selectedRow.status === 'Credit' ? 'Credit' : 'Cash',
      partyName: selectedRow.party,
      state: '33 - Tamil Nadu',
      gstin: '',
      address1: '',
      address2: '',
      address3: '',
      cell: '',
      through: throughTerm?.slice('Through: '.length) ?? '',
      priceMode: 'rate',
      creditDays: readTerm('Credit days'),
      cashDiscountDays: readTerm('CD days'),
      cashDiscountPct: readTerm('CD') || Number(selectedRow.extra?.match(/(?:^| · )CD: ([\d.]+)%/)?.[1] ?? 0),
      lines: selectedRow.lines,
    };
    navigate('/entry/sales/create', { state: { quotation: transfer } });
  };

  return (
    <>
      <PageHeader variant="bill" title={isPurchaseOrderRegister ? 'Purchase Order Display' : isPurchaseRegister ? 'Purchase Display' : `${cfg.title} Display`} shortcuts="Select a row · PgUp / PgDn = dates · Refresh = reload · Esc = dashboard" />
      <div className="mt-3 space-y-3">
        {kind !== 'sales' && !isDedicatedRegister && <DemoNotice />}
        <Panel bodyClassName="p-3 sm:p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <DateRange from={from} to={to} onChange={onRange} />
            <div className="flex flex-wrap items-end gap-2">
              {!isDedicatedRegister && <input className="input input-sm w-56" placeholder={`Search no / ${cfg.partyLabel?.toLowerCase() ?? 'name'}`} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search register" />}
              {!isDedicatedRegister && <Button size="sm" variant="navy" icon={<RefreshCw className="h-4 w-4" />} onClick={() => { setLoaded(true); toast({ tone: 'info', title: 'Refreshed', message: `${rows.length} record(s) in range.` }); }}>Refresh</Button>}
              {!isDedicatedRegister && <Button size="sm" variant="outline" icon={<Filter className="h-4 w-4" />} onClick={() => setAdvancedOpen(true)}>Advanced{statusFilter || minAmount || maxAmount ? ' · Active' : ''}</Button>}
            </div>
          </div>
        </Panel>

        <Panel flush title={isDedicatedRegister ? undefined : `${cfg.title} register`} actions={isDedicatedRegister ? undefined : <div className="flex items-center gap-2">
          {kind === 'sales' && <div className="inline-flex rounded-full border border-steel-200 bg-steel-100 p-0.5">
            <button type="button" className={`rounded-full px-3 py-1 text-xs font-semibold ${!detailed ? 'bg-fiery text-white shadow-sm' : 'text-slate-600'}`} onClick={() => setDetailed(false)}>Normal view</button>
            <button type="button" className={`rounded-full px-3 py-1 text-xs font-semibold ${detailed ? 'bg-fiery text-white shadow-sm' : 'text-slate-600'}`} onClick={() => setDetailed(true)}>Detailed view</button>
          </div>}
          {!isPurchaseRegister && !isPurchaseOrderRegister && <span className="text-xs text-slate-500">{rows.length} record(s)</span>}
        </div>}>
          {isDedicatedRegister && rows.length === 0 ? (
            <div className="flex min-h-[48vh] items-center justify-center">
              <EmptyState title={isPurchaseOrderRegister
                ? `No orders from ${toDisplayDate(from)} to ${toDisplayDate(to)}.`
                : isPurchaseRegister ? `No purchases from ${toDisplayDate(from)} to ${toDisplayDate(to)}.`
                : `No ${isQuotation ? 'quotations' : isSalesOrder ? 'orders' : 'returns'} from ${toDisplayDate(from)} to ${toDisplayDate(to)}.`} />
            </div>
          ) : (
            <DataTable<VoucherRow>
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              onRowClick={(r) => setSelected(r.id)}
              selectedKey={selected}
              pageSize={kind === 'sales' || isDedicatedRegister ? 50 : 10}
              emptyTitle={`No ${cfg.title.toLowerCase()}s from ${toDisplayDate(from)} to ${toDisplayDate(to)}`}
              emptyMessage="Change the date range or create a new entry."
              footer={cfg.stockOnly ? undefined : (
                <tr><td colSpan={columns.length - 1}>Net total</td><td className="num">{formatINR(net)}</td></tr>
              )}
              caption={`${cfg.title} display`}
            />
          )}
        </Panel>

        {isDedicatedRegister && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-navy">
            <span>{isPurchaseOrderRegister || isSalesOrder ? 'Orders' : isPurchaseRegister ? 'Purchases' : isQuotation ? 'Quotations' : 'Returns'}: {rows.length} · {toDisplayDate(from)}</span>
            <span className="rounded-md bg-steel-100 px-2.5 py-1">Net Total {formatINR(net)}</span>
            {(isPurchaseRegister || isPurchaseOrderRegister) && (
              <div className="ml-auto inline-flex rounded-full border border-steel-200 bg-white p-0.5">
                <button type="button" aria-pressed={!detailed} className={`rounded-full px-3 py-1 text-xs font-semibold ${!detailed ? 'bg-fiery text-white shadow-sm' : 'text-slate-600'}`} onClick={() => setDetailed(false)}>Normal view</button>
                <button type="button" aria-pressed={detailed} className={`rounded-full px-3 py-1 text-xs font-semibold ${detailed ? 'bg-fiery text-white shadow-sm' : 'text-slate-600'}`} onClick={() => setDetailed(true)}>Detailed view</button>
              </div>
            )}
          </div>
        )}

        <div className="no-print flex flex-wrap items-center gap-2 rounded-xl border border-[#e3d6bd] bg-white p-2.5 shadow-panel">
          <Button size="sm" variant="outline" icon={<RefreshCw className="h-4 w-4" />} onClick={() => {
            setLoaded(true);
            toast({ tone: 'info', title: 'Refreshed', message: `${rows.length} ${isQuotation ? 'quotation' : isSalesOrder || isPurchaseOrderRegister ? 'order' : 'record'}(s) in range.` });
          }}>Refresh</Button>
          <ExportBar
            filename={`${cfg.title.replace(/\s+/g, '_')}_${from}_${to}`}
            columns={exportCols}
            rows={exportRows as unknown as Record<string, unknown>[]}
            showWhatsApp={isBillKind}
            printLabel={isDedicatedRegister ? 'Print A4' : 'Print'}
          />
          {(kind === 'sales' || isSpecialRegister || isPurchaseRegister || isPurchaseOrderRegister) && <Button size="sm" variant="navy" icon={<Printer className="h-4 w-4" />} disabled={!selectedRow} onClick={() => selectedRow && setBillToPrint(selectedRow)}>Bill Print</Button>}
          {isBillKind && !isDedicatedRegister && <Button size="sm" variant="outline" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Print A4</Button>}
          {(kind === 'delivery-challan' || kind === 'sales' || isSpecialRegister || isPurchaseRegister || isPurchaseOrderRegister) && <Button size="sm" variant="outline" onClick={() => toast({ tone: 'warning', title: 'E-waybill not connected', message: 'E-waybill generation requires a GST-connected provider; no data was sent.' })}>E-waybill</Button>}
          {isSpecialRegister && (
            <>
              <div className="inline-flex rounded-full border border-steel-200 bg-steel-100 p-0.5">
                <button type="button" aria-pressed={!detailed} className={`rounded-full px-3 py-1 text-xs font-semibold ${!detailed ? 'bg-fiery text-white shadow-sm' : 'text-slate-600'}`} onClick={() => setDetailed(false)}>Normal view</button>
                <button type="button" aria-pressed={detailed} className={`rounded-full px-3 py-1 text-xs font-semibold ${detailed ? 'bg-fiery text-white shadow-sm' : 'text-slate-600'}`} onClick={() => setDetailed(true)}>Detailed view</button>
              </div>
            </>
          )}
          {(isPurchaseRegister || isPurchaseOrderRegister) && <Button size="sm" variant="outline" icon={<Filter className="h-4 w-4" />} onClick={() => setAdvancedOpen(true)}>Advanced{statusFilter || minAmount || maxAmount || query ? ' · Active' : ''}</Button>}
          {isQuotation && <Button size="sm" variant="steel" icon={<FilePlus className="h-4 w-4" />} disabled={!selectedRow} onClick={makeSelectedQuotationBill}>Make Bill</Button>}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button size="sm" variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => navigate(newPath)}>New {isSalesReturn ? 'Return' : isSalesOrder || isPurchaseOrderRegister ? 'Order' : isPurchaseRegister ? 'Purchase' : cfg.title}</Button>
            <Button size="sm" variant="outline" icon={<XCircle className="h-4 w-4" />} onClick={() => setSelected(null)}>Cancel</Button>
            <Button size="sm" variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmDelete(true)} disabled={!loadedSavedIds.size}>Delete Loaded</Button>
          </div>
        </div>
        {kind === 'sales' && <p className="text-xs text-slate-500">Bills: {rows.length} · {toDisplayDate(from)} – {toDisplayDate(to)} · Net total {formatINR(net)} · {selectedRow ? `Selected bill ${selectedRow.no}` : 'Select a bill row to print it.'}</p>}
        {!loaded && !isDedicatedRegister && <p className="text-xs text-slate-500">Showing today&apos;s records. Adjust the dates, then press Refresh to reload.</p>}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        tone="danger"
        title="Delete loaded records?"
        message={`This removes ${loadedSavedIds.size} session record(s) currently loaded by the selected dates and filters. Sample register rows are not affected.`}
        confirmLabel="Delete loaded"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => { clearLoadedSaved(); setSelected(null); setConfirmDelete(false); toast({ tone: 'success', title: 'Loaded session records deleted' }); }}
      />

      <Modal open={advancedOpen} onClose={() => setAdvancedOpen(false)} title="Advanced register filters" width="max-w-xl"
        footer={<><Button variant="outline" onClick={() => { resetAdvanced(); setAdvancedOpen(false); }}>Clear filters</Button><Button variant="primary" onClick={() => { setLoaded(true); setAdvancedOpen(false); }}>Apply filters</Button></>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Status"><SelectInput value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All statuses</option>{quickStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</SelectInput></Field>
          <Field label={`${isPurchaseRegister || isPurchaseOrderRegister ? 'Supplier' : cfg.partyLabel ?? 'Customer'} / party`}><TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or bill number" /></Field>
          <Field label="Minimum amount (₹)"><TextInput type="number" min={0} value={minAmount} onChange={(event) => setMinAmount(event.target.value)} placeholder="No minimum" /></Field>
          <Field label="Maximum amount (₹)"><TextInput type="number" min={0} value={maxAmount} onChange={(event) => setMaxAmount(event.target.value)} placeholder="No maximum" /></Field>
        </div>
      </Modal>

      <Modal open={!!billToPrint} onClose={() => setBillToPrint(null)} title={`${cfg.title} · ${billToPrint?.no ?? ''}`} width="max-w-lg"
        footer={<><Button variant="outline" onClick={() => setBillToPrint(null)}>Close</Button><Button variant="navy" icon={<Printer className="h-4 w-4" />} onClick={printSelectedBill}>Print bill</Button></>}>
        {billToPrint && (
          <div className="bill-print-content">
            {billToPrint.lines?.length ? (
              <InvoicePreview data={{
                companyName: 'Blooms Retail Pvt Ltd', companyAddress: '12, Anna Salai, Chennai - 600002', companyGstin: '33AAACB1234F1Z5',
                billTitle: cfg.title, billNo: billToPrint.no, date: billToPrint.date, partyName: billToPrint.party, note: billToPrint.extra,
                lines: billToPrint.lines, totals: computeTotals(billToPrint.lines, null, false),
                payMode: billToPrint.mode, paid: billToPrint.paid,
              }} />
            ) : (
              <div className="print-area mx-auto max-w-md space-y-4 rounded-lg border border-cream-200 bg-white p-5 text-sm">
                <div className="border-b border-cream-200 pb-3 text-center"><h2 className="text-lg font-bold text-navy">Blooms Retail Pvt Ltd</h2><p className="font-semibold text-maroon">{cfg.title}</p></div>
                <dl className="grid grid-cols-2 gap-2"><dt className="text-slate-500">No.</dt><dd className="text-right font-semibold">{billToPrint.no}</dd><dt className="text-slate-500">Date</dt><dd className="text-right font-semibold">{toDisplayDate(billToPrint.date)}</dd><dt className="text-slate-500">{isPurchaseRegister || isPurchaseOrderRegister ? 'Supplier' : 'Customer'}</dt><dd className="text-right font-semibold">{billToPrint.party}</dd>
                  {isSalesReturn
                    ? <><dt className="text-slate-500">Return details</dt><dd className="text-right font-semibold">{billToPrint.extra || '—'}</dd></>
                    : isQuotation
                      ? <><dt className="text-slate-500">Terms / Agent</dt><dd className="text-right font-semibold">{billToPrint.extra || '—'}</dd></>
                    : isSalesOrder
                      ? <><dt className="text-slate-500">Order details</dt><dd className="text-right font-semibold">{billToPrint.extra || '—'}</dd></>
                    : isPurchaseOrderRegister
                      ? <><dt className="text-slate-500">Order details</dt><dd className="text-right font-semibold">{billToPrint.extra || '—'}</dd></>
                    : <><dt className="text-slate-500">Payment</dt><dd className="text-right font-semibold">{billToPrint.mode ?? billToPrint.status}</dd><dt className="text-slate-500">Paid</dt><dd className="text-right font-semibold">{formatINR(billToPrint.paid ?? (billToPrint.status === 'Paid' ? billToPrint.amount : 0))}</dd></>}
                </dl>
                <div className="flex justify-between border-t border-cream-200 pt-3 text-base font-bold text-navy"><span>Net amount</span><span>{formatINR(billToPrint.amount)}</span></div>
                <p className="text-center text-xs text-slate-500">This demo register row does not include item-level details.</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

export const defaultDisplayRange = () => ({ from: addDays(todayISO(), -30), to: todayISO() });
