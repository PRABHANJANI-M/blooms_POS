import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Database, Download, FilePlus2, ListChecks, Printer, Save, Settings2, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, SelectInput, TextInput } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useAsync } from '../../hooks/useAsync';
import { useHotkeys } from '../../hooks/useHotkeys';
import { api } from '../../services/api';
import { useAppStore } from '../../store/appStore';
import { NO_ROWS, useDemoStore } from '../../store/demoStore';
import { voucherHistory } from '../../mock-data/entry';
import { financialYearLabel, todayISO, toDisplayDate } from '../../utils/date';
import { formatMoneyPlain, formatQty, parseNum, round2 } from '../../utils/money';
import type { Item, StockCheckingLine, VoucherRow } from '../../types';

type CheckingLine = StockCheckingLine & { barcode: string; isBlank?: boolean };
type CheckingColumn = 'Sno' | 'Code' | 'Item Name' | 'Barcode' | 'Unit' | 'A/L Qty' | 'Stk Qty' | 'Difference';

const columns: CheckingColumn[] = ['Sno', 'Code', 'Item Name', 'Barcode', 'Unit', 'A/L Qty', 'Stk Qty', 'Difference'];
const fields = ['code', 'name', 'barcode', 'countedQty'] as const;
const blankLine = (): CheckingLine => ({
  uid: Math.random().toString(36).slice(2, 10),
  code: '', name: '', barcode: '', unit: '', systemQty: 0, countedQty: undefined, rate: 0, isBlank: true,
});
const checkNumber = (value: string) => Number(value.replace(/\D/g, '')) || 0;
const lineDifference = (line: CheckingLine) => line.countedQty === undefined ? 0 : round2(line.countedQty - line.systemQty);
const itemModel = (item: Item) => item.model ?? item.name;
const itemRack = (item: Item) => item.rack ?? 'Unassigned';

function rowFromRecord(record: VoucherRow): CheckingLine[] {
  const saved = record.stockCheckingLines?.map((line) => ({ ...line, barcode: '' }));
  return saved?.length ? [...saved, blankLine()] : [blankLine()];
}

