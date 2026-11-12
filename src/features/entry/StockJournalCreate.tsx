import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FilePlus2, ListChecks, Printer, Save, Settings2, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, SelectInput, TextInput } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useHotkeys } from '../../hooks/useHotkeys';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../services/api';
import { useAppStore } from '../../store/appStore';
import { NO_ROWS, useDemoStore } from '../../store/demoStore';
import { voucherHistory } from '../../mock-data/entry';
import { financialYearLabel, todayISO, toDisplayDate } from '../../utils/date';
import { formatMoneyPlain, formatQty, parseNum, round2 } from '../../utils/money';
import type { Item, StockJournalLine, VoucherRow } from '../../types';

type StockLine = StockJournalLine & { isBlank?: boolean };
type StockColumn = 'Sno' | 'Code' | 'Item Name' | 'Unit' | 'Cur Stock' | 'Add Qty' | 'Less Qty' | 'Rate' | 'Amount' | 'New Stock' | 'Detail';

const columns: StockColumn[] = ['Sno', 'Code', 'Item Name', 'Unit', 'Cur Stock', 'Add Qty', 'Less Qty', 'Rate', 'Amount', 'New Stock', 'Detail'];
const fields = ['code', 'name', 'addQty', 'lessQty', 'rate', 'detail'] as const;
const blankLine = (): StockLine => ({
  uid: Math.random().toString(36).slice(2, 10),
  code: '', name: '', unit: '', currentStock: 0, addQty: 0, lessQty: 0, rate: 0, detail: '', isBlank: true,
});
const journalNumber = (value: string) => Number(value.replace(/\D/g, '')) || 0;

function rowFromRecord(record: VoucherRow): StockLine[] {
  const saved = record.stockJournalLines?.map((line) => ({ ...line }));
  return saved?.length ? [...saved, blankLine()] : [blankLine()];
}

