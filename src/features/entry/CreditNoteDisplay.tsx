import { Fragment, useMemo, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, FilePlus2, ListChecks, Pencil, Printer, RefreshCw, Search, X } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { ExportBar } from '../../components/common/ExportBar';
import { Button } from '../../components/ui/Button';
import { Field, SelectInput, TextInput } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useHotkeys } from '../../hooks/useHotkeys';
import { useAppStore } from '../../store/appStore';
import { NO_ROWS, useDemoStore } from '../../store/demoStore';
import { addDays, todayISO, toDisplayDate } from '../../utils/date';
import { formatINR, formatMoneyPlain, round2 } from '../../utils/money';
import type { CreditNoteLine, VoucherRow } from '../../types';

type CreditDisplayRow = VoucherRow & { reason: string; seriesName: string };
type CreditColumn = 'No.' | 'Date' | 'Party' | 'Reason' | 'Amount' | 'Status';

const columns: CreditColumn[] = ['No.', 'Date', 'Party', 'Reason', 'Amount', 'Status'];
const firstOfMonth = (date: string) => `${date.slice(0, 7)}-01`;

function quickRange(value: string) {
  const today = todayISO();
  if (value === 'today') return { from: today, to: today };
  if (value === 'yesterday') {
    const yesterday = addDays(today, -1);
    return { from: yesterday, to: yesterday };
  }
  if (value === 'week') return { from: addDays(today, -6), to: today };
  if (value === 'month') return { from: firstOfMonth(today), to: today };
  return null;
}

function getReason(row: VoucherRow) {
  return row.extra?.match(/(?:^| · )Reason: ([^·]*)/)?.[1]?.trim() ?? '—';
}

function getDetail(row: VoucherRow, label: string) {
  return row.extra?.match(new RegExp(`(?:^| · )${label}: ([^·]*)`))?.[1]?.trim() ?? '';
}

function taxForLine(line: CreditNoteLine, interState: boolean) {
  const tax = round2(line.amount * line.gstRate / 100);
  const cgst = interState ? 0 : round2(tax / 2);
  const sgst = interState ? 0 : round2(tax - cgst);
  const igst = interState ? tax : 0;
  return { cgst, sgst, igst, total: round2(line.amount + tax) };
}

function getTaxTotals(row: VoucherRow, lines: CreditNoteLine[]) {
  const interState = getDetail(row, 'Inter-state') === 'true';
  return lines.reduce((total, line) => {
    const tax = taxForLine(line, interState);
    return {
      taxable: round2(total.taxable + line.amount),
      cgst: round2(total.cgst + tax.cgst),
      sgst: round2(total.sgst + tax.sgst),
      igst: round2(total.igst + tax.igst),
    };
  }, { taxable: 0, cgst: 0, sgst: 0, igst: 0 });
}