export function StockCheckingCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useAppStore((state) => state.toast);
  const savedRows = useDemoStore((state) => state.vouchers['stock-checking'] ?? NO_ROWS);
  const upsertVoucher = useDemoStore((state) => state.upsertVoucher);
  const removeVoucher = useDemoStore((state) => state.removeVoucher);
  const updateItemStocks = useDemoStore((state) => state.updateItemStocks);
  const { data: loadedItems, loading: itemsLoading, error: itemsError } = useAsync(() => api.getItems(), []);
  const items = loadedItems ?? [];
  const [series, setSeries] = useState('Stock Check');
  const [checkNo, setCheckNo] = useState(() => Math.max(
    0,
    ...savedRows.map((row) => checkNumber(row.no)),
    ...((voucherHistory['stock-checking'] ?? []).map((row) => checkNumber(row.no))),
  ) + 1);
  const [date, setDate] = useState(todayISO());
  const [remarks, setRemarks] = useState('');
  const [group, setGroup] = useState('All');
  const [brand, setBrand] = useState('All');
  const [model, setModel] = useState('');
  const [rack, setRack] = useState('All');
  const [onlyWithStock, setOnlyWithStock] = useState(false);
  const [carryItems, setCarryItems] = useState(false);
  const [addBarcodeQty, setAddBarcodeQty] = useState(false);
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [rateSource, setRateSource] = useState<'purchase' | 'sales'>('purchase');
  const [lines, setLines] = useState<CheckingLine[]>([blankLine()]);
  const [activeRow, setActiveRow] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [itemQuery, setItemQuery] = useState('');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; column: CheckingColumn } | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<CheckingColumn[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);

  const visibleColumns = columns.filter((column) => !hiddenColumns.includes(column) && (column !== 'Barcode' || addBarcodeQty));
  const activeLines = lines.filter((line) => !line.isBlank && line.itemId);
  const countedLines = activeLines.filter((line) => line.countedQty !== undefined);
  const differences = countedLines.map((line) => lineDifference(line));
  const excess = round2(differences.filter((difference) => difference > 0).reduce((sum, difference) => sum + difference, 0));
  const shortage = round2(differences.filter((difference) => difference < 0).reduce((sum, difference) => sum + Math.abs(difference), 0));
  const addValue = round2(countedLines.reduce((sum, line) => sum + Math.max(0, lineDifference(line)) * line.rate, 0));
  const lessValue = round2(countedLines.reduce((sum, line) => sum + Math.max(0, -lineDifference(line)) * line.rate, 0));
  const currentRecord = savedRows.find((row) => row.id === activeId);

  const groups = useMemo(() => [...new Set(items.map((item) => item.category).filter(Boolean))].sort(), [items]);
  const brands = useMemo(() => [...new Set(items.map((item) => item.brand).filter(Boolean))].sort(), [items]);
  const racks = useMemo(() => [...new Set(items.map(itemRack))].sort(), [items]);
  const filteredItems = useMemo(() => {
    const query = itemQuery.trim().toLowerCase();
    return items.filter((item) => !query || `${item.code} ${item.name} ${item.barcode}`.toLowerCase().includes(query));
  }, [items, itemQuery]);
  const itemsToLoad = useMemo(() => items.filter((item) =>
    (group === 'All' || item.category === group)
    && (brand === 'All' || item.brand === brand)
    && (!model.trim() || `${itemModel(item)} ${item.name} ${item.code} ${item.brand}`.toLowerCase().includes(model.trim().toLowerCase()))
    && (rack === 'All' || itemRack(item) === rack)
    && (!onlyWithStock || item.stock > 0),
  ), [items, group, brand, model, rack, onlyWithStock]);

  const focusField = (index: number, field: string) => {
    window.setTimeout(() => gridRef.current?.querySelector<HTMLInputElement>(
      `tr[data-row-index="${index}"] [data-check-field="${field}"]`,
    )?.focus(), 0);
  };

  const loadRecord = (record: VoucherRow | undefined, targetNo: number) => {
    setCheckNo(targetNo);
    if (!record) {
      setActiveId(null);
      setDate(todayISO());
      setRemarks('');
      setLines([blankLine()]);
      setActiveRow(0);
      return;
    }
    setActiveId(record.id);
    setSeries(record.series ?? 'Stock Check');
    setDate(record.date);
    setRemarks(record.extra ?? '');
    setLines(rowFromRecord(record));
    setActiveRow(0);
  };

  useEffect(() => {
    const stockCheckingId = (location.state as { stockCheckingId?: string } | null)?.stockCheckingId;
    if (!stockCheckingId) return;
    const record = savedRows.find((row) => row.id === stockCheckingId);
    if (record) loadRecord(record, checkNumber(record.no));
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, savedRows]);

  const moveCheck = (direction: -1 | 1) => {
    const nextNo = Math.max(1, checkNo + direction);
    const record = savedRows.find((row) => checkNumber(row.no) === nextNo);
    loadRecord(record, nextNo);
  };

  const newCheck = () => {
    const highest = Math.max(
      0,
      ...savedRows.map((row) => checkNumber(row.no)),
      ...((voucherHistory['stock-checking'] ?? []).map((row) => checkNumber(row.no))),
    );
    const nextNo = Math.max(highest, checkNo) + 1;
    loadRecord(undefined, nextNo);
    toast({ tone: 'info', title: 'New stock check', message: `Check No. ${nextNo} is ready.` });
  };

  const selectItem = (index: number, item: Item, initialCount?: number) => {
    setLines((current) => {
      const next = [...current];
      const existing = next[index];
      next[index] = {
        ...existing,
        itemId: item.id,
        code: item.code,
        name: item.name,
        barcode: item.barcode,
        unit: item.unit,
        systemQty: item.stock,
        rate: rateSource === 'purchase' ? item.purchaseRate ?? item.rate : item.rate,
        countedQty: initialCount ?? existing.countedQty,
        isBlank: false,
      };
      if (index === current.length - 1) next.push(blankLine());
      return next;
    });
    setActiveRow(index);
  };

  const updateLine = (index: number, patch: Partial<CheckingLine>) => {
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

  const loadItems = () => {
    if (!items.length) {
      toast({ tone: itemsLoading ? 'info' : 'error', title: itemsLoading ? 'Loading items' : 'No items available', message: itemsError ?? 'The item list is not ready yet.' });
      return;
    }
    if (!itemsToLoad.length) {
      toast({ tone: 'warning', title: 'No matching items', message: 'Change the group, brand, model or rack filters and try Load again.' });
      return;
    }
    const oldById = new Map(lines.filter((line) => line.itemId).map((line) => [line.itemId!, line]));
    const loaded = itemsToLoad.map((item) => {
      const existing = carryItems ? oldById.get(item.id) : undefined;
      return existing ? { ...existing, systemQty: item.stock } : {
        ...blankLine(),
        itemId: item.id,
        code: item.code,
        name: item.name,
        barcode: item.barcode,
        unit: item.unit,
        systemQty: item.stock,
        rate: rateSource === 'purchase' ? item.purchaseRate ?? item.rate : item.rate,
        isBlank: false,
      };
    });
    if (carryItems) {
      const loadedIds = new Set(loaded.map((line) => line.itemId));
      for (const existing of lines) {
        if (existing.itemId && !loadedIds.has(existing.itemId)) loaded.push(existing);
      }
    }
    setLines([...loaded, blankLine()]);
    setActiveRow(0);
    toast({ tone: 'success', title: 'Items loaded', message: `${itemsToLoad.length} item(s) loaded for stock checking.` });
  };

  const updateMaster = (selectedLines: CheckingLine[], actionTitle = 'Stock master updated') => {
    const validLines = selectedLines.filter((line): line is CheckingLine & { itemId: string; countedQty: number } =>
      Boolean(line.itemId) && line.countedQty !== undefined,
    );
    if (!validLines.length) {
      toast({ tone: 'warning', title: 'No counted items', message: 'Enter a stock quantity for at least one item first.' });
      return false;
    }
    updateItemStocks(Object.fromEntries(validLines.map((line) => [line.itemId, line.countedQty])));
    toast({ tone: 'success', title: actionTitle, message: `${validLines.length} item stock value(s) updated in this browser session only.` });
    return true;
  };

  const save = () => {
    if (!activeLines.length) {
      toast({ tone: 'error', title: 'Could not save', message: 'Load or add at least one item to the stock check.' });
      return;
    }
    if (!countedLines.length) {
      toast({ tone: 'error', title: 'No counted quantities', message: 'Enter a Stk Qty for at least one item. Leave unchecked items blank.' });
      return;
    }
    const negative = countedLines.filter((line) => (line.countedQty ?? 0) < 0);
    if (negative.length && !allowNegativeStock) {
      toast({ tone: 'error', title: 'Negative stock is disabled', message: 'Enable Allow negative stock in Options before saving negative counted quantities.' });
      return;
    }

    const rowId = activeId ?? `stock-checking-${series}-${checkNo}`;
    const stockCheckingLines = activeLines.map((line) => ({
      uid: line.uid,
      itemId: line.itemId,
      code: line.code,
      name: line.name,
      unit: line.unit,
      systemQty: line.systemQty,
      countedQty: line.countedQty,
      rate: line.rate,
    }));
    upsertVoucher('stock-checking', {
      id: rowId,
      no: `SC-${checkNo}`,
      date,
      series,
      party: 'Stock Check',
      amount: 0,
      status: 'Adjusted',
      stockCheckingLines,
      extra: remarks.trim(),
    });
    updateItemStocks(Object.fromEntries(countedLines.map((line) => [line.itemId!, line.countedQty!])));
    setActiveId(rowId);
    toast({
      tone: 'success',
      title: `Stock Check SC-${checkNo} saved`,
      message: `Saved in this browser session. ${formatQty(excess)} excess and ${formatQty(shortage)} shortage applied to the session stock master.`,
    });
  };

  const updateNegativeStock = () => {
    if (!allowNegativeStock) {
      toast({ tone: 'warning', title: 'Negative stock is disabled', message: 'Enable Allow negative stock in Options before updating negative quantities.' });
      return;
    }
    const negativeLines = countedLines.filter((line) => (line.countedQty ?? 0) < 0);
    updateMaster(negativeLines, 'Negative stock updated');
  };

  const deleteCurrent = () => {
    if (currentRecord) {
      removeVoucher('stock-checking', currentRecord.id);
      toast({ tone: 'success', title: `Stock Check ${currentRecord.no} deleted`, message: 'The session record was removed. Item stock changes are not reversed.' });
      loadRecord(undefined, checkNo);
    } else {
      setLines([blankLine()]);
      setRemarks('');
      toast({ tone: 'info', title: 'Stock check cleared' });
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
    if (field === 'code' || field === 'barcode') {
      const value = event.currentTarget.value.trim().toLowerCase();
      const match = items.find((item) => item.code.toLowerCase() === value || item.barcode.toLowerCase() === value);
      if (match) {
        selectItem(index, match, field === 'barcode' && addBarcodeQty ? (lines[index].countedQty ?? 0) + 1 : undefined);
        focusField(index, field === 'code' ? 'name' : 'countedQty');
      } else {
        toast({ tone: 'warning', title: 'Item not found', message: `No item matches ${value || 'the entered code'}.` });
      }
      return;
    }
    const fieldIndex = fields.indexOf(field as typeof fields[number]);
    if (fieldIndex < fields.length - 1) {
      focusField(index, fields[fieldIndex + 1]);
      return;
    }
    const nextIndex = index + 1;
    if (nextIndex >= lines.length) setLines((current) => [...current, blankLine()]);
    setActiveRow(nextIndex);
    focusField(nextIndex, 'code');
  };

  const hotkeys = useMemo(() => ({
    'Alt+S': save,
    'F2': newCheck,
    'Ctrl+Delete': () => removeLine(activeRow),
    'PageUp': () => moveCheck(-1),
    'PageDown': () => moveCheck(1),
  }), [activeId, activeRow, allowNegativeStock, checkNo, countedLines, date, lines, remarks, savedRows, series]);
  useHotkeys(hotkeys);

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
  const renderHeader = (column: CheckingColumn) => {
    if (!visibleColumns.includes(column)) return null;
    return <th key={column} className={['A/L Qty', 'Stk Qty', 'Difference'].includes(column) ? 'text-right' : ''} onContextMenu={(event) => openColumnMenu(event, column)}>{column}</th>;
  };

  return (
    <div className="stock-checking-create -mx-3 -mt-3 flex min-h-[calc(100vh-3.5rem)] flex-col gap-2 bg-[#e7f1fc] p-2 sm:-mx-4 sm:-mt-4 sm:p-2">
      <PageHeader
        title="Stock Checking"
        variant="bill"
        shortcuts="PgUp / PgDn = previous / next · F2 = New · Alt+S = Save · Ctrl+Del = remove row · Right-click heading = hide / unhide columns"
        actions={<span className="hidden text-xs font-medium text-white/85 xl:inline">PHYSICAL STOCK COUNT</span>}
      />

      <div className="grid gap-2 xl:grid-cols-[minmax(18rem,0.7fr)_minmax(36rem,3fr)]">
        <section className="grid grid-cols-1 gap-2 rounded-xl border border-blue-200 bg-white p-3 shadow-panel sm:grid-cols-3 xl:grid-cols-1">
          <Field label="Series" htmlFor="sc-series">
            <SelectInput id="sc-series" value={series} onChange={(event) => setSeries(event.target.value)} className="border-blue-200">
              <option>Stock Check</option><option>Default</option><option>Main series</option>
            </SelectInput>
          </Field>
          <Field label="Check No">
            <div className="flex items-center gap-1">
              <Button size="sm" aria-label="Previous stock check" onClick={() => moveCheck(-1)}>‹</Button>
              <TextInput type="number" min={1} numeric value={checkNo} onChange={(event) => {
                const nextNo = Math.max(1, Math.floor(parseNum(event.target.value)));
                setCheckNo(nextNo);
                const record = savedRows.find((row) => checkNumber(row.no) === nextNo);
                if (record) loadRecord(record, nextNo);
                else setActiveId(null);
              }} />
              <Button size="sm" aria-label="Next stock check" onClick={() => moveCheck(1)}>›</Button>
              <span className="whitespace-nowrap text-xs text-slate-500">{financialYearLabel(date)}</span>
            </div>
          </Field>
          <Field label="Date" htmlFor="sc-date" hint={toDisplayDate(date)}>
            <TextInput id="sc-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="border-blue-200" />
          </Field>
        </section>

        <section className="space-y-2 rounded-xl border border-blue-200 bg-white p-3 shadow-panel">
          <div className="grid gap-2 md:grid-cols-[minmax(12rem,1fr)_repeat(4,minmax(7rem,0.7fr))_auto] md:items-end">
            <Field label="Remarks" htmlFor="sc-remarks">
              <TextInput id="sc-remarks" compact value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="E.G. MONTH END STOCK TAKING - RACK A" />
            </Field>
            <Field label="Group">
              <SelectInput compact value={group} onChange={(event) => setGroup(event.target.value)}>
                <option>All</option>{groups.map((entry) => <option key={entry}>{entry}</option>)}
              </SelectInput>
            </Field>
            <Field label="Brand">
              <SelectInput compact value={brand} onChange={(event) => setBrand(event.target.value)}>
                <option>All</option>{brands.map((entry) => <option key={entry}>{entry}</option>)}
              </SelectInput>
            </Field>
            <Field label="Model">
              <TextInput compact value={model} onChange={(event) => setModel(event.target.value)} placeholder="Search model" />
            </Field>
            <Field label="Rack">
              <SelectInput compact value={rack} onChange={(event) => setRack(event.target.value)}>
                <option>All</option>{racks.map((entry) => <option key={entry}>{entry}</option>)}
              </SelectInput>
            </Field>
            <Button size="sm" variant="navy" icon={<Download className="h-4 w-4" />} onClick={loadItems}>Load</Button>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.68rem] text-slate-600">
            <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={onlyWithStock} onChange={(event) => setOnlyWithStock(event.target.checked)} />Only items having stock</label>
            <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={carryItems} onChange={(event) => setCarryItems(event.target.checked)} />Carry Item</label>
            <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={addBarcodeQty} onChange={(event) => setAddBarcodeQty(event.target.checked)} />Add Barcode Qty</label>
            <span className="text-slate-500">A/L Qty = stock in system · Stk Qty = counted · Blank Stk Qty = not checked (left out). Difference is added / reduced on save.</span>
          </div>
        </section>
      </div>

      {itemsError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-fiery" role="alert">Could not load item list: {itemsError}</p>}
      {itemsLoading && <p className="text-xs text-slate-500" role="status">Loading item list…</p>}

      <section ref={gridRef} className="min-h-[36vh] flex-1 overflow-auto rounded-xl border border-blue-200 bg-white shadow-panel">
        <table className="data-table stock-checking-table min-w-[980px]">
          <thead><tr>{columns.map(renderHeader)}<th className="w-10" /></tr></thead>
          <tbody>
            {lines.map((line, index) => {
              const difference = lineDifference(line);
              return (
                <tr key={line.uid} data-row-index={index} onFocusCapture={() => setActiveRow(index)}>
                  {visibleColumns.includes('Sno') && <td className="text-center text-slate-500">{index + 1}</td>}
                  {visibleColumns.includes('Code') && <td><input className="input input-sm w-20 border-blue-200" data-check-field="code" aria-label={`Row ${index + 1} item code`} value={line.code} onChange={(event) => {
                    const value = event.target.value;
                    const match = items.find((item) => item.code.toLowerCase() === value.trim().toLowerCase());
                    match ? selectItem(index, match) : updateLine(index, { code: value });
                  }} onKeyDown={(event) => handleGridKeyDown(event, index, 'code')} /></td>}
                  {visibleColumns.includes('Item Name') && <td className="min-w-[14rem]"><div className="flex items-center gap-1">
                    <input className="input input-sm min-w-[11rem] border-blue-200" data-check-field="name" aria-label={`Row ${index + 1} item name`} list="stock-checking-items" placeholder={index === 0 ? 'SPACE = ITEM LIST, OR TYPE TO SEARCH' : 'Select item'} value={line.name} onChange={(event) => {
                      const value = event.target.value;
                      const match = items.find((item) => item.name.toLowerCase() === value.trim().toLowerCase() || item.code.toLowerCase() === value.trim().toLowerCase());
                      match ? selectItem(index, match) : updateLine(index, { name: value, itemId: undefined, unit: '' });
                    }} onKeyDown={(event) => handleGridKeyDown(event, index, 'name')} />
                    <button type="button" className="btn btn-outline btn-sm btn-icon" title="Open item list (Space)" aria-label={`Choose item for row ${index + 1}`} onClick={() => { setActiveRow(index); setItemsOpen(true); setItemQuery(''); }}>…</button>
                  </div></td>}
                  {visibleColumns.includes('Barcode') && <td><input className="input input-sm w-28 border-blue-200" data-check-field="barcode" aria-label={`Row ${index + 1} barcode`} value={line.barcode} onChange={(event) => updateLine(index, { barcode: event.target.value })} onKeyDown={(event) => handleGridKeyDown(event, index, 'barcode')} /></td>}
                  {visibleColumns.includes('Unit') && <td>{line.unit || '—'}</td>}
                  {visibleColumns.includes('A/L Qty') && <td className="num">{line.itemId ? formatQty(line.systemQty) : ''}</td>}
                  {visibleColumns.includes('Stk Qty') && <td><input className="input input-sm input-num w-24 border-blue-200" data-check-field="countedQty" aria-label={`Row ${index + 1} counted stock quantity`} type="number" step="any" value={line.countedQty ?? ''} placeholder="" onChange={(event) => {
                    const value = event.target.value;
                    if (value === '') updateLine(index, { countedQty: undefined });
                    else updateLine(index, { countedQty: parseNum(value) });
                  }} onKeyDown={(event) => handleGridKeyDown(event, index, 'countedQty')} /></td>}
                  {visibleColumns.includes('Difference') && <td className={`num font-semibold ${difference > 0 ? 'text-green-700' : difference < 0 ? 'text-fiery' : 'text-slate-500'}`}>{line.countedQty === undefined ? '' : `${difference > 0 ? '+' : ''}${formatQty(difference)}`}</td>}
                  <td><button type="button" className="btn btn-ghost btn-sm btn-icon text-fiery" title="Remove row" aria-label={`Remove row ${index + 1}`} onClick={() => removeLine(index)}><Trash2 className="h-3.5 w-3.5" /></button></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={Math.max(1, visibleColumns.length - 3)}> {countedLines.length} of {activeLines.length} items checked</td>
              {visibleColumns.includes('A/L Qty') && <td />}
              {visibleColumns.includes('Stk Qty') && <td />}
              {visibleColumns.includes('Difference') && <td className="num">+{formatQty(excess)} / -{formatQty(shortage)}</td>}
              <td />
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Stock checking totals">
        <SummaryCard label="Items (checked / loaded)" value={`${countedLines.length} / ${activeLines.length}`} />
        <SummaryCard label="Excess (Add)" value={formatQty(excess)} tone="add" />
        <SummaryCard label="Shortage (Less)" value={formatQty(shortage)} tone="less" />
        <SummaryCard label="Value Add / Less" value={`${formatMoneyPlain(addValue)} / ${formatMoneyPlain(lessValue)}`} />
      </section>

      <footer className="no-print flex flex-col gap-2 rounded-xl border border-blue-200 bg-white/80 p-2">
        <p className="text-xs text-slate-500">Empty Code + Enter = Item Name · Space in Item Name = item list · Enter = next column · Blank Stk Qty = not counted</p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDeleteOpen(true)}>Delete</Button>
          <Button variant="outline" icon={<AlertTriangle className="h-4 w-4" />} onClick={updateNegativeStock}>UpdateNeg Stk</Button>
          <Button variant="navy" icon={<Database className="h-4 w-4" />} onClick={() => updateMaster(countedLines)}>Update Master</Button>
          <Button variant="outline" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Print</Button>
          <Button variant="navy" icon={<ListChecks className="h-4 w-4" />} onClick={() => navigate('/entry/stock-checking/display')}>Display</Button>
          <Button variant="outline" icon={<FilePlus2 className="h-4 w-4" />} onClick={newCheck}>New (F2)</Button>
          <Button variant="outline" icon={<Settings2 className="h-4 w-4" />} onClick={() => setOptionsOpen(true)}>Options</Button>
          <Button variant="primary" icon={<Save className="h-4 w-4" />} onClick={save}>Save</Button>
        </div>
      </footer>

      <datalist id="stock-checking-items">{items.map((item) => <option key={item.id} value={item.name}>{item.code} · {item.unit}</option>)}</datalist>

      <Modal open={itemsOpen} onClose={() => setItemsOpen(false)} title="Select stock-checking items" width="max-w-3xl" footer={<Button variant="outline" onClick={() => setItemsOpen(false)}>Cancel</Button>}>
        <div className="space-y-3">
          <TextInput autoFocus value={itemQuery} onChange={(event) => setItemQuery(event.target.value)} placeholder="Search by item name, code or barcode" aria-label="Search stock-checking items" />
          <div className="max-h-[55vh] overflow-auto rounded-lg border border-cream-200">
            <table className="data-table">
              <thead><tr><th>Code</th><th>Item Name</th><th>Unit</th><th className="num">System Stock</th></tr></thead>
              <tbody>{filteredItems.map((item) => (
                <tr key={item.id}><td>{item.code}</td><td>{item.name}</td><td>{item.unit}</td><td className="num">{formatQty(item.stock)}</td>
                  <td><Button size="sm" variant="navy" onClick={() => { selectItem(activeRow, item); setItemsOpen(false); focusField(activeRow, 'countedQty'); }}>Select</Button></td>
                </tr>
              ))}</tbody>
            </table>
            {!filteredItems.length && <p className="p-5 text-center text-sm text-slate-500">No matching items.</p>}
          </div>
        </div>
      </Modal>

      <Modal open={optionsOpen} onClose={() => setOptionsOpen(false)} title="Stock Checking options" width="max-w-lg" footer={<Button variant="primary" onClick={() => setOptionsOpen(false)}>Done</Button>}>
        <div className="space-y-4">
          <label className="flex items-center gap-2 rounded-lg border border-cream-200 p-3 text-sm">
            <input type="checkbox" checked={allowNegativeStock} onChange={(event) => setAllowNegativeStock(event.target.checked)} />
            Allow negative stock quantities
          </label>
          <Field label="Rate used to value differences">
            <SelectInput value={rateSource} onChange={(event) => setRateSource(event.target.value as 'purchase' | 'sales')}>
              <option value="purchase">Purchase rate</option><option value="sales">Sales rate</option>
            </SelectInput>
          </Field>
          <div>
            <h3 className="mb-2 text-sm font-bold text-navy">Visible columns</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {columns.map((column) => (
                <label key={column} className={`flex items-center gap-2 rounded-lg border border-cream-200 px-2 py-1.5 text-sm ${column === 'Barcode' ? 'opacity-70' : ''}`}>
                  <input type="checkbox" checked={visibleColumns.includes(column)} disabled={column === 'Barcode' && !addBarcodeQty} onChange={() => toggleColumn(column)} />
                  {column}
                </label>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-500">Right-click a column heading to hide or restore columns. Stock updates remain in the browser session only.</p>
        </div>
      </Modal>

      {contextMenu && (
        <div className="fixed z-50 w-56 rounded-lg border border-blue-200 bg-white p-2 shadow-pop" style={{ left: Math.min(contextMenu.x, window.innerWidth - 235), top: Math.min(contextMenu.y, window.innerHeight - 250) }} role="menu" aria-label="Column visibility">
          <p className="px-2 pb-1 text-xs font-bold uppercase text-slate-500">{contextMenu.column}: columns</p>
          {columns.map((column) => (
            <button type="button" key={column} role="menuitemcheckbox" aria-checked={visibleColumns.includes(column)} disabled={column === 'Barcode' && !addBarcodeQty} onClick={() => toggleColumn(column)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-steel-100 disabled:opacity-40">
              <span className="w-4 text-center">{visibleColumns.includes(column) ? '✓' : ''}</span>{column}
            </button>
          ))}
          <button type="button" onClick={() => setContextMenu(null)} className="mt-1 w-full border-t border-slate-100 px-2 pt-2 text-left text-xs font-semibold text-navy">Close</button>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title={currentRecord ? `Delete ${currentRecord.no}?` : 'Clear this stock check?'}
        message={currentRecord ? 'This removes the saved stock check. Item stock changes already applied to the demo session will not be reversed.' : 'This clears the current unsaved item list and remarks.'}
        confirmLabel={currentRecord ? 'Delete stock check' : 'Clear stock check'}
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
