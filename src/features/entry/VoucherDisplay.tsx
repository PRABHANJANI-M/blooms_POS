import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Filter, XCircle, Trash2, Printer, FilePlus, Copy, Ban, SlidersHorizontal, MessageCircle, FilePlus2 } from 'lucide-react';
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
  const isVoucherRegister = kind === 'voucher';
  const isSalesReturn = kind === 'sales-return';
  const isQuotation = kind === 'quotation';
  const isSalesOrder = kind === 'sales-order';
  const isPurchaseRegister = kind === 'purchase-bill';
  const isPurchaseOrderRegister = kind === 'purchase-order';
  const isStockJournal = kind === 'stock-journal';
  const isPurchaseReturn = kind === 'purchase-return';
  const isSpecialRegister = isSalesReturn || isPurchaseReturn || isQuotation || isSalesOrder;
  const isDedicatedRegister = isSpecialRegister || isPurchaseRegister || isPurchaseOrderRegister;
  const navigate = useNavigate();
  const toast = useAppStore((s) => s.toast);
  const saved = useDemoStore((s) => s.vouchers[kind] ?? NO_ROWS);
  const removeVoucher = useDemoStore((s) => s.removeVoucher);
  const upsertVoucher = useDemoStore((s) => s.upsertVoucher);

  const [from, setFrom] = useState(() => isVoucherRegister ? `${todayISO().slice(0, 7)}-01` : todayISO());
  const [to, setTo] = useState(todayISO());
  const [query, setQuery] = useState('');
  const [loaded, setLoaded] = useState(isVoucherRegister);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [detailed, setDetailed] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [billToPrint, setBillToPrint] = useState<VoucherRow | null>(null);
  const [voucherPrintMode, setVoucherPrintMode] = useState<'voucher' | 'cheque'>('voucher');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [hiddenVoucherColumns, setHiddenVoucherColumns] = useState<string[]>(['Series']);

  const base: VoucherRow[] = useMemo(() => {
    if (kind === 'sales') {
      return recentSalesBills.map((b) => ({ id: `s${b.no}`, no: String(b.no), date: b.date, party: b.party, amount: b.amount, status: b.status, mode: b.mode, paid: b.paid }));
    }
    return voucherHistory[kind] ?? [];
  }, [kind]);

  const rows = useMemo(() => {
    const all = isVoucherRegister
      ? [...new Map([...base, ...saved].map((row) => [row.id, row])).values()].filter((row) => !row.deleted)
      : [...saved, ...base];
    return all.filter((r) => {
      const amount = Number(r.amount) || 0;
      return r.date >= from && r.date <= to
        && (!query || `${r.no} ${r.party}`.toLowerCase().includes(query.toLowerCase()))
        && (!statusFilter || (kind === 'voucher' && statusFilter === 'Cancelled' ? r.cancelled === true : r.status === statusFilter))
        && (minAmount === '' || amount >= Number(minAmount))
        && (maxAmount === '' || amount <= Number(maxAmount));
    });
  }, [isVoucherRegister, kind, saved, base, from, to, query, statusFilter, minAmount, maxAmount]);

  const net = rows.reduce((a, r) => a + r.amount, 0);
  const onRange = (f: string, t: string, _o: RangeOption) => { setFrom(f); setTo(t); setLoaded(true); };
  const setVoucherRange = (f: string, t: string, _o: RangeOption) => { setFrom(f); setTo(t); };

  const columns: Column<VoucherRow>[] = [
    { key: 'no', header: 'No', sortValue: (r) => r.no, render: (r) => <span className="font-semibold text-navy">{r.no}</span> },
    { key: 'date', header: 'Date', sortValue: (r) => r.date, render: (r) => toDisplayDate(r.date) },
    { key: 'party', header: cfg.partyLabel ?? 'Name', sortValue: (r) => r.party, render: (r) => r.party },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
    ...(detailed ? (isStockJournal ? [
      { key: 'stockMovements', header: 'Stock movements', render: (r: VoucherRow) => r.stockJournalLines?.map((line) => `${line.name} · +${line.addQty} / -${line.lessQty} · ${line.currentStock} → ${line.currentStock + line.addQty - line.lessQty}`).join(', ') || '—' },
      { key: 'narration', header: 'Narration', render: (r: VoucherRow) => r.extra || '—' },
    ] : isSalesReturn || isPurchaseReturn ? [
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
      ...(detailed && isStockJournal
        ? [{ key: 'stockMovements', label: 'Stock movements' }, { key: 'narration', label: 'Narration' }]
        : detailed && (isSalesReturn || isPurchaseReturn)
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
      items: isStockJournal
        ? row.stockJournalLines?.map((line) => `${line.name} · +${line.addQty} / -${line.lessQty}`).join(', ') ?? ''
        : row.lines?.filter((line) => line.name)
          .map((line) => isSalesOrder || isPurchaseRegister || isPurchaseOrderRegister || isPurchaseReturn ? `${line.name} × ${line.qty}` : line.name)
          .join(', ') ?? '',
      stockMovements: row.stockJournalLines?.map((line) => `${line.name} · +${line.addQty} / -${line.lessQty}`).join(', ') ?? '',
      narration: row.extra ?? '',
    }));

  const isBillKind = ['sales', 'sales-return', 'quotation', 'sales-order', 'delivery-challan', 'purchase-bill', 'purchase-order', 'purchase-return', 'credit-note', 'debit-note'].includes(kind);
  const newPath = `/entry/${cfg.displayPath.split('/')[2]}/create`;
  const loadedSavedIds = new Set(rows.filter((row) => saved.some((entry) => entry.id === row.id)).map((row) => row.id));
  const clearLoadedSaved = () => useDemoStore.setState((state) => ({
    vouchers: { ...state.vouchers, [kind]: (state.vouchers[kind] ?? []).filter((row) => !loadedSavedIds.has(row.id)) },
  }));
  const selectedRow = rows.find((row) => row.id === selected);
  const quickStatuses = [...new Set([...saved, ...base].map((row) => row.status))];
  if (isVoucherRegister && [...saved, ...base].some((row) => row.cancelled)) quickStatuses.push('Cancelled');
  const billSundryMatch = isPurchaseReturn
    ? billToPrint?.extra?.match(/Bill sundry: (.+?) ([\d,]+\.\d{2})$/)
    : null;
  const billPrintTotals = billToPrint?.lines
    ? computeTotals(
      billToPrint.lines,
      billSundryMatch ? {
        label: billSundryMatch[1],
        pct: 0,
        amount: Number(billSundryMatch[2].replace(/,/g, '')),
        amountMode: 'fixed',
        percentageBase: 'afterTax',
      } : null,
      false,
    )
    : null;
  const resetAdvanced = () => { setStatusFilter(''); setMinAmount(''); setMaxAmount(''); };
  useHotkeys(isVoucherRegister ? {
    'Alt+O': () => setAdvancedOpen(true),
    PageUp: () => { setFrom((value) => addDays(value, -1)); setTo((value) => addDays(value, -1)); },
    PageDown: () => { setFrom((value) => addDays(value, 1)); setTo((value) => addDays(value, 1)); },
    Escape: () => navigate('/'),
  } : isPurchaseRegister || isPurchaseOrderRegister ? {
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

  const voucherColumns: Column<VoucherRow>[] = [
    { key: 'no', header: 'No.', sortValue: (row: VoucherRow) => row.no, render: (row: VoucherRow) => <span className="font-semibold text-navy">{row.no}</span> },
    { key: 'date', header: 'Date', sortValue: (row: VoucherRow) => row.date, render: (row: VoucherRow) => toDisplayDate(row.date) },
    { key: 'type', header: 'Type', sortValue: (row: VoucherRow) => row.status, render: (row: VoucherRow) => row.status },
    { key: 'series', header: 'Series', render: (row: VoucherRow) => row.series || '—' },
    { key: 'party', header: 'Particulars', sortValue: (row: VoucherRow) => row.party, render: (row: VoucherRow) => row.party },
    ...(detailed ? [{
      key: 'entries',
      header: 'Ledger entries',
      render: (row: VoucherRow) => row.voucherEntries?.map((entry) => `${entry.account} · Dr ${formatINR(entry.debit)} · Cr ${formatINR(entry.credit)}`).join(' | ') || 'No saved ledger details',
    }] : []),
    ...(detailed ? [{ key: 'narration', header: 'Narration', render: (row: VoucherRow) => row.extra?.match(/(?:^| · )Narration: ([^·]*)/)?.[1]?.trim() || '—' }] : []),
    { key: 'amount', header: 'Amount', align: 'right' as const, sortValue: (row: VoucherRow) => row.amount, render: (row: VoucherRow) => formatINR(row.amount) },
    { key: 'status', header: 'Status', render: (row: VoucherRow) => row.cancelled ? <Badge tone="red">Cancelled</Badge> : <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
  ].filter((column) => !hiddenVoucherColumns.includes(column.header));
  const voucherExportColumns = [
    { key: 'no', label: 'No.' }, { key: 'date', label: 'Date' }, { key: 'status', label: 'Type' },
    { key: 'series', label: 'Series' }, { key: 'party', label: 'Particulars' },
    ...(detailed ? [{ key: 'entries', label: 'Ledger entries' }, { key: 'narration', label: 'Narration' }] : []),
    { key: 'amount', label: 'Amount' }, { key: 'displayStatus', label: 'Status' },
  ];
  const voucherExportRows = rows.map((row) => ({
    ...row,
    entries: row.voucherEntries?.map((entry) => `${entry.account} · Dr ${formatINR(entry.debit)} · Cr ${formatINR(entry.credit)}`).join(' | ') ?? '',
    narration: row.extra?.match(/(?:^| · )Narration: ([^·]*)/)?.[1]?.trim() ?? '',
    displayStatus: row.cancelled ? 'Cancelled' : row.status,
  }));
  const toggleVoucherColumn = (column: string) => {
    if (!hiddenVoucherColumns.includes(column) && hiddenVoucherColumns.length >= 8) {
      toast({ tone: 'warning', title: 'Keep one visible column', message: 'At least one voucher column must remain visible.' });
      return;
    }
    setHiddenVoucherColumns((current) => current.includes(column) ? current.filter((item) => item !== column) : [...current, column]);
  };
  const copySelectedVoucher = () => {
    if (!selectedRow) {
      toast({ tone: 'warning', title: 'Select a voucher to copy' });
      return;
    }
    navigate('/entry/voucher/create', { state: { voucherCopy: selectedRow } });
  };
  const alterSelectedVoucher = (row = selectedRow) => {
    if (!row) {
      toast({ tone: 'warning', title: 'Select a voucher first' });
      return;
    }
    if (!saved.some((entry) => entry.id === row.id)) upsertVoucher('voucher', row);
    navigate('/entry/voucher/create', { state: { voucherId: row.id } });
  };
  const toggleSelectedCancellation = () => {
    if (!selectedRow) {
      toast({ tone: 'warning', title: 'Select a voucher first' });
      return;
    }
    const cancelled = !selectedRow.cancelled;
    upsertVoucher('voucher', { ...selectedRow, cancelled });
    toast({ tone: 'success', title: cancelled ? 'Voucher cancelled' : 'Voucher cancellation reversed', message: `${selectedRow.no} was updated for this browser session.` });
  };
  const refreshVouchers = () => {
    setLoaded(true);
    toast({ tone: 'info', title: 'Voucher display refreshed', message: `${rows.length} voucher(s) in this date range.` });
  };

  if (isVoucherRegister) {
    const visibleRows = loaded ? rows : [];
    return (
      <>
        <PageHeader
          variant="bill"
          title="Voucher Display"
          shortcuts="Select a row · Enter / double-click = alter · PgUp / PgDn = dates · Alt+O = options · Esc = close"
          actions={<div className="flex flex-wrap items-end gap-2"><DateRange from={from} to={to} onChange={setVoucherRange} /><Button size="sm" variant="outline" icon={<SlidersHorizontal className="h-4 w-4" />} onClick={() => setAdvancedOpen(true)}>Filter</Button><Button size="sm" variant="navy" icon={<Filter className="h-4 w-4" />} onClick={refreshVouchers}>Load</Button></div>}
        />
        <div className="mt-2 flex min-h-[calc(100vh-9rem)] flex-col gap-2">
          <div className="flex min-h-[42vh] flex-1 flex-col overflow-hidden rounded-xl border border-blue-200 bg-white shadow-panel">
            {visibleRows.length ? (
              <DataTable<VoucherRow>
                columns={voucherColumns}
                rows={visibleRows}
                rowKey={(row) => row.id}
                onRowClick={(row) => setSelected(row.id)}
                onRowDoubleClick={alterSelectedVoucher}
                selectedKey={selected}
                pageSize={50}
                emptyTitle={`No vouchers from ${toDisplayDate(from)} to ${toDisplayDate(to)}`}
                emptyMessage="Change the date range or create a voucher."
                footer={<tr>{voucherColumns.map((column, index) => <td key={column.key} className={column.key === 'amount' ? 'num' : ''}>{index === 0 ? `Net total · ${visibleRows.length} voucher(s)` : column.key === 'amount' ? formatINR(visibleRows.reduce((total, row) => total + row.amount, 0)) : ''}</td>)}</tr>}
                caption="Voucher display"
              />
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <EmptyState
                  title={loaded ? `No vouchers from ${toDisplayDate(from)} to ${toDisplayDate(to)}.` : 'Set the filters and press Load.'}
                  message={loaded ? 'Change the date range or create a voucher.' : 'Use the date controls above, then load the matching vouchers.'}
                  icon={<Filter className="h-7 w-7" />}
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-navy">
            <Button size="sm" variant="navy" icon={<Copy className="h-4 w-4" />} disabled={!selectedRow} onClick={copySelectedVoucher}>Insert Voucher Copy</Button>
            <span className="text-slate-500">Current Record: {selectedRow?.no ?? '—'}</span>
            <div className="ml-auto inline-flex rounded-full border border-steel-200 bg-white p-0.5">
              <button type="button" aria-pressed={!detailed} className={`rounded-full px-3 py-1 text-xs font-semibold ${!detailed ? 'bg-[#c42c9a] text-white shadow-sm' : 'text-slate-600'}`} onClick={() => setDetailed(false)}>Normal view</button>
              <button type="button" aria-pressed={detailed} className={`rounded-full px-3 py-1 text-xs font-semibold ${detailed ? 'bg-[#c42c9a] text-white shadow-sm' : 'text-slate-600'}`} onClick={() => setDetailed(true)}>Detailed view</button>
            </div>
          </div>

          <div className="no-print flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-white/90 p-2 shadow-panel">
            <ExportBar filename={`Voucher_${from}_${to}`} columns={voucherExportColumns} rows={voucherExportRows as unknown as Record<string, unknown>[]} printLabel="Print A4" />
            <Button size="sm" variant="navy" icon={<RefreshCw className="h-4 w-4" />} onClick={refreshVouchers}>Refresh</Button>
            <Button size="sm" variant="navy" icon={<Printer className="h-4 w-4" />} disabled={!selectedRow} onClick={() => { setVoucherPrintMode('voucher'); setBillToPrint(selectedRow ?? null); }}>Voucher Print</Button>
            <Button size="sm" variant="success" icon={<MessageCircle className="h-4 w-4" />} disabled={!selectedRow} onClick={() => toast({ tone: 'warning', title: 'WhatsApp / SMS not connected', message: 'Connect a messaging provider under Features → W/A - SMS to send voucher messages.' })}>WhatsApp / SMS</Button>
            <Button size="sm" variant="outline" icon={<Printer className="h-4 w-4" />} disabled={!selectedRow || selectedRow.status !== 'Payment'} onClick={() => { setVoucherPrintMode('cheque'); setBillToPrint(selectedRow ?? null); }}>Cheque Print</Button>
            <Button size="sm" variant="outline" icon={<FilePlus className="h-4 w-4" />} disabled={!selectedRow} onClick={() => alterSelectedVoucher()}>Open / Alter</Button>
            <Button size="sm" variant="primary" icon={<FilePlus2 className="h-4 w-4" />} onClick={() => navigate('/entry/voucher/create')}>New Voucher</Button>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button size="sm" variant="danger" icon={<Trash2 className="h-4 w-4" />} disabled={!selectedRow} onClick={() => setConfirmDelete(true)}>Delete</Button>
              <Button size="sm" variant={selectedRow?.cancelled ? 'success' : 'outline'} icon={<Ban className="h-4 w-4" />} disabled={!selectedRow} onClick={toggleSelectedCancellation}>{selectedRow?.cancelled ? 'Un-cancel' : 'Cancel'}</Button>
              <Button size="sm" variant="outline" icon={<SlidersHorizontal className="h-4 w-4" />} onClick={() => setOptionsOpen(true)}>Options</Button>
              <Button size="sm" variant="outline" icon={<XCircle className="h-4 w-4" />} onClick={() => navigate('/')}>Close</Button>
            </div>
          </div>
        </div>

        <ConfirmDialog
          open={confirmDelete}
          tone="danger"
          title={`Delete ${selectedRow?.no ?? 'voucher'}?`}
          message="This removes the selected voucher from the current browser session."
          confirmLabel="Delete voucher"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            if (selectedRow) {
              if (base.some((row) => row.id === selectedRow.id)) upsertVoucher('voucher', { ...selectedRow, deleted: true });
              else removeVoucher('voucher', selectedRow.id);
              setSelected(null);
              toast({ tone: 'success', title: 'Voucher deleted', message: 'The session record was removed.' });
            }
            setConfirmDelete(false);
          }}
        />

        <Modal open={advancedOpen} onClose={() => setAdvancedOpen(false)} title="Voucher filters" width="max-w-xl"
          footer={<><Button variant="outline" onClick={() => { resetAdvanced(); setAdvancedOpen(false); }}>Clear filters</Button><Button variant="primary" onClick={() => { setLoaded(true); setAdvancedOpen(false); }}>Apply filters</Button></>}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Voucher type"><SelectInput value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All types and statuses</option>{quickStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</SelectInput></Field>
            <Field label="Particulars / voucher number"><TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ledger or voucher number" /></Field>
            <Field label="Minimum amount (₹)"><TextInput type="number" min={0} value={minAmount} onChange={(event) => setMinAmount(event.target.value)} placeholder="No minimum" /></Field>
            <Field label="Maximum amount (₹)"><TextInput type="number" min={0} value={maxAmount} onChange={(event) => setMaxAmount(event.target.value)} placeholder="No maximum" /></Field>
          </div>
        </Modal>

        <Modal open={optionsOpen} onClose={() => setOptionsOpen(false)} title="Voucher display options" width="max-w-lg" footer={<Button variant="primary" onClick={() => setOptionsOpen(false)}>Done</Button>}>
          <div className="grid gap-2 sm:grid-cols-2">
            {['No.', 'Date', 'Type', 'Series', 'Particulars', 'Ledger entries', 'Narration', 'Amount', 'Status'].map((column) => (
              <label key={column} className="flex items-center gap-2 rounded-lg border border-blue-100 px-2 py-1.5 text-sm">
                <input type="checkbox" checked={!hiddenVoucherColumns.includes(column)} onChange={() => toggleVoucherColumn(column)} />{column}
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">Ledger entries and narration appear in Detailed view. Hidden columns are also excluded from the screen table.</p>
        </Modal>

        <Modal open={!!billToPrint} onClose={() => setBillToPrint(null)} title={`${voucherPrintMode === 'cheque' ? 'Cheque advice' : 'Voucher'} · ${billToPrint?.no ?? ''}`} width="max-w-lg"
          footer={<><Button variant="outline" onClick={() => setBillToPrint(null)}>Close</Button><Button variant="navy" icon={<Printer className="h-4 w-4" />} onClick={printSelectedBill}>Print</Button></>}>
          {billToPrint && (
            <div className="bill-print-content print-area mx-auto max-w-md space-y-4 rounded-lg border border-blue-100 bg-white p-5 text-sm">
              <div className="border-b border-blue-100 pb-3 text-center"><h2 className="text-lg font-bold text-navy">Blooms Retail Pvt Ltd</h2><p className="font-semibold text-maroon">{voucherPrintMode === 'cheque' ? 'Payment / Cheque Advice' : `${billToPrint.status} Voucher`}</p></div>
              <dl className="grid grid-cols-2 gap-2"><dt className="text-slate-500">Voucher No.</dt><dd className="text-right font-semibold">{billToPrint.no}</dd><dt className="text-slate-500">Date</dt><dd className="text-right font-semibold">{toDisplayDate(billToPrint.date)}</dd><dt className="text-slate-500">{voucherPrintMode === 'cheque' ? 'Pay to' : 'Particulars'}</dt><dd className="text-right font-semibold">{billToPrint.party}</dd></dl>
              {billToPrint.voucherEntries?.length ? <div className="space-y-1 border-t border-blue-100 pt-3">{billToPrint.voucherEntries.map((entry) => <div key={entry.uid} className="flex justify-between gap-3"><span>{entry.account}</span><span className="whitespace-nowrap">Dr {formatINR(entry.debit)} · Cr {formatINR(entry.credit)}</span></div>)}</div> : null}
              {billToPrint.extra && <p className="border-t border-blue-100 pt-3 text-slate-600">{billToPrint.extra}</p>}
              <div className="flex justify-between border-t border-blue-100 pt-3 text-base font-bold text-navy"><span>Amount</span><span>{formatINR(billToPrint.amount)}</span></div>
              {voucherPrintMode === 'cheque' && <p className="text-center text-xs text-slate-500">Cheque advice only. No cheque or payment is issued by this demo.</p>}
              {billToPrint.cancelled && <p className="text-center font-bold text-red-600">CANCELLED</p>}
            </div>
          )}
        </Modal>
      </>
    );
  }

  return (
    <>
      <PageHeader
        variant="bill"
        title={isPurchaseOrderRegister ? 'Purchase Order Display' : isPurchaseRegister ? 'Purchase Display' : `${cfg.title} Display`}
        shortcuts={isPurchaseReturn ? undefined : 'Select a row · PgUp / PgDn = dates · Refresh = reload · Esc = dashboard'}
        actions={isPurchaseReturn ? <DateRange from={from} to={to} onChange={onRange} /> : undefined}
      />
      <div className="mt-3 space-y-3">
        {kind !== 'sales' && !isDedicatedRegister && <DemoNotice />}
        {!isPurchaseReturn && <Panel bodyClassName="p-3 sm:p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <DateRange from={from} to={to} onChange={onRange} />
            <div className="flex flex-wrap items-end gap-2">
              {!isDedicatedRegister && <input className="input input-sm w-56" placeholder={`Search no / ${cfg.partyLabel?.toLowerCase() ?? 'name'}`} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search register" />}
              {!isDedicatedRegister && <Button size="sm" variant="navy" icon={<RefreshCw className="h-4 w-4" />} onClick={() => { setLoaded(true); toast({ tone: 'info', title: 'Refreshed', message: `${rows.length} record(s) in range.` }); }}>Refresh</Button>}
              {!isDedicatedRegister && <Button size="sm" variant="outline" icon={<Filter className="h-4 w-4" />} onClick={() => setAdvancedOpen(true)}>Advanced{statusFilter || minAmount || maxAmount ? ' · Active' : ''}</Button>}
            </div>
          </div>
        </Panel>}

        <Panel flush title={isDedicatedRegister ? undefined : `${cfg.title} register`} actions={isDedicatedRegister ? undefined : <div className="flex items-center gap-2">
          {kind === 'sales' && <div className="inline-flex rounded-full border border-steel-200 bg-steel-100 p-0.5">
            <button type="button" className={`rounded-full px-3 py-1 text-xs font-semibold ${!detailed ? 'bg-fiery text-white shadow-sm' : 'text-slate-600'}`} onClick={() => setDetailed(false)}>Normal view</button>
            <button type="button" className={`rounded-full px-3 py-1 text-xs font-semibold ${detailed ? 'bg-fiery text-white shadow-sm' : 'text-slate-600'}`} onClick={() => setDetailed(true)}>Detailed view</button>
          </div>}
          {!isPurchaseRegister && !isPurchaseOrderRegister && <span className="text-xs text-slate-500">{rows.length} record(s)</span>}
        </div>}>
          {isDedicatedRegister && rows.length === 0 ? (
            <div className={`flex items-center justify-center ${isPurchaseReturn ? 'min-h-[60vh]' : 'min-h-[48vh]'}`}>
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
            {(isPurchaseRegister || isPurchaseOrderRegister || isPurchaseReturn) && (
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
          {(isSpecialRegister || isStockJournal) && (
            <>
              <div className="inline-flex rounded-full border border-steel-200 bg-steel-100 p-0.5">
                <button type="button" aria-pressed={!detailed} className={`rounded-full px-3 py-1 text-xs font-semibold ${!detailed ? 'bg-fiery text-white shadow-sm' : 'text-slate-600'}`} onClick={() => setDetailed(false)}>Normal view</button>
                <button type="button" aria-pressed={detailed} className={`rounded-full px-3 py-1 text-xs font-semibold ${detailed ? 'bg-fiery text-white shadow-sm' : 'text-slate-600'}`} onClick={() => setDetailed(true)}>Detailed view</button>
              </div>
            </>
          )}
          {(isPurchaseRegister || isPurchaseOrderRegister || isPurchaseReturn) && <Button size="sm" variant="outline" icon={<Filter className="h-4 w-4" />} onClick={() => setAdvancedOpen(true)}>Advanced{statusFilter || minAmount || maxAmount || query ? ' · Active' : ''}</Button>}
          {isQuotation && <Button size="sm" variant="steel" icon={<FilePlus className="h-4 w-4" />} disabled={!selectedRow} onClick={makeSelectedQuotationBill}>Make Bill</Button>}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button size="sm" variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => navigate(newPath)}>New {isSalesReturn || isPurchaseReturn ? 'Return' : isSalesOrder || isPurchaseOrderRegister ? 'Order' : isPurchaseRegister ? 'Purchase' : cfg.title}</Button>
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
          <Field label={`${isPurchaseRegister || isPurchaseOrderRegister || isPurchaseReturn ? 'Supplier' : cfg.partyLabel ?? 'Customer'} / party`}><TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or bill number" /></Field>
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
                lines: billToPrint.lines, totals: billPrintTotals ?? computeTotals(billToPrint.lines, null, false),
                payMode: billToPrint.mode, paid: billToPrint.paid,
              }} />
            ) : (
              <div className="print-area mx-auto max-w-md space-y-4 rounded-lg border border-cream-200 bg-white p-5 text-sm">
                <div className="border-b border-cream-200 pb-3 text-center"><h2 className="text-lg font-bold text-navy">Blooms Retail Pvt Ltd</h2><p className="font-semibold text-maroon">{cfg.title}</p></div>
                <dl className="grid grid-cols-2 gap-2"><dt className="text-slate-500">No.</dt><dd className="text-right font-semibold">{billToPrint.no}</dd><dt className="text-slate-500">Date</dt><dd className="text-right font-semibold">{toDisplayDate(billToPrint.date)}</dd><dt className="text-slate-500">{isPurchaseRegister || isPurchaseOrderRegister || isPurchaseReturn ? 'Supplier' : 'Customer'}</dt><dd className="text-right font-semibold">{billToPrint.party}</dd>
                  {isSalesReturn || isPurchaseReturn
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