export function CreditNoteDisplay({ kind = 'credit-note' }: { kind?: 'credit-note' | 'debit-note' }) {
  const isDebitNote = kind === 'debit-note';
  const noteTitle = isDebitNote ? 'Debit Note' : 'Credit Note';
  const noteCollection = kind;
  const noteLineField = isDebitNote ? 'debitNoteLines' : 'creditNoteLines';
  const navigate = useNavigate();
  const toast = useAppStore((state) => state.toast);
  const saved = useDemoStore((state) => state.vouchers[noteCollection] ?? NO_ROWS);
  const [from, setFrom] = useState(() => firstOfMonth(todayISO()));
  const [to, setTo] = useState(todayISO());
  const [partyFilter, setPartyFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('All');
  const [seriesFilter, setSeriesFilter] = useState('All');
  const [applied, setApplied] = useState({ party: '', reason: 'All', series: 'All' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailed, setDetailed] = useState(false);
  const [billToPrint, setBillToPrint] = useState<CreditDisplayRow | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<CreditColumn[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; column: CreditColumn } | null>(null);
  const [sort, setSort] = useState<{ column: CreditColumn; direction: 'asc' | 'desc' } | null>(null);

  const allRows = useMemo((): CreditDisplayRow[] => saved.map((row) => ({
    ...row,
    reason: getReason(row),
    seriesName: row.series || (isDebitNote ? 'Dr Note' : 'Cr Note'),
  })), [saved, isDebitNote]);
  const reasons = useMemo(() => [...new Set(allRows.map((row) => row.reason).filter((value) => value !== '—'))].sort(), [allRows]);
  const seriesOptions = useMemo(() => [...new Set(allRows.map((row) => row.seriesName))].sort(), [allRows]);
  const filteredRows = useMemo(() => allRows.filter((row) =>
    row.date >= from && row.date <= to
    && (!applied.party || `${row.party} ${row.no} ${getDetail(row, 'GSTIN')} ${getDetail(row, 'Against invoice')}`.toLowerCase().includes(applied.party.toLowerCase()))
    && (applied.reason === 'All' || row.reason === applied.reason)
    && (applied.series === 'All' || row.seriesName === applied.series),
  ), [allRows, from, to, applied]);
  const sortedRows = useMemo(() => {
    if (!sort) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const left = sort.column === 'No.' ? a.no
        : sort.column === 'Date' ? a.date
          : sort.column === 'Party' ? a.party
            : sort.column === 'Reason' ? a.reason
              : sort.column === 'Amount' ? a.amount : a.status;
      const right = sort.column === 'No.' ? b.no
        : sort.column === 'Date' ? b.date
          : sort.column === 'Party' ? b.party
            : sort.column === 'Reason' ? b.reason
              : sort.column === 'Amount' ? b.amount : b.status;
      const result = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), undefined, { numeric: true });
      return sort.direction === 'asc' ? result : -result;
    });
  }, [filteredRows, sort]);
  const selected = sortedRows.find((row) => row.id === selectedId) ?? null;
  const net = round2(sortedRows.reduce((sum, row) => sum + row.amount, 0));
  const visibleColumns = columns.filter((column) => !hiddenColumns.includes(column));
  const updateFilters = () => {
    if (from && to && from > to) {
      toast({ tone: 'warning', title: 'Invalid date range', message: 'The From date must be on or before the To date.' });
      return;
    }
    setApplied({ party: partyFilter.trim(), reason: reasonFilter, series: seriesFilter });
    setSelectedId(null);
  };
  const shiftRange = (days: number) => {
    setFrom((value) => addDays(value, days));
    setTo((value) => addDays(value, days));
  };
  const openSelected = () => {
    if (!selected) {
      toast({ tone: 'warning', title: `Select a ${noteTitle.toLowerCase()} first`, message: 'Choose a row to open or alter.' });
      return;
    }
    navigate(`/entry/${kind}/create`, { state: { [isDebitNote ? 'debitNoteId' : 'creditNoteId']: selected.id } });
  };
  const toggleColumn = (column: CreditColumn) => {
    if (!hiddenColumns.includes(column) && visibleColumns.length <= 1) {
      toast({ tone: 'warning', title: 'Keep one visible column', message: 'At least one register column must remain visible.' });
      return;
    }
    setHiddenColumns((current) => current.includes(column) ? current.filter((entry) => entry !== column) : [...current, column]);
  };
  const showColumnMenu = (event: MouseEvent<HTMLTableCellElement>, column: CreditColumn) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, column });
  };
  const printSelected = () => {
    document.body.classList.add('print-selected-bill');
    window.addEventListener('afterprint', () => document.body.classList.remove('print-selected-bill'), { once: true });
    window.print();
    window.setTimeout(() => document.body.classList.remove('print-selected-bill'), 1500);
  };
  const openRow = (id: string) => navigate(`/entry/${kind}/create`, { state: { [isDebitNote ? 'debitNoteId' : 'creditNoteId']: id } });
  const printRows = sortedRows.map((row) => {
    const lines = row[noteLineField] ?? [];
    return {
      ...row,
      ...(detailed ? { accountDetails: lines.map((line) => `${line.account}: ${formatMoneyPlain(line.amount)} + GST ${line.gstRate}%`).join('; ') } : {}),
    };
  });
  const exportColumns = [
    { key: 'no', label: 'CN No.' }, { key: 'date', label: 'Date' }, { key: 'party', label: 'Party' },
    { key: 'reason', label: 'Reason' }, { key: 'seriesName', label: 'Series' }, { key: 'amount', label: 'Net Amount' },
    { key: 'status', label: 'Status' },
    ...(detailed ? [{ key: 'accountDetails', label: 'Account details' }, { key: 'extra', label: 'Narration / reference' }] : []),
  ];
  useHotkeys({
    'Ctrl+F': () => document.querySelector<HTMLInputElement>(`[aria-label="Filter ${noteTitle.toLowerCase()}s by party"]`)?.focus(),
    Enter: openSelected,
    PageUp: () => shiftRange(-1),
    PageDown: () => shiftRange(1),
    Escape: () => navigate('/'),
  });

  return (
    <div className="credit-note-display -mx-3 -mt-3 flex min-h-[calc(100vh-3.5rem)] flex-col gap-2 bg-[#e7f1fc] p-2 sm:-mx-4 sm:-mt-4 sm:p-2">
      <PageHeader variant="bill" title={`${noteTitle} Display`} shortcuts="Select a row · Enter / double-click = Open / Alter · Ctrl+F = Party search · PgUp / PgDn = date range · Esc = Dashboard"
        actions={<div className="flex flex-wrap items-center justify-end gap-1.5">
          <button type="button" className="btn btn-sm border-white/25 bg-white/10 text-white hover:bg-white/20" aria-label="Previous date range" onClick={() => shiftRange(-1)}><ChevronLeft className="h-4 w-4" /></button>
          <label className="flex items-center gap-1 text-xs font-semibold text-white">From:<TextInput type="date" compact className="w-[8.5rem] border-blue-200 bg-white text-navy" value={from} aria-label="From date" onChange={(event) => setFrom(event.target.value)} /></label>
          <label className="flex items-center gap-1 text-xs font-semibold text-white">To:<TextInput type="date" compact className="w-[8.5rem] border-blue-200 bg-white text-navy" value={to} aria-label="To date" onChange={(event) => setTo(event.target.value)} /></label>
          <button type="button" className="btn btn-sm border-white/25 bg-white/10 text-white hover:bg-white/20" aria-label="Next date range" onClick={() => shiftRange(1)}><ChevronRight className="h-4 w-4" /></button>
          <SelectInput compact className="w-28 border-blue-200 bg-white text-navy" aria-label="Quick date range" defaultValue="" onChange={(event) => {
            const range = quickRange(event.target.value);
            if (range) { setFrom(range.from); setTo(range.to); }
          }}><option value="">Quick…</option><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="week">Last 7 days</option><option value="month">This month</option></SelectInput>
        </div>}
      />

      <section className="credit-note-display-filters flex flex-wrap items-end gap-x-2 gap-y-1 rounded-xl border border-blue-200 bg-white px-2 py-2 shadow-panel">
        <Field label="Party" className="credit-filter-party"><TextInput compact value={partyFilter} placeholder="PARTY NAME / GSTIN / INVOICE NO" aria-label={`Filter ${noteTitle.toLowerCase()}s by party`} onChange={(event) => setPartyFilter(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') updateFilters(); }} /></Field>
        <Field label="Reason" className="credit-filter-reason"><SelectInput compact value={reasonFilter} aria-label="Filter by reason" onChange={(event) => setReasonFilter(event.target.value)}><option>All</option>{reasons.map((reason) => <option key={reason}>{reason}</option>)}</SelectInput></Field>
        <Field label="Series" className="credit-filter-series"><SelectInput compact value={seriesFilter} aria-label="Filter by series" onChange={(event) => setSeriesFilter(event.target.value)}><option>All</option>{seriesOptions.map((series) => <option key={series}>{series}</option>)}</SelectInput></Field>
        <Button size="sm" variant="navy" icon={<Search className="h-4 w-4" />} onClick={updateFilters}>Show</Button>
      </section>

      <section className="min-h-[40vh] flex-1 overflow-auto rounded-xl border border-blue-200 bg-white shadow-panel" aria-label={`${noteTitle} register`}>
        {sortedRows.length ? (
          <table className="data-table credit-note-display-table">
            <colgroup>{visibleColumns.map((column) => <col key={column} className={`credit-display-col-${column === 'No.' ? 'no' : column === 'Date' ? 'date' : column === 'Party' ? 'party' : column === 'Reason' ? 'reason' : column === 'Amount' ? 'amount' : 'status'}`} />)}</colgroup>
            <thead><tr>{visibleColumns.map((column) => <th key={column} className={column === 'Amount' ? 'num' : ''} onContextMenu={(event) => showColumnMenu(event, column)} onClick={() => setSort((old) => old?.column === column ? { column, direction: old.direction === 'asc' ? 'desc' : 'asc' } : { column, direction: 'asc' })}>
              {column}{sort?.column === column ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ''}
            </th>)}</tr></thead>
            <tbody>{sortedRows.map((row) => <Fragment key={row.id}>
              <tr className={selectedId === row.id ? 'is-selected' : 'cursor-pointer'} onClick={() => setSelectedId(row.id)} onDoubleClick={() => openRow(row.id)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); openRow(row.id); } }}>
                {visibleColumns.includes('No.') && <td className="font-semibold text-navy">{row.no}</td>}
                {visibleColumns.includes('Date') && <td>{toDisplayDate(row.date)}</td>}
                {visibleColumns.includes('Party') && <td>{row.party || '—'}</td>}
                {visibleColumns.includes('Reason') && <td>{row.reason}</td>}
                {visibleColumns.includes('Amount') && <td className="num font-semibold">{formatINR(row.amount)}</td>}
                {visibleColumns.includes('Status') && <td>{row.status || '—'}</td>}
              </tr>
              {detailed && <tr className="credit-note-detail-row"><td colSpan={visibleColumns.length}>
                <div className="credit-note-details">
                  <strong>Series: {row.seriesName}</strong>
                  {getDetail(row, 'Against invoice') && <span>Against invoice: {getDetail(row, 'Against invoice')}{getDetail(row, 'Invoice date') ? ` · ${toDisplayDate(getDetail(row, 'Invoice date'))}` : ''}</span>}
                  {row[noteLineField]?.length ? row[noteLineField]?.map((line) => {
                    const tax = taxForLine(line, getDetail(row, 'Inter-state') === 'true');
                    return <span key={line.uid}>{line.account}{line.detail ? ` · ${line.detail}` : ''} · Taxable {formatMoneyPlain(line.amount)} · CGST {formatMoneyPlain(tax.cgst)} · SGST {formatMoneyPlain(tax.sgst)} · IGST {formatMoneyPlain(tax.igst)} · Total {formatMoneyPlain(tax.total)}</span>;
                  }) : <span>No saved account line details.</span>}
                  {getDetail(row, 'Narration') && <span>Narration: {getDetail(row, 'Narration')}</span>}
                </div>
              </td></tr>}
            </Fragment>)}</tbody>
            <tfoot><tr>{visibleColumns.map((column, index) => <td key={column} className={column === 'Amount' ? 'num' : ''}>
              {index === 0 ? `Notes: ${sortedRows.length}` : column === 'Amount' ? formatINR(net) : ''}
            </td>)}</tr></tfoot>
          </table>
        ) : <div className="credit-note-empty"><div className="credit-note-empty-icon"><ListChecks className="h-7 w-7" /></div><p>No {noteTitle.toLowerCase()}s from {toDisplayDate(from)} to {toDisplayDate(to)}.</p></div>}
      </section>

      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-navy">
        <span>Notes: {sortedRows.length}<br /><span className="font-normal text-slate-500">{toDisplayDate(from)} to {toDisplayDate(to)}</span></span>
        <span className="rounded-md bg-white px-2.5 py-1 text-slate-700">Net Total {formatINR(net)}</span>
        <div className="ml-auto inline-flex rounded-full border border-steel-200 bg-white p-0.5">
          <button type="button" aria-pressed={!detailed} className={`rounded-full px-3 py-1 text-xs font-semibold ${!detailed ? 'bg-fiery text-white shadow-sm' : 'text-slate-600'}`} onClick={() => setDetailed(false)}>Normal view</button>
          <button type="button" aria-pressed={detailed} className={`rounded-full px-3 py-1 text-xs font-semibold ${detailed ? 'bg-fiery text-white shadow-sm' : 'text-slate-600'}`} onClick={() => setDetailed(true)}>Detailed view</button>
        </div>
      </div>

      <footer className="no-print flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-white/90 p-2 shadow-panel">
        <Button size="sm" variant="navy" icon={<RefreshCw className="h-4 w-4" />} onClick={() => { updateFilters(); toast({ tone: 'info', title: `${noteTitle} display refreshed`, message: `${sortedRows.length} note(s) in this range.` }); }}>Refresh</Button>
        <ExportBar filename={`${isDebitNote ? 'Debit' : 'Credit'}_Note_${from}_${to}`} columns={exportColumns} rows={printRows as unknown as Record<string, unknown>[]} showWhatsApp printLabel="Print A4" />
        <Button size="sm" variant="navy" icon={<Printer className="h-4 w-4" />} disabled={!selected} onClick={() => selected && setBillToPrint(selected)}>Bill Print</Button>
        <Button size="sm" variant="outline" icon={<Pencil className="h-4 w-4" />} disabled={!selected} onClick={openSelected}>Open / Alter</Button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" icon={<FilePlus2 className="h-4 w-4" />} onClick={() => navigate(`/entry/${kind}/create`)}>New {noteTitle}</Button>
          <Button size="sm" variant="outline" icon={<X className="h-4 w-4" />} onClick={() => setSelectedId(null)}>Cancel</Button>
        </div>
      </footer>

      {contextMenu && <div className="fixed z-50 w-48 rounded-lg border border-blue-200 bg-white p-2 shadow-pop" style={{ left: Math.min(contextMenu.x, window.innerWidth - 200), top: Math.min(contextMenu.y, window.innerHeight - 140) }} role="menu" aria-label="Credit note column menu">
        <button type="button" className="credit-menu-item" onClick={() => { toggleColumn(contextMenu.column); setContextMenu(null); }}>Hide {contextMenu.column}</button>
        <button type="button" className="credit-menu-item" onClick={() => { setHiddenColumns([]); setContextMenu(null); }}>Unhide all columns</button>
        <button type="button" className="credit-menu-item" onClick={() => setContextMenu(null)}>Close</button>
      </div>}

      <Modal open={!!billToPrint} onClose={() => setBillToPrint(null)} title={`${noteTitle} · ${billToPrint?.no ?? ''}`} width="max-w-2xl"
        footer={<><Button variant="outline" onClick={() => setBillToPrint(null)}>Close</Button><Button variant="navy" icon={<Printer className="h-4 w-4" />} onClick={printSelected}>Bill Print</Button></>}>
        {billToPrint && <div className="bill-print-content print-area mx-auto max-w-xl space-y-3 rounded-lg border border-blue-100 bg-white p-5 text-sm">
          {(() => {
            const billLines = billToPrint[noteLineField] ?? [];
            const totals = getTaxTotals(billToPrint, billLines);
            return <>
          <header className="border-b border-blue-100 pb-3 text-center"><h2 className="text-lg font-bold text-navy">Blooms Retail Pvt Ltd</h2><p className="font-semibold text-blue-700">{noteTitle}</p></header>
          <dl className="grid grid-cols-2 gap-2"><dt>Date</dt><dd className="text-right font-semibold">{toDisplayDate(billToPrint.date)}</dd><dt>{noteTitle} No.</dt><dd className="text-right font-semibold">{billToPrint.no}</dd><dt>Party</dt><dd className="text-right font-semibold">{billToPrint.party}</dd><dt>Reason</dt><dd className="text-right font-semibold">{billToPrint.reason}</dd>
            {getDetail(billToPrint, 'Against invoice') && <><dt>Against invoice</dt><dd className="text-right font-semibold">{getDetail(billToPrint, 'Against invoice')}</dd></>}
          </dl>
          <table className="data-table"><thead><tr><th>Account</th><th>Detail</th><th className="num">Taxable</th><th className="num">GST %</th><th className="num">CGST</th><th className="num">SGST</th><th className="num">IGST</th><th className="num">Total</th></tr></thead><tbody>
            {billLines.map((line) => {
              const tax = taxForLine(line, getDetail(billToPrint, 'Inter-state') === 'true');
              return <tr key={line.uid}><td>{line.account}</td><td>{line.detail || '—'}</td><td className="num">{formatMoneyPlain(line.amount)}</td><td className="num">{line.gstRate}%</td><td className="num">{formatMoneyPlain(tax.cgst)}</td><td className="num">{formatMoneyPlain(tax.sgst)}</td><td className="num">{formatMoneyPlain(tax.igst)}</td><td className="num">{formatMoneyPlain(tax.total)}</td></tr>;
            })}
          </tbody><tfoot>
            <tr><td colSpan={2}>Taxable / GST</td><td className="num">{formatMoneyPlain(totals.taxable)}</td><td />
              <td className="num">{formatMoneyPlain(totals.cgst)}</td><td className="num">{formatMoneyPlain(totals.sgst)}</td><td className="num">{formatMoneyPlain(totals.igst)}</td><td />
            </tr><tr><td colSpan={7}>Net Amount</td><td className="num">{formatINR(billToPrint.amount)}</td></tr>
          </tfoot></table>
          {getDetail(billToPrint, 'Narration') && <p>Narration: {getDetail(billToPrint, 'Narration')}</p>}
            </>;
          })()}
        </div>}
      </Modal>
    </div>
  );
}