export function StockJournalCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useAppStore((s) => s.toast);
  const savedRows = useDemoStore((s) => s.vouchers['stock-journal'] ?? NO_ROWS);
  const upsertVoucher = useDemoStore((s) => s.upsertVoucher);
  const removeVoucher = useDemoStore((s) => s.removeVoucher);
  const { data: loadedItems, loading: itemsLoading, error: itemsError } = useAsync(() => api.getItems(), []);
  const items = loadedItems ?? [];
  const [series, setSeries] = useState('Stock Journal');
  const [date, setDate] = useState(todayISO());
  const [no, setNo] = useState(() => Math.max(0, ...savedRows.map((row) => journalNumber(row.no)), ...((voucherHistory['stock-journal'] ?? []).map((row) => journalNumber(row.no)))) + 1);
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<StockLine[]>([blankLine()]);
  const [activeRow, setActiveRow] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [itemQuery, setItemQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; column: StockColumn } | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<StockColumn[]>([]);
  const [rateSource, setRateSource] = useState<'purchase' | 'sales'>('purchase');
  const gridRef = useRef<HTMLDivElement>(null);

  const activeLines = lines.filter((line) => !line.isBlank && line.name);
  const visibleColumns = columns.filter((column) => !hiddenColumns.includes(column));
  const totals = useMemo(() => ({
    addQty: round2(activeLines.reduce((sum, line) => sum + line.addQty, 0)),
    lessQty: round2(activeLines.reduce((sum, line) => sum + line.lessQty, 0)),
    addValue: round2(activeLines.reduce((sum, line) => sum + line.addQty * line.rate, 0)),
    lessValue: round2(activeLines.reduce((sum, line) => sum + line.lessQty * line.rate, 0)),
  }), [activeLines]);
  const filteredItems = useMemo(() => {
    const query = itemQuery.trim().toLowerCase();
    return query
      ? items.filter((item) => `${item.code} ${item.name} ${item.barcode}`.toLowerCase().includes(query))
      : items;
  }, [items, itemQuery]);
  const currentRecord = savedRows.find((row) => row.id === activeId);

  const focusField = (row: number, field: string) => {
    window.setTimeout(() => gridRef.current?.querySelector<HTMLInputElement>(
      `tr[data-row-index="${row}"] [data-sj-field="${field}"]`,
    )?.focus(), 0);
  };

  const loadRecord = (record: VoucherRow | undefined, targetNo: number) => {
    setNo(targetNo);
    if (!record) {
      setActiveId(null);
      setDate(todayISO());
      setNarration('');
      setLines([blankLine()]);
      setActiveRow(0);
      return;
    }
    setActiveId(record.id);
    setSeries(record.series ?? 'Stock Journal');
    setDate(record.date);
    setNarration(record.extra ?? '');
    setLines(rowFromRecord(record));
    setActiveRow(0);
  };

  const moveJournal = (direction: -1 | 1) => {
    const nextNo = Math.max(1, no + direction);
    const record = savedRows.find((row) => journalNumber(row.no) === nextNo);
    loadRecord(record, nextNo);
  };

  useEffect(() => {
    const requestedId = (location.state as { stockJournalId?: string } | null)?.stockJournalId;
    if (!requestedId) return;
    const record = savedRows.find((row) => row.id === requestedId);
    if (record) loadRecord(record, journalNumber(record.no));
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate, savedRows]);

  const newJournal = () => {
    const highest = Math.max(0, ...savedRows.map((row) => journalNumber(row.no)), ...((voucherHistory['stock-journal'] ?? []).map((row) => journalNumber(row.no))));
    loadRecord(undefined, Math.max(highest, no) + 1);
    toast({ tone: 'info', title: 'New stock journal', message: `Journal No. ${Math.max(highest, no) + 1} is ready.` });
  };

  const selectItem = (index: number, item: Item) => {
    setLines((current) => {
      const next = [...current];
      next[index] = {
        ...next[index],
        itemId: item.id,
        code: item.code,
        name: item.name,
        unit: item.unit,
        currentStock: item.stock,
        rate: rateSource === 'purchase' ? item.purchaseRate ?? item.rate : item.rate,
        isBlank: false,
      };
      if (index === current.length - 1) next.push(blankLine());
      return next;
    });
    setActiveRow(index);
  };

  const updateLine = (index: number, patch: Partial<StockLine>) => {
    setLines((current) => {
      const next = [...current];
      next[index] = { ...next[index], ...patch, isBlank: false };
      if (index === current.length - 1 && (next[index].code || next[index].name)) next.push(blankLine());
      return next;
    });
  };

  const removeLine = (index: number) => {
    setLines((current) => {
      const next = current.filter((_, row) => row !== index);
      return next.length ? next : [blankLine()];
    });
    setActiveRow(Math.max(0, index - 1));
  };

  const stockFor = (line: StockLine, index: number) => {
    if (!line.itemId) return line.currentStock;
    const itemStock = items.find((item) => item.id === line.itemId)?.stock ?? line.currentStock;
    const earlierMovement = lines.slice(0, index)
      .filter((entry) => entry.itemId === line.itemId)
      .reduce((sum, entry) => sum + entry.addQty - entry.lessQty, 0);
    return round2(itemStock + earlierMovement);
  };

  const save = () => {
    const entries = lines.filter((line) => !line.isBlank && (line.code || line.name));
    if (!entries.length) {
      toast({ tone: 'error', title: 'Could not save', message: 'Add at least one item to the stock journal.' });
      return;
    }
    const incomplete = entries.find((line) => !line.itemId || !line.name);
    if (incomplete) {
      toast({ tone: 'error', title: 'Select a valid item', message: `Choose an item for row ${entries.indexOf(incomplete) + 1}.` });
      return;
    }
    const invalidQty = entries.find((line) => line.addQty < 0 || line.lessQty < 0);
    if (invalidQty) {
      toast({ tone: 'error', title: 'Invalid quantity', message: 'Add and Less quantities cannot be negative.' });
      return;
    }
    if (entries.every((line) => line.addQty === 0 && line.lessQty === 0)) {
      toast({ tone: 'error', title: 'Enter a stock movement', message: 'At least one row needs an Add Qty or Less Qty.' });
      return;
    }

    const recordId = activeId ?? `stock-journal-${series}-${no}`;
    const stockJournalLines = entries.map((line) => ({
      uid: line.uid,
      itemId: line.itemId,
      code: line.code,
      name: line.name,
      unit: line.unit,
      currentStock: stockFor(line, lines.indexOf(line)),
      addQty: line.addQty,
      lessQty: line.lessQty,
      rate: line.rate,
      detail: line.detail,
    }));
    upsertVoucher('stock-journal', {
      id: recordId,
      no: `SJ-${no}`,
      date,
      party: 'Stock Journal',
      series,
      amount: round2(totals.addValue - totals.lessValue),
      status: 'Saved (demo)',
      stockJournalLines,
      extra: narration.trim(),
    });
    setActiveId(recordId);
    toast({ tone: 'success', title: `Stock Journal SJ-${no} saved`, message: 'Saved in this browser session only. No inventory or accounts are posted.' });
  };

  const deleteCurrent = () => {
    if (currentRecord) {
      removeVoucher('stock-journal', currentRecord.id);
      toast({ tone: 'success', title: `Stock Journal ${currentRecord.no} deleted`, message: 'The session record was removed.' });
      loadRecord(undefined, no);
    } else {
      setLines([blankLine()]);
      setNarration('');
      toast({ tone: 'info', title: 'Journal cleared' });
    }
    setDeleteOpen(false);
  };

  const handleGridKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number, field: string) => {
    if (event.key === ' ' && field === 'name') {
      event.preventDefault();
      setActiveRow(index);
      setItemsOpen(true);
      setItemQuery('');
      return;
    }
    if (event.key !== 'Enter' || event.ctrlKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    if (field === 'code') {
      const code = event.currentTarget.value.trim().toLowerCase();
      const match = items.find((item) => item.code.toLowerCase() === code || item.barcode.toLowerCase() === code);
      if (match) selectItem(index, match);
      focusField(index, 'name');
      return;
    }
    const fieldIndex = fields.indexOf(field as typeof fields[number]);
    if (fieldIndex < fields.length - 1) {
      focusField(index, fields[fieldIndex + 1]);
      return;
    }
    const nextRow = index + 1;
    if (nextRow >= lines.length) setLines((current) => [...current, blankLine()]);
    setActiveRow(nextRow);
    focusField(nextRow, 'code');
  };

  const hotkeys = useMemo(() => ({
    'Alt+S': save,
    'F2': newJournal,
    'Ctrl+Delete': () => removeLine(activeRow),
    'PageUp': () => moveJournal(-1),
    'PageDown': () => moveJournal(1),
  }), [activeRow, no, series, date, narration, lines, totals, savedRows, activeId, items]);
  useHotkeys(hotkeys);

  const onHeaderContextMenu = (event: MouseEvent<HTMLTableCellElement>, column: StockColumn) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, column });
  };
  const toggleColumn = (column: StockColumn) => {
    if (!hiddenColumns.includes(column) && visibleColumns.length <= 1) {
      toast({ tone: 'warning', title: 'Keep one visible column', message: 'At least one item column must stay visible.' });
      return;
    }
    setHiddenColumns((current) => current.includes(column) ? current.filter((entry) => entry !== column) : [...current, column]);
  };

  const renderHeader = (column: StockColumn) => {
    if (hiddenColumns.includes(column)) return null;
    const numeric = ['Cur Stock', 'Add Qty', 'Less Qty', 'Rate', 'Amount', 'New Stock'].includes(column);
    return (
      <th key={column} className={numeric ? 'text-right' : ''} onContextMenu={(event) => onHeaderContextMenu(event, column)}>
        {column}
      </th>
    );
  };

  return (
    <div className="stock-journal-create -mx-3 -mt-3 flex min-h-[calc(100vh-3.5rem)] flex-col gap-2 bg-[#e7f1fc] p-2 sm:-mx-4 sm:-mt-4 sm:p-2">
      <PageHeader
        title="Stock Journal"
        variant="bill"
        shortcuts="PgUp / PgDn = previous / next · F2 = New · Alt+S = Save · Ctrl+Del = remove row · Right-click heading = columns"
        actions={<span className="hidden text-xs font-medium text-white/85 xl:inline">STOCK INCREASE / DECREASE</span>}
      />

      <div className="grid gap-2 xl:grid-cols-[minmax(19rem,0.75fr)_minmax(32rem,3fr)]">
        <section className="grid grid-cols-1 gap-2 rounded-xl border border-blue-200 bg-white p-3 shadow-panel sm:grid-cols-3 xl:grid-cols-1">
          <Field label="Series" htmlFor="sj-series">
            <SelectInput id="sj-series" value={series} onChange={(event) => setSeries(event.target.value)} className="border-blue-200">
              <option>Stock Journal</option>
              <option>Default</option>
              <option>Main series</option>
            </SelectInput>
          </Field>
          <Field label="Journal No">
            <div className="flex items-center gap-1">
              <Button size="sm" aria-label="Previous journal" onClick={() => moveJournal(-1)}>‹</Button>
              <TextInput type="number" min={1} numeric value={no} onChange={(event) => {
                const nextNo = Math.max(1, Math.floor(parseNum(event.target.value)));
                setNo(nextNo);
                const match = savedRows.find((row) => journalNumber(row.no) === nextNo);
                if (match) loadRecord(match, nextNo);
                else setActiveId(null);
              }} />
              <Button size="sm" aria-label="Next journal" onClick={() => moveJournal(1)}>›</Button>
              <span className="whitespace-nowrap text-xs text-slate-500">{financialYearLabel(date)}</span>
            </div>
          </Field>
          <Field label="Date" htmlFor="sj-date" hint={toDisplayDate(date)}>
            <TextInput id="sj-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="border-blue-200" />
          </Field>
        </section>

        <section className="rounded-xl border border-blue-200 bg-white p-3 shadow-panel">
          <Field label="Narration" htmlFor="sj-narration" hint="Add Qty increases stock. Less Qty decreases stock. Current Stock and New Stock are shown per item.">
            <TextInput
              id="sj-narration"
              value={narration}
              onChange={(event) => setNarration(event.target.value)}
              placeholder="E.G. DAMAGE / SAMPLE / OPENING CORRECTION / CONVERSION"
              className="border-blue-200"
            />
          </Field>
        </section>
      </div>

      {itemsError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-fiery" role="alert">Could not load the item list: {itemsError}</p>}
      {itemsLoading && <p className="text-xs text-slate-500" role="status">Loading item list…</p>}

      <section ref={gridRef} className="min-h-[36vh] flex-1 overflow-auto rounded-xl border border-blue-200 bg-white shadow-panel">
        <table className="data-table stock-journal-table min-w-[1050px]">
          <thead>
            <tr>{columns.map(renderHeader)}<th className="w-10" /></tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const curStock = stockFor(line, index);
              const newStock = round2(curStock + line.addQty - line.lessQty);
              const amount = round2((line.addQty - line.lessQty) * line.rate);
              const common = {
                input: 'input input-sm border-blue-200 bg-white',
                numeric: 'input input-sm input-num border-blue-200 bg-white',
              };
              return (
                <tr key={line.uid} data-row-index={index} onFocusCapture={() => setActiveRow(index)}>
                  {!hiddenColumns.includes('Sno') && <td className="text-center text-slate-500">{index + 1}</td>}
                  {!hiddenColumns.includes('Code') && (
                    <td>
                      <input className={`${common.input} w-20`} data-sj-field="code" aria-label={`Row ${index + 1} item code`} value={line.code} onChange={(event) => {
                        const value = event.target.value;
                        const match = items.find((item) => item.code.toLowerCase() === value.trim().toLowerCase());
                        match ? selectItem(index, match) : updateLine(index, { code: value });
                      }} onKeyDown={(event) => handleGridKeyDown(event, index, 'code')} />
                    </td>
                  )}
                  {!hiddenColumns.includes('Item Name') && (
                    <td className="min-w-[14rem]">
                      <div className="flex items-center gap-1">
                        <input className={`${common.input} min-w-[12rem]`} data-sj-field="name" aria-label={`Row ${index + 1} item name`} list="stock-journal-items" placeholder={index === 0 ? 'SPACE = ITEM LIST, OR TYPE TO SEARCH' : 'Select item'} value={line.name} onChange={(event) => {
                          const value = event.target.value;
                          const match = items.find((item) => item.name.toLowerCase() === value.trim().toLowerCase() || item.code.toLowerCase() === value.trim().toLowerCase());
                          match ? selectItem(index, match) : updateLine(index, { name: value, itemId: undefined, unit: '' });
                        }} onKeyDown={(event) => handleGridKeyDown(event, index, 'name')} />
                        <button type="button" className="btn btn-outline btn-sm btn-icon" title="Open item list (Space)" aria-label="Open item list" onClick={() => {
                          setActiveRow(index);
                          setItemsOpen(true);
                          setItemQuery('');
                        }}>…</button>
                      </div>
                    </td>
                  )}
                  {!hiddenColumns.includes('Unit') && <td>{line.unit || '—'}</td>}
                  {!hiddenColumns.includes('Cur Stock') && <td className="num">{formatQty(curStock)}</td>}
                  {!hiddenColumns.includes('Add Qty') && <td><input className={`${common.numeric} w-20`} data-sj-field="addQty" aria-label={`Row ${index + 1} add quantity`} type="number" min="0" step="any" value={line.addQty || ''} onChange={(event) => updateLine(index, { addQty: Math.max(0, parseNum(event.target.value)) })} onKeyDown={(event) => handleGridKeyDown(event, index, 'addQty')} /></td>}
                  {!hiddenColumns.includes('Less Qty') && <td><input className={`${common.numeric} w-20`} data-sj-field="lessQty" aria-label={`Row ${index + 1} less quantity`} type="number" min="0" step="any" value={line.lessQty || ''} onChange={(event) => updateLine(index, { lessQty: Math.max(0, parseNum(event.target.value)) })} onKeyDown={(event) => handleGridKeyDown(event, index, 'lessQty')} /></td>}
                  {!hiddenColumns.includes('Rate') && <td><input className={`${common.numeric} w-24`} data-sj-field="rate" aria-label={`Row ${index + 1} rate`} type="number" min="0" step="any" value={line.rate || ''} onChange={(event) => updateLine(index, { rate: Math.max(0, parseNum(event.target.value)) })} onKeyDown={(event) => handleGridKeyDown(event, index, 'rate')} /></td>}
                  {!hiddenColumns.includes('Amount') && <td className="num font-medium">{formatMoneyPlain(amount)}</td>}
                  {!hiddenColumns.includes('New Stock') && <td className="num font-semibold text-navy">{formatQty(newStock)}</td>}
                  {!hiddenColumns.includes('Detail') && (
                    <td className="min-w-[9rem]">
                      <div className="flex items-center gap-1">
                        <input className={`${common.input} min-w-[7rem]`} data-sj-field="detail" aria-label={`Row ${index + 1} detail`} value={line.detail} onChange={(event) => updateLine(index, { detail: event.target.value })} onKeyDown={(event) => handleGridKeyDown(event, index, 'detail')} />
                      </div>
                    </td>
                  )}
                  <td><button type="button" className="btn btn-ghost btn-sm btn-icon text-fiery" title="Remove row" aria-label={`Remove row ${index + 1}`} onClick={() => removeLine(index)}><Trash2 className="h-3.5 w-3.5" /></button></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="stock-journal-total-row">
              <td colSpan={Math.max(1, Math.min(3, visibleColumns.length))} className="font-bold text-navy">
                {activeLines.length} {activeLines.length === 1 ? 'item' : 'items'}
              </td>
              {visibleColumns.slice(3).map((column) => (
                <td key={column} className={['Cur Stock', 'Add Qty', 'Less Qty', 'Rate', 'Amount', 'New Stock'].includes(column) ? 'num font-bold' : 'font-bold'}>
                  {column === 'Add Qty' ? formatQty(totals.addQty)
                    : column === 'Less Qty' ? formatQty(totals.lessQty)
                      : column === 'Amount' ? formatMoneyPlain(totals.addValue - totals.lessValue)
                        : ''}
                </td>
              ))}
              <td />
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Stock journal totals">
        <SummaryCard label="Items" value={String(activeLines.length)} />
        <SummaryCard label="Total Add" value={formatQty(totals.addQty)} tone="add" />
        <SummaryCard label="Total Less" value={formatQty(totals.lessQty)} tone="less" />
        <SummaryCard label="Value Add / Less" value={`${formatMoneyPlain(totals.addValue)} / ${formatMoneyPlain(totals.lessValue)}`} />
      </section>

      <footer className="no-print flex flex-col gap-2 rounded-xl border border-blue-200 bg-white/80 p-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">Empty Code + Enter = Item Name · Space in Item Name = item list · Enter = next column</p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDeleteOpen(true)}>Delete</Button>
          <Button variant="outline" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Print</Button>
          <Button variant="navy" icon={<ListChecks className="h-4 w-4" />} onClick={() => navigate('/entry/stock-journal/display')}>Display</Button>
          <Button variant="outline" icon={<FilePlus2 className="h-4 w-4" />} onClick={newJournal}>New (F2)</Button>
          <Button variant="outline" icon={<Settings2 className="h-4 w-4" />} onClick={() => setOptionsOpen(true)}>Options</Button>
          <Button variant="primary" icon={<Save className="h-4 w-4" />} onClick={save}>Save</Button>
        </div>
      </footer>

      <datalist id="stock-journal-items">{items.map((item) => <option key={item.id} value={item.name}>{item.code} · {item.unit}</option>)}</datalist>

      <Modal open={itemsOpen} onClose={() => setItemsOpen(false)} title="Select stock item" width="max-w-3xl" footer={<Button variant="outline" onClick={() => setItemsOpen(false)}>Cancel</Button>}>
        <div className="space-y-3">
          <TextInput autoFocus value={itemQuery} onChange={(event) => setItemQuery(event.target.value)} placeholder="Search by item name, code or barcode" aria-label="Search items" />
          <div className="max-h-[55vh] overflow-auto rounded-lg border border-cream-200">
            <table className="data-table">
              <thead><tr><th>Code</th><th>Item Name</th><th>Unit</th><th className="text-right">Current Stock</th></tr></thead>
              <tbody>{filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.code}</td><td>{item.name}</td><td>{item.unit}</td><td className="num">{formatQty(item.stock)}</td>
                  <td><Button size="sm" variant="navy" onClick={() => { selectItem(activeRow, item); setItemsOpen(false); focusField(activeRow, 'addQty'); }}>Select</Button></td>
                </tr>
              ))}</tbody>
            </table>
            {!filteredItems.length && <p className="p-5 text-center text-sm text-slate-500">No matching items.</p>}
          </div>
        </div>
      </Modal>

      <Modal open={optionsOpen} onClose={() => setOptionsOpen(false)} title="Stock Journal options" width="max-w-lg" footer={<Button variant="primary" onClick={() => setOptionsOpen(false)}>Done</Button>}>
        <div className="space-y-4">
          <Field label="Default rate">
            <SelectInput value={rateSource} onChange={(event) => setRateSource(event.target.value as 'purchase' | 'sales')}>
              <option value="purchase">Purchase rate</option>
              <option value="sales">Sales rate</option>
            </SelectInput>
          </Field>
          <div>
            <h3 className="mb-2 text-sm font-bold text-navy">Visible columns</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {columns.map((column) => (
                <label key={column} className="flex items-center gap-2 rounded-lg border border-cream-200 px-2 py-1.5 text-sm">
                  <input type="checkbox" checked={!hiddenColumns.includes(column)} onChange={() => toggleColumn(column)} />
                  {column}
                </label>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-500">You can also right-click any table heading to hide or restore columns.</p>
        </div>
      </Modal>

      {contextMenu && (
        <div className="fixed z-50 w-56 rounded-lg border border-blue-200 bg-white p-2 shadow-pop" style={{ left: Math.min(contextMenu.x, window.innerWidth - 235), top: Math.min(contextMenu.y, window.innerHeight - 250) }} role="menu" aria-label="Column visibility">
          <p className="px-2 pb-1 text-xs font-bold uppercase text-slate-500">{contextMenu.column}: columns</p>
          {columns.map((column) => (
            <button type="button" key={column} role="menuitemcheckbox" aria-checked={!hiddenColumns.includes(column)} onClick={() => toggleColumn(column)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-steel-100">
              <span className="w-4 text-center">{hiddenColumns.includes(column) ? '' : '✓'}</span>{column}
            </button>
          ))}
          <button type="button" onClick={() => setContextMenu(null)} className="mt-1 w-full border-t border-slate-100 px-2 pt-2 text-left text-xs font-semibold text-navy">Close</button>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title={currentRecord ? `Delete ${currentRecord.no}?` : 'Clear this journal?'}
        message={currentRecord ? 'This removes the saved stock journal from this browser session.' : 'This clears the current unsaved items and narration.'}
        confirmLabel={currentRecord ? 'Delete journal' : 'Clear journal'}
        tone="danger"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={deleteCurrent}
      />
    </div>
  );
}

function SummaryCard({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'add' | 'less' }) {
  const color = tone === 'add' ? 'border-green-200 bg-green-50 text-green-800' : tone === 'less' ? 'border-red-200 bg-red-50 text-red-700' : 'border-blue-200 bg-white text-navy';
  return (
    <div className={`rounded-xl border p-3 shadow-sm ${color}`}>
      <p className="text-[0.65rem] font-bold uppercase tracking-wider opacity-65">{label}</p>
      <p className="mt-1 truncate text-lg font-extrabold tabular-nums">{value}</p>
    </div>
  );
}
