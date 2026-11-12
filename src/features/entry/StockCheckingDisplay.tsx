import { Fragment, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, FilePlus2, FolderOpen, Pencil, RefreshCw, Search, X } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { ExportBar } from '../../components/common/ExportBar';
import { Button } from '../../components/ui/Button';
import { Field, SelectInput, TextInput } from '../../components/ui/Field';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../services/api';
import { useAppStore } from '../../store/appStore';
import { NO_ROWS, useDemoStore } from '../../store/demoStore';
import { voucherHistory } from '../../mock-data/entry';
import { addDays, todayISO, toDisplayDate } from '../../utils/date';
import { formatINR, formatMoneyPlain, formatQty, round2 } from '../../utils/money';
import type { Item, StockCheckingLine } from '../../types';

type CheckingColumn = 'Check No.' | 'Date' | 'Remarks' | 'Items' | 'Excess' | 'Shortage' | 'Add Value' | 'Less Value';
type DisplayRow = {
  key: string;
  journalId: string;
  no: string;
  date: string;
  remarks: string;
  series: string;
  lines: StockCheckingLine[];
  itemCount: number;
  excess: number;
  shortage: number;
  addValue: number;
  lessValue: number;
};
type Filters = { item: string; series: string; group: string; brand: string; barcode: string };
type ColumnFilter = { column: CheckingColumn; value: string } | null;

const columns: CheckingColumn[] = ['Check No.', 'Date', 'Remarks', 'Items', 'Excess', 'Shortage', 'Add Value', 'Less Value'];
const initialFilters: Filters = { item: '', series: 'All', group: '', brand: '', barcode: '' };
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

function getSummary(lines: StockCheckingLine[]): Pick<DisplayRow, 'itemCount' | 'excess' | 'shortage' | 'addValue' | 'lessValue'> {
  const counted = lines.filter((line) => line.countedQty !== undefined);
  const differences = counted.map((line) => round2((line.countedQty ?? 0) - line.systemQty));
  return {
    itemCount: counted.length,
    excess: round2(differences.filter((difference) => difference > 0).reduce((sum, difference) => sum + difference, 0)),
    shortage: round2(differences.filter((difference) => difference < 0).reduce((sum, difference) => sum + Math.abs(difference), 0)),
    addValue: round2(counted.reduce((sum, line) => sum + Math.max(0, (line.countedQty ?? 0) - line.systemQty) * line.rate, 0)),
    lessValue: round2(counted.reduce((sum, line) => sum + Math.max(0, line.systemQty - (line.countedQty ?? 0)) * line.rate, 0)),
  };
}

function getCellValue(row: DisplayRow, column: CheckingColumn) {
  return ({
    'Check No.': row.no,
    Date: toDisplayDate(row.date),
    Remarks: row.remarks,
    Items: formatQty(row.itemCount),
    Excess: formatQty(row.excess),
    Shortage: formatQty(row.shortage),
    'Add Value': formatMoneyPlain(row.addValue),
    'Less Value': formatMoneyPlain(row.lessValue),
  })[column];
}

function getSortValue(row: DisplayRow, column: CheckingColumn): string | number {
  if (column === 'Items') return row.itemCount;
  if (column === 'Excess') return row.excess;
  if (column === 'Shortage') return row.shortage;
  if (column === 'Add Value') return row.addValue;
  if (column === 'Less Value') return row.lessValue;
  if (column === 'Date') return row.date;
  return getCellValue(row, column);
}

