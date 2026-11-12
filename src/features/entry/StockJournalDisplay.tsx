import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, FilePlus2, FolderOpen, Pencil, RefreshCw, Search, X } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { ExportBar } from '../../components/common/ExportBar';
import { Field, SelectInput, TextInput } from '../../components/ui/Field';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../services/api';
import { useAppStore } from '../../store/appStore';
import { NO_ROWS, useDemoStore } from '../../store/demoStore';
import { voucherHistory } from '../../mock-data/entry';
import { addDays, todayISO, toDisplayDate } from '../../utils/date';
import { formatINR, formatMoneyPlain, formatQty, round2 } from '../../utils/money';
import type { StockJournalLine } from '../../types';

type StockJournalDisplayRow = {
  key: string;
  journalId: string;
  no: string;
  date: string;
  series: string;
  line: StockJournalLine;
  category: string;
  brand: string;
  barcode: string;
  addValue: number;
  lessValue: number;
  newStock: number;
  narration: string;
};

type JournalFilters = {
  item: string;
  series: string;
  group: string;
  brand: string;
  barcode: string;
};

const initialFilters: JournalFilters = { item: '', series: 'All', group: '', brand: '', barcode: '' };
const firstOfMonth = (date: string) => `${date.slice(0, 7)}-01`;

function getQuickRange(value: string) {
  const today = todayISO();
  if (value === 'today') return { from: today, to: today };
  if (value === 'yesterday') {
    const yesterday = addDays(today, -1);
    return { from: yesterday, to: yesterday };
  }
  if (value === 'week') return { from: addDays(today, -6), to: today };
  if (value === 'month') return { from: firstOfMonth(today), to: today };
  return { from: '', to: '' };
}

export function StockJournalDisplay() {
  const navigate = useNavigate();
  const toast = useAppStore((state) => state.toast);
  const saved = useDemoStore((state) => state.vouchers['stock-journal'] ?? NO_ROWS);
  const { data: loadedItems } = useAsync(() => api.getItems(), []);
  const items = loadedItems ?? [];
  const [from, setFrom] = useState(() => firstOfMonth(todayISO()));
  const [to, setTo] = useState(todayISO());
  const [filters, setFilters] = useState<JournalFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<JournalFilters>(initialFilters);
  const [detailed, setDetailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const baseRows = useMemo(() => voucherHistory['stock-journal'] ?? [], []);
  const allJournals = useMemo(() => {
    const savedIds = new Set(saved.map((row) => row.id));
    return [...saved, ...baseRows.filter((row) => !savedIds.has(row.id))];
  }, [saved, baseRows]);
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const availableSeries = useMemo(() => [...new Set(allJournals.map((row) => row.series || 'Stock Journal'))].sort(), [allJournals]);
  const categories = useMemo(() => [...new Set(items.map((item) => item.category).filter(Boolean))].sort(), [items]);
  const brands = useMemo(() => [...new Set(items.map((item) => item.brand).filter(Boolean))].sort(), [items]);

  const rows = useMemo(() => allJournals.flatMap((journal) => {
    if (journal.date < from || journal.date > to) return [];
    const series = journal.series || 'Stock Journal';
    if (appliedFilters.series !== 'All' && series !== appliedFilters.series) return [];
    return (journal.stockJournalLines ?? []).flatMap((line): StockJournalDisplayRow[] => {
      const item = line.itemId ? itemById.get(line.itemId) : undefined;
      const category = item?.category ?? '';
      const brand = item?.brand ?? '';
      const barcode = item?.barcode ?? '';
      const itemSearch = `${line.code} ${line.name}`.toLowerCase();
      if (appliedFilters.item && !itemSearch.includes(appliedFilters.item.trim().toLowerCase())) return [];
      if (appliedFilters.group && category !== appliedFilters.group) return [];
      if (appliedFilters.brand && brand !== appliedFilters.brand) return [];
      if (appliedFilters.barcode && !barcode.toLowerCase().includes(appliedFilters.barcode.trim().toLowerCase())) return [];
      const addValue = round2(line.addQty * line.rate);
      const lessValue = round2(line.lessQty * line.rate);
      return [{
        key: `${journal.id}-${line.uid}`,
        journalId: journal.id,
        no: journal.no,
        date: journal.date,
        series,
        line,
        category,
        brand,
        barcode,
        addValue,
        lessValue,
        newStock: round2(line.currentStock + line.addQty - line.lessQty),
        narration: journal.extra ?? '',
      }];
    });
  }), [allJournals, from, to, appliedFilters, itemById]);

  const selectedJournal = allJournals.find((journal) => journal.id === selectedId);
  const entryCount = new Set(rows.map((row) => row.journalId)).size;
  const addQty = round2(rows.reduce((sum, row) => sum + row.line.addQty, 0));
  const lessQty = round2(rows.reduce((sum, row) => sum + row.line.lessQty, 0));
  const addValue = round2(rows.reduce((sum, row) => sum + row.addValue, 0));
  const lessValue = round2(rows.reduce((sum, row) => sum + row.lessValue, 0));

  const shiftRange = (days: number) => {
    setFrom((value) => addDays(value, days));
    setTo((value) => addDays(value, days));
  };
  const showResults = () => {
    if (from && to && from > to) {
      toast({ tone: 'warning', title: 'Invalid date range', message: 'The From date must be on or before the To date.' });
      return;
    }
    setAppliedFilters({ ...filters, item: filters.item.trim(), barcode: filters.barcode.trim() });
    setSelectedId(null);
  };
  const refresh = () => {
    showResults();
    toast({ tone: 'info', title: 'Stock Journal refreshed', message: 'The register now reflects the selected filters and date range.' });
  };
  const openSelected = () => {
    if (!selectedJournal || !saved.some((row) => row.id === selectedJournal.id)) {
      toast({ tone: 'warning', title: 'Select a saved journal', message: 'Only journals saved in this browser session can be opened or altered.' });
      return;
    }
    navigate('/entry/stock-journal/create', { state: { stockJournalId: selectedJournal.id } });
  };
  const clearSelection = () => setSelectedId(null);

  const exportRows = rows.map((row) => ({
    no: row.no,
    date: toDisplayDate(row.date),
    series: row.series,
    code: row.line.code,
    item: row.line.name,
    group: row.category,
    brand: row.brand,
    barcode: row.barcode,
    unit: row.line.unit,
    currentStock: formatQty(row.line.currentStock),
    addQty: formatQty(row.line.addQty),
    lessQty: formatQty(row.line.lessQty),
    rate: formatMoneyPlain(row.line.rate),
    addValue: formatMoneyPlain(row.addValue),
    lessValue: formatMoneyPlain(row.lessValue),
    newStock: formatQty(row.newStock),
    detail: row.line.detail,
    narration: row.narration,
  }));
  const exportColumns = [
    { key: 'no', label: 'Journal No.' },
    { key: 'date', label: 'Date' },
    { key: 'series', label: 'Series' },
    { key: 'code', label: 'Code' },
    { key: 'item', label: 'Item Name' },
    { key: 'group', label: 'Group' },
    { key: 'brand', label: 'Brand' },
    { key: 'barcode', label: 'Barcode' },
    { key: 'unit', label: 'Unit' },
    { key: 'currentStock', label: 'Current Stock' },
    { key: 'addQty', label: 'Add Qty' },
    { key: 'lessQty', label: 'Less Qty' },
    { key: 'rate', label: 'Rate' },
    { key: 'addValue', label: 'Add Value' },
    { key: 'lessValue', label: 'Less Value' },
    { key: 'newStock', label: 'New Stock' },
    ...(detailed ? [{ key: 'detail', label: 'Detail' }, { key: 'narration', label: 'Narration' }] : []),
  ];

  return (
    <div className="stock-journal-display -mx-3 -mt-3 flex min-h-[calc(100vh-3.5rem)] flex-col gap-2 bg-[#e7f1fc] p-2 sm:-mx-4 sm:-mt-4 sm:p-2">
      <PageHeader
        variant="bill"
        title="Stock Journal Display"
        shortcuts="Select a row · Open / Alter to edit · New Journal to create"
        actions={
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <button type="button" className="btn btn-sm border-white/25 bg-white/10 text-white hover:bg-white/20" aria-label="Previous date range" onClick={() => shiftRange(-1)}><ChevronLeft className="h-4 w-4" /></button>
            <label className="flex items-center gap-1 text-xs font-semibold text-white">From:<TextInput type="date" compact className="w-[8.5rem] border-blue-200 bg-white text-navy" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="From date" /></label>
            <label className="flex items-center gap-1 text-xs font-semibold text-white">To:<TextInput type="date" compact className="w-[8.5rem] border-blue-200 bg-white text-navy" value={to} onChange={(event) => setTo(event.target.value)} aria-label="To date" /></label>
            <button type="button" className="btn btn-sm border-white/25 bg-white/10 text-white hover:bg-white/20" aria-label="Next date range" onClick={() => shiftRange(1)}><ChevronRight className="h-4 w-4" /></button>
            <SelectInput compact className="w-28 border-blue-200 bg-white text-navy" aria-label="Quick date range" defaultValue="" onChange={(event) => {
              const range = getQuickRange(event.target.value);
              if (range.from) {
                setFrom(range.from);
                setTo(range.to);
              }
            }}>
              <option value="">Quick…</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Last 7 days</option>
              <option value="month">This month</option>
            </SelectInput>
          </div>
        }
      />

      <section className="stock-journal-display-filters flex flex-wrap items-end gap-x-2 gap-y-1 rounded-xl border border-blue-200 bg-white px-2 py-2 shadow-panel">
        <Field label="Item" className="stock-journal-filter-item">
          <TextInput compact value={filters.item} placeholder="ENTRIES HAVING THIS ITEM NAME / CODE" aria-label="Filter by item" onChange={(event) => setFilters((value) => ({ ...value, item: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter') showResults(); }} />
        </Field>
        <Field label="Series" className="stock-journal-filter-series">
          <SelectInput compact value={filters.series} aria-label="Filter by series" onChange={(event) => setFilters((value) => ({ ...value, series: event.target.value }))}>
            <option>All</option>
            {availableSeries.map((series) => <option key={series}>{series}</option>)}
          </SelectInput>
        </Field>
        <Field label="Group" className="stock-journal-filter-group">
          <SelectInput compact value={filters.group} aria-label="Filter by group" onChange={(event) => setFilters((value) => ({ ...value, group: event.target.value }))}>
            <option value="">All</option>
            {categories.map((category) => <option key={category}>{category}</option>)}
          </SelectInput>
        </Field>
        <Field label="Brand" className="stock-journal-filter-brand">
          <SelectInput compact value={filters.brand} aria-label="Filter by brand" onChange={(event) => setFilters((value) => ({ ...value, brand: event.target.value }))}>
            <option value="">All</option>
            {brands.map((brand) => <option key={brand}>{brand}</option>)}
          </SelectInput>
        </Field>
        <Field label="Barcode" className="stock-journal-filter-barcode">
          <TextInput compact value={filters.barcode} aria-label="Filter by barcode" onChange={(event) => setFilters((value) => ({ ...value, barcode: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter') showResults(); }} />
        </Field>
        <Button size="sm" variant="navy" icon={<Search className="h-4 w-4" />} onClick={showResults}>Show</Button>
      </section>

      <section className="min-h-[40vh] flex-1 overflow-auto rounded-xl border border-blue-200 bg-white shadow-panel">
        {rows.length ? (
          <table className="data-table stock-journal-display-table min-w-[1050px]" aria-label="Stock Journal entries">
            <thead>
              <tr>
                <th>Journal No.</th><th>Date</th>
                {detailed && <th>Series</th>}
                <th>Code</th><th>Item Name</th><th>Unit</th><th className="num">Current Stock</th>
                <th className="num">Add Qty</th><th className="num">Less Qty</th><th className="num">Rate</th>
                <th className="num">Add Value</th><th className="num">Less Value</th><th className="num">New Stock</th>
                {detailed && <><th>Group</th><th>Brand</th><th>Barcode</th><th>Detail</th><th>Narration</th></>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className={selectedId === row.journalId ? '[&>td]:!bg-blue-100' : 'cursor-pointer'} onClick={() => setSelectedId(row.journalId)} onDoubleClick={() => {
                  setSelectedId(row.journalId);
                  if (saved.some((entry) => entry.id === row.journalId)) navigate('/entry/stock-journal/create', { state: { stockJournalId: row.journalId } });
                }}>
                  <td className="font-semibold text-navy">{row.no}</td>
                  <td>{toDisplayDate(row.date)}</td>
                  {detailed && <td>{row.series}</td>}
                  <td>{row.line.code}</td><td>{row.line.name}</td><td>{row.line.unit}</td>
                  <td className="num">{formatQty(row.line.currentStock)}</td><td className="num">{formatQty(row.line.addQty)}</td>
                  <td className="num">{formatQty(row.line.lessQty)}</td><td className="num">{formatMoneyPlain(row.line.rate)}</td>
                  <td className="num">{formatMoneyPlain(row.addValue)}</td><td className="num">{formatMoneyPlain(row.lessValue)}</td>
                  <td className="num font-semibold text-navy">{formatQty(row.newStock)}</td>
                  {detailed && <><td>{row.category || '—'}</td><td>{row.brand || '—'}</td><td>{row.barcode || '—'}</td><td>{row.line.detail || '—'}</td><td>{row.narration || '—'}</td></>}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={detailed ? 7 : 6}>Entries: {entryCount}</td>
                <td className="num">{formatQty(addQty)}</td>
                <td className="num">{formatQty(lessQty)}</td>
                <td />
                <td className="num">{formatINR(addValue)}</td>
                <td className="num">{formatINR(lessValue)}</td>
                <td />
                {detailed && <td colSpan={5} />}
              </tr>
            </tfoot>
          </table>
        ) : (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 px-4 text-center text-slate-500">
            <FolderOpen className="h-9 w-9 text-blue-300" aria-hidden />
            <p className="text-xs">No entries from {toDisplayDate(from)} to {toDisplayDate(to)}.</p>
            {appliedFilters.item || appliedFilters.group || appliedFilters.brand || appliedFilters.barcode || appliedFilters.series !== 'All'
              ? <p className="text-xs">Try changing the filters, then select Show.</p>
              : null}
          </div>
        )}
      </section>

      <footer className="no-print flex flex-col gap-2 rounded-xl border border-blue-200 bg-white/70 p-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-navy">
          <span>Entries: {entryCount}</span>
          <span className="text-slate-500">{toDisplayDate(from)} to {toDisplayDate(to)}</span>
          <SummaryPill label="Add" value={formatQty(addQty)} />
          <SummaryPill label="Less" value={formatQty(lessQty)} />
          <SummaryPill label="Add Value" value={formatINR(addValue)} />
          <SummaryPill label="Less Value" value={formatINR(lessValue)} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="navy" icon={<RefreshCw className="h-4 w-4" />} onClick={refresh}>Refresh</Button>
          <ExportBar filename={`Stock_Journal_${from}_${to}`} columns={exportColumns} rows={exportRows} printLabel="Print A4" />
          <div className="inline-flex rounded-full border border-blue-200 bg-white p-0.5">
            <button type="button" aria-pressed={!detailed} className={`rounded-full px-3 py-1 text-xs font-semibold ${!detailed ? 'bg-[#c42c9a] text-white shadow-sm' : 'text-slate-600'}`} onClick={() => setDetailed(false)}>Normal view</button>
            <button type="button" aria-pressed={detailed} className={`rounded-full px-3 py-1 text-xs font-semibold ${detailed ? 'bg-[#c42c9a] text-white shadow-sm' : 'text-slate-600'}`} onClick={() => setDetailed(true)}>Detailed view</button>
          </div>
          <Button size="sm" variant="outline" icon={<Pencil className="h-4 w-4" />} disabled={!selectedId} onClick={openSelected}>Open / Alter</Button>
          <Button size="sm" variant="primary" icon={<FilePlus2 className="h-4 w-4" />} onClick={() => navigate('/entry/stock-journal/create')}>New Journal</Button>
          <Button size="sm" variant="outline" icon={<X className="h-4 w-4" />} onClick={clearSelection}>Cancel</Button>
        </div>
      </footer>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return <span className="rounded-md border border-blue-100 bg-white px-2 py-1 text-[0.68rem]"><span className="text-slate-500">{label}</span> <span className="text-navy">{value}</span></span>;
}