export function StockCheckingDisplay() {
  const navigate = useNavigate();
  const toast = useAppStore((state) => state.toast);
  const saved = useDemoStore((state) => state.vouchers['stock-checking'] ?? NO_ROWS);
  const [from, setFrom] = useState(() => firstOfMonth(todayISO()));
  const [to, setTo] = useState(todayISO());
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [applied, setApplied] = useState<Filters>(initialFilters);
  const [detailed, setDetailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [totalRow, setTotalRow] = useState(true);
  const [hiddenColumns, setHiddenColumns] = useState<CheckingColumn[]>([]);
  const [columnWidths, setColumnWidths] = useState<Partial<Record<CheckingColumn, number>>>({});
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; column: CheckingColumn } | null>(null);
  const [columnFilter, setColumnFilter] = useState<ColumnFilter>(null);
  const resizeRef = useRef<{ column: CheckingColumn; startX: number; startWidth: number } | null>(null);
  const { data: loadedItems } = useAsync(() => api.getItems(), []);
  const items: Item[] = loadedItems ?? [];

  const baseRows = useMemo(() => voucherHistory['stock-checking'] ?? [], []);
  const allChecks = useMemo(() => {
    const savedIds = new Set(saved.map((row) => row.id));
    return [...saved, ...baseRows.filter((row) => !savedIds.has(row.id))];
  }, [saved, baseRows]);
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const seriesOptions = useMemo(() => [...new Set(allChecks.map((row) => row.series || 'Stock Check'))].sort(), [allChecks]);
  const groups = useMemo(() => [...new Set(items.map((item) => item.category).filter(Boolean))].sort(), [items]);
  const brands = useMemo(() => [...new Set(items.map((item) => item.brand).filter(Boolean))].sort(), [items]);

  const rows = useMemo(() => allChecks.flatMap((check): DisplayRow[] => {
    if (check.date < from || check.date > to) return [];
    if (applied.series !== 'All' && (check.series || 'Stock Check') !== applied.series) return [];
    let lines = check.stockCheckingLines ?? [];
    const itemQuery = applied.item.trim().toLowerCase();
    if (itemQuery) lines = lines.filter((line) => `${line.code} ${line.name}`.toLowerCase().includes(itemQuery));
    if (applied.group) lines = lines.filter((line) => line.itemId && itemById.get(line.itemId)?.category === applied.group);
    if (applied.brand) lines = lines.filter((line) => line.itemId && itemById.get(line.itemId)?.brand === applied.brand);
    if (applied.barcode.trim()) lines = lines.filter((line) =>
      (line.itemId ? itemById.get(line.itemId)?.barcode ?? '' : '').toLowerCase().includes(applied.barcode.trim().toLowerCase()),
    );
    if ((applied.item || applied.group || applied.brand || applied.barcode) && !lines.length) return [];
    return [{
      key: check.id,
      journalId: check.id,
      no: check.no,
      date: check.date,
      remarks: check.extra ?? '',
      series: check.series || 'Stock Check',
      lines,
      ...getSummary(lines),
    }];
  }), [allChecks, from, to, applied, itemById]);

  const [sort, setSort] = useState<{ column: CheckingColumn; direction: 'asc' | 'desc' } | null>(null);
  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    return [...rows].sort((a, b) => {
      const left = getSortValue(a, sort.column);
      const right = getSortValue(b, sort.column);
      const result = typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right), undefined, { numeric: true });
      return sort.direction === 'asc' ? result : -result;
    });
  }, [rows, sort]);
  const visibleRows = useMemo(() => sortedRows.filter((row) => {
    const text = `${row.no} ${row.date} ${row.remarks}`.toLowerCase();
    return (!findText || text.includes(findText.toLowerCase()))
      && (!columnFilter?.value || getCellValue(row, columnFilter.column).toLowerCase().includes(columnFilter.value.toLowerCase()));
  }), [sortedRows, findText, columnFilter]);
  const visibleColumns = columns.filter((column) => !hiddenColumns.includes(column));
  const selected = visibleRows.find((row) => row.journalId === selectedId);
  const itemCount = visibleRows.reduce((sum, row) => sum + row.itemCount, 0);
  const excess = round2(visibleRows.reduce((sum, row) => sum + row.excess, 0));
  const shortage = round2(visibleRows.reduce((sum, row) => sum + row.shortage, 0));
  const addValue = round2(visibleRows.reduce((sum, row) => sum + row.addValue, 0));
  const lessValue = round2(visibleRows.reduce((sum, row) => sum + row.lessValue, 0));

  const updateFilters = () => {
    if (from && to && from > to) {
      toast({ tone: 'warning', title: 'Invalid date range', message: 'The From date must be on or before the To date.' });
      return;
    }
    setApplied({ ...filters, item: filters.item.trim(), barcode: filters.barcode.trim() });
    setSelectedId(null);
  };
  const shiftRange = (days: number) => {
    setFrom((value) => addDays(value, days));
    setTo((value) => addDays(value, days));
  };
  const openSelected = () => {
    if (!selected || !saved.some((row) => row.id === selected.journalId)) {
      toast({ tone: 'warning', title: 'Select a saved stock check', message: 'Only stock checks saved in this browser session can be opened or altered.' });
      return;
    }
    navigate('/entry/stock-checking/create', { state: { stockCheckingId: selected.journalId } });
  };
  const openRecord = (id: string) => {
    if (saved.some((row) => row.id === id)) navigate('/entry/stock-checking/create', { state: { stockCheckingId: id } });
    else toast({ tone: 'info', title: 'Sample stock check', message: 'This example record is read-only. Create a new check to save an editable entry.' });
  };
  const toggleColumn = (column: CheckingColumn) => {
    if (!hiddenColumns.includes(column) && visibleColumns.length <= 1) {
      toast({ tone: 'warning', title: 'Keep one visible column', message: 'At least one grid column must remain visible.' });
      return;
    }
    setHiddenColumns((current) => current.includes(column) ? current.filter((entry) => entry !== column) : [...current, column]);
  };
  const openColumnMenu = (event: MouseEvent<HTMLTableCellElement>, column: CheckingColumn) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, column });
  };
  const resizeColumn = (event: PointerEvent<HTMLSpanElement>, column: CheckingColumn) => {
    event.preventDefault();
    event.stopPropagation();
    resizeRef.current = { column, startX: event.clientX, startWidth: columnWidths[column] ?? 100 };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveResize = (event: PointerEvent<HTMLSpanElement>) => {
    if (!resizeRef.current) return;
    const { column, startX, startWidth } = resizeRef.current;
    setColumnWidths((current) => ({ ...current, [column]: Math.max(58, startWidth + event.clientX - startX) }));
  };
  const sortBy = (column: CheckingColumn, direction: 'asc' | 'desc') => {
    setSort({ column, direction });
    setContextMenu(null);
  };

  const exportRows = visibleRows.map((row) => ({
    no: row.no,
    date: toDisplayDate(row.date),
    series: row.series,
    remarks: row.remarks,
    items: row.itemCount,
    excess: formatQty(row.excess),
    shortage: formatQty(row.shortage),
    addValue: formatMoneyPlain(row.addValue),
    lessValue: formatMoneyPlain(row.lessValue),
    details: row.lines.map((line) => `${line.code} ${line.name}: ${line.countedQty ?? 'not counted'}`).join('; '),
  }));
  const exportColumns = [
    { key: 'no', label: 'Check No.' }, { key: 'date', label: 'Date' }, { key: 'series', label: 'Series' },
    { key: 'remarks', label: 'Remarks' }, { key: 'items', label: 'Items Checked' }, { key: 'excess', label: 'Excess' },
    { key: 'shortage', label: 'Shortage' }, { key: 'addValue', label: 'Add Value' }, { key: 'lessValue', label: 'Less Value' },
    ...(detailed ? [{ key: 'details', label: 'Item Details' }] : []),
  ];

  return (
    <div className="stock-checking-display -mx-3 -mt-3 flex min-h-[calc(100vh-3.5rem)] flex-col gap-2 bg-[#e7f1fc] p-2 sm:-mx-4 sm:-mt-4 sm:p-2">
      <PageHeader
        variant="bill"
        title="Stock Checking Display"
        shortcuts="Select a row · Enter / double-click to open · Ctrl+F = find · Right-click heading for grid options"
        actions={
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <button type="button" className="btn btn-sm border-white/25 bg-white/10 text-white hover:bg-white/20" aria-label="Previous date range" onClick={() => shiftRange(-1)}><ChevronLeft className="h-4 w-4" /></button>
            <label className="flex items-center gap-1 text-xs font-semibold text-white">From:<TextInput type="date" compact className="w-[8.5rem] border-blue-200 bg-white text-navy" value={from} aria-label="From date" onChange={(event) => setFrom(event.target.value)} /></label>
            <label className="flex items-center gap-1 text-xs font-semibold text-white">To:<TextInput type="date" compact className="w-[8.5rem] border-blue-200 bg-white text-navy" value={to} aria-label="To date" onChange={(event) => setTo(event.target.value)} /></label>
            <button type="button" className="btn btn-sm border-white/25 bg-white/10 text-white hover:bg-white/20" aria-label="Next date range" onClick={() => shiftRange(1)}><ChevronRight className="h-4 w-4" /></button>
            <SelectInput compact className="w-28 border-blue-200 bg-white text-navy" aria-label="Quick date range" defaultValue="" onChange={(event) => {
              const range = quickRange(event.target.value);
              if (range) { setFrom(range.from); setTo(range.to); }
            }}>
              <option value="">Quick…</option><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="week">Last 7 days</option><option value="month">This month</option>
            </SelectInput>
          </div>
        }
      />

      <section className="stock-checking-display-filters flex flex-wrap items-end gap-x-2 gap-y-1 rounded-xl border border-blue-200 bg-white px-2 py-2 shadow-panel">
        <Field label="Item" className="sc-filter-item"><TextInput compact value={filters.item} placeholder="ENTRIES HAVING THIS ITEM NAME / CODE" aria-label="Filter by item" onChange={(event) => setFilters((value) => ({ ...value, item: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter') updateFilters(); }} /></Field>
        <Field label="Series" className="sc-filter-series">
          <SelectInput compact value={filters.series} aria-label="Filter by series" onChange={(event) => setFilters((value) => ({ ...value, series: event.target.value }))}>
            <option>All</option>{seriesOptions.map((series) => <option key={series}>{series}</option>)}
          </SelectInput>
        </Field>
        <Field label="Group" className="sc-filter-group">
          <SelectInput compact value={filters.group} aria-label="Filter by group" onChange={(event) => setFilters((value) => ({ ...value, group: event.target.value }))}>
            <option value="">All</option>{groups.map((group) => <option key={group}>{group}</option>)}
          </SelectInput>
        </Field>
        <Field label="Brand" className="sc-filter-brand">
          <SelectInput compact value={filters.brand} aria-label="Filter by brand" onChange={(event) => setFilters((value) => ({ ...value, brand: event.target.value }))}>
            <option value="">All</option>{brands.map((brand) => <option key={brand}>{brand}</option>)}
          </SelectInput>
        </Field>
        <Field label="Barcode" className="sc-filter-barcode"><TextInput compact value={filters.barcode} aria-label="Filter by barcode" onChange={(event) => setFilters((value) => ({ ...value, barcode: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter') updateFilters(); }} /></Field>
        <Button size="sm" variant="navy" icon={<Search className="h-4 w-4" />} onClick={updateFilters}>Show</Button>
      </section>

      <section className="min-h-[40vh] flex-1 overflow-auto rounded-xl border border-blue-200 bg-white shadow-panel" aria-label="Stock Checking register">
        {findOpen && <div className="flex items-center gap-2 border-b border-blue-100 bg-blue-50 p-2">
          <Search className="h-4 w-4 text-slate-500" />
          <TextInput autoFocus compact className="max-w-sm" value={findText} aria-label="Find in stock checks" placeholder="Find check number, date or remarks" onChange={(event) => setFindText(event.target.value)} />
          <Button size="sm" variant="outline" onClick={() => { setFindOpen(false); setFindText(''); }}>Close</Button>
        </div>}
        {visibleRows.length ? (
          <table className={`data-table stock-checking-display-table ${detailed ? 'is-detailed' : ''}`} aria-label="Stock Checking entries">
            <thead><tr>{columns.filter((column) => visibleColumns.includes(column)).map((column) => (
              <th key={column} className={['Items', 'Excess', 'Shortage', 'Add Value', 'Less Value'].includes(column) ? 'num' : ''} style={{ width: columnWidths[column] }} onContextMenu={(event) => openColumnMenu(event, column)} onClick={() => setSort((old) => old?.column === column ? { column, direction: old.direction === 'asc' ? 'desc' : 'asc' } : { column, direction: 'asc' })}>
                {column}{sort?.column === column ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ''}
                <span className="sc-column-resize" role="separator" aria-label={`Resize ${column} column`} onPointerDown={(event) => resizeColumn(event, column)} onPointerMove={moveResize} onPointerUp={() => { resizeRef.current = null; }} onClick={(event) => event.stopPropagation()} />
              </th>
            ))}{detailed && <><th>Series</th><th>Item Details</th></>}</tr></thead>
            <tbody>{visibleRows.map((row) => {
              const selectedRow = selectedId === row.journalId;
              return <Fragment key={row.key}>
                <tr className={selectedRow ? 'is-selected' : 'cursor-pointer'} onClick={() => setSelectedId(row.journalId)} onDoubleClick={() => openRecord(row.journalId)} onKeyDown={(event) => { if (event.key === 'Enter') openRecord(row.journalId); }} tabIndex={0}>
                  {visibleColumns.includes('Check No.') && <td className="font-semibold text-navy">{row.no}</td>}
                  {visibleColumns.includes('Date') && <td>{toDisplayDate(row.date)}</td>}
                  {visibleColumns.includes('Remarks') && <td className="max-w-[15rem] truncate">{row.remarks || '—'}</td>}
                  {visibleColumns.includes('Items') && <td className="num">{formatQty(row.itemCount)}</td>}
                  {visibleColumns.includes('Excess') && <td className="num font-semibold text-green-700">{formatQty(row.excess)}</td>}
                  {visibleColumns.includes('Shortage') && <td className="num font-semibold text-fiery">{formatQty(row.shortage)}</td>}
                  {visibleColumns.includes('Add Value') && <td className="num">{formatMoneyPlain(row.addValue)}</td>}
                  {visibleColumns.includes('Less Value') && <td className="num">{formatMoneyPlain(row.lessValue)}</td>}
                  {detailed && <><td>{row.series}</td><td>{row.lines.length} item(s)</td></>}
                </tr>
                {detailed && row.lines.map((line) => {
                  const summary = getSummary([line]);
                  return <tr key={`${row.key}-${line.uid}`} className="sc-detail-row" onClick={() => setSelectedId(row.journalId)}>
                    <td colSpan={visibleColumns.length + 2}>
                      {line.code} · {line.name} · Unit {line.unit || '—'} · System {formatQty(line.systemQty)} · Counted {line.countedQty === undefined ? 'not counted' : formatQty(line.countedQty)}
                      {' · '}Excess {formatQty(summary.excess)} · Shortage {formatQty(summary.shortage)} · Add {formatMoneyPlain(summary.addValue)} · Less {formatMoneyPlain(summary.lessValue)}
                    </td>
                  </tr>;
                })}
              </Fragment>;
            })}</tbody>
            {totalRow && <tfoot><tr>
              {visibleColumns.includes('Check No.') && <td>{rows.length ? 'Total' : ''} ({rows.length})</td>}
              {visibleColumns.includes('Date') && <td />}
              {visibleColumns.includes('Remarks') && <td />}
              {visibleColumns.includes('Items') && <td className="num">{formatQty(itemCount)}</td>}
              {visibleColumns.includes('Excess') && <td className="num">{formatQty(excess)}</td>}
              {visibleColumns.includes('Shortage') && <td className="num">{formatQty(shortage)}</td>}
              {visibleColumns.includes('Add Value') && <td className="num">{formatMoneyPlain(addValue)}</td>}
              {visibleColumns.includes('Less Value') && <td className="num">{formatMoneyPlain(lessValue)}</td>}
              {detailed && <><td /><td /></>}
            </tr></tfoot>}
          </table>
        ) : (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 px-4 text-center text-slate-500">
            <FolderOpen className="h-9 w-9 text-blue-300" aria-hidden />
            <p className="text-xs">No stock checks from {toDisplayDate(from)} to {toDisplayDate(to)}.</p>
            <p className="text-xs">Adjust the date range or filters, or create a new stock check.</p>
          </div>
        )}
      </section>

      <div className="no-print flex items-center justify-between gap-2 px-1 text-[0.65rem] text-slate-500">
        <span>Right-click a heading for hide / unhide, find, sort, total row, formula and export · Drag heading edge to resize · Enter / double-click opens entry · Ctrl+F finds</span>
        <div className="inline-flex rounded-full border border-blue-200 bg-white p-0.5">
          <button type="button" aria-pressed={!detailed} className={`rounded-full px-3 py-1 text-xs font-semibold ${!detailed ? 'bg-[#c42c9a] text-white shadow-sm' : 'text-slate-600'}`} onClick={() => setDetailed(false)}>Normal view</button>
          <button type="button" aria-pressed={detailed} className={`rounded-full px-3 py-1 text-xs font-semibold ${detailed ? 'bg-[#c42c9a] text-white shadow-sm' : 'text-slate-600'}`} onClick={() => setDetailed(true)}>Detailed view</button>
        </div>
      </div>
      <footer className="no-print flex flex-col gap-2 rounded-xl border border-blue-200 bg-white/70 p-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-navy">
          <span>Entries: {rows.length}</span><span className="text-slate-500">{toDisplayDate(from)} to {toDisplayDate(to)}</span>
          <SummaryPill label="Add" value={formatQty(excess)} /><SummaryPill label="Less" value={formatQty(shortage)} />
          <SummaryPill label="Add Value" value={formatINR(addValue)} /><SummaryPill label="Less Value" value={formatINR(lessValue)} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="navy" icon={<RefreshCw className="h-4 w-4" />} onClick={() => { updateFilters(); toast({ tone: 'info', title: 'Stock Checking refreshed', message: 'The register reflects the selected filters and date range.' }); }}>Refresh</Button>
          <ExportBar filename={`Stock_Checking_${from}_${to}`} columns={exportColumns} rows={exportRows} printLabel="Print A4" />
          <Button size="sm" variant="outline" icon={<Pencil className="h-4 w-4" />} disabled={!selectedId} onClick={openSelected}>Open / Alter</Button>
          <Button size="sm" variant="primary" icon={<FilePlus2 className="h-4 w-4" />} onClick={() => navigate('/entry/stock-checking/create')}>New Stock Check</Button>
          <Button size="sm" variant="outline" icon={<X className="h-4 w-4" />} onClick={() => setSelectedId(null)}>Cancel</Button>
        </div>
      </footer>

      {contextMenu && <div className="fixed z-50 w-60 rounded-lg border border-blue-200 bg-white p-2 shadow-pop" style={{ left: Math.min(contextMenu.x, window.innerWidth - 250), top: Math.min(contextMenu.y, window.innerHeight - 360) }} role="menu" aria-label="Stock Checking grid menu">
        <p className="px-2 pb-1 text-xs font-bold uppercase text-slate-500">{contextMenu.column}</p>
        <button type="button" role="menuitem" className="sc-menu-item" onClick={() => { toggleColumn(contextMenu.column); setContextMenu(null); }}>Hide this column</button>
        <button type="button" role="menuitem" className="sc-menu-item" onClick={() => { setHiddenColumns([]); setContextMenu(null); }}>Unhide all columns</button>
        <button type="button" role="menuitem" className="sc-menu-item" onClick={() => { setFindOpen(true); setContextMenu(null); }}>Find (Ctrl+F)</button>
        <button type="button" role="menuitem" className="sc-menu-item" onClick={() => setColumnFilter((current) => current?.column === contextMenu.column ? null : { column: contextMenu.column, value: '' })}>Filter this column</button>
        {columnFilter?.column === contextMenu.column && <div className="px-2 py-1">
          <TextInput compact autoFocus aria-label={`Filter ${contextMenu.column}`} placeholder={`Filter ${contextMenu.column}`} value={columnFilter.value} onChange={(event) => setColumnFilter({ column: contextMenu.column, value: event.target.value })} />
          <button type="button" className="mt-1 text-xs font-semibold text-fiery" onClick={() => setColumnFilter(null)}>Clear column filter</button>
        </div>}
        <button type="button" role="menuitem" className="sc-menu-item" onClick={() => sortBy(contextMenu.column, 'asc')}>Sort ascending</button>
        <button type="button" role="menuitem" className="sc-menu-item" onClick={() => sortBy(contextMenu.column, 'desc')}>Sort descending</button>
        <button type="button" role="menuitem" className="sc-menu-item" onClick={() => { setTotalRow((value) => !value); setContextMenu(null); }}>{totalRow ? 'Hide' : 'Show'} total row</button>
        <p className="mt-1 border-t border-slate-100 px-2 pt-2 text-[0.68rem] text-slate-500">Formula: Excess = Σ max(Counted − System, 0); Shortage = Σ max(System − Counted, 0). Export uses the current filtered register.</p>
        <button type="button" className="mt-1 w-full border-t border-slate-100 px-2 pt-2 text-left text-xs font-semibold text-navy" onClick={() => setContextMenu(null)}>Close</button>
      </div>}
      <WindowHotkeys onFind={() => { setFindOpen(true); setTimeout(() => document.querySelector<HTMLInputElement>('[aria-label="Find in stock checks"]')?.focus(), 0); }} onEnter={() => selectedId && openSelected()} />
    </div>
  );
}

function WindowHotkeys({ onFind, onEnter }: { onFind: () => void; onEnter: () => void }) {
  useEffect(() => {
    const handle = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        onFind();
      }
      if (event.key === 'Enter' && !(event.target instanceof HTMLInputElement)) onEnter();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onFind, onEnter]);
  return null;
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return <span className="rounded-md border border-blue-100 bg-white px-2 py-1 text-[0.68rem]"><span className="text-slate-500">{label}</span> <span className="text-navy">{value}</span></span>;
}
