import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { Trash2, Plus } from 'lucide-react';
import type { BillLine, Item } from '../../types';
import { computeLine, emptyLine } from '../../utils/billing';
import { formatMoneyPlain, formatQty, parseNum, round2 } from '../../utils/money';
import { cn } from '../../utils/cn';

export type PriceMode = 'rate' | 'mrp' | 'wholesale';

interface ItemGridProps {
  lines: BillLine[];
  onChange: (lines: BillLine[]) => void;
  items: Item[];
  priceMode?: PriceMode;
  onPriceModeChange?: (mode: PriceMode) => void;
  onEmptyRowEnter?: () => void;
  onActiveRowChange?: (row: number) => void;
  focusTarget?: { row: number; field: string; token: number };
  showMrp?: boolean;
  showBatch?: boolean;
  showDiscount?: boolean;
  showTax?: boolean;
  showTaxRate?: boolean;
  showProfit?: boolean;
  purchaseMode?: boolean;
  readOnly?: boolean;
  /** Stock-only grids (stock journal, checking) hide every money column. */
  stockOnly?: boolean;
}

const newUid = () => Math.random().toString(36).slice(2, 10);

/** Price the line will be filled with, based on the selected price list. */
const priceFor = (item: Item, mode: PriceMode, purchaseMode = false) => purchaseMode
  ? item.purchaseRate ?? item.rate
  : mode === 'mrp' ? item.mrp : mode === 'wholesale' ? round2(item.rate * 0.95) : item.rate;

/**
 * Editable billing grid used by every voucher form and the POS.
 * Type or scan into "Item name" to search; Enter picks the highlighted item; the last row
 * adds a new line automatically; Ctrl+Delete removes the current line.
 */
export function ItemGrid({
  lines, onChange, items, priceMode = 'rate', onPriceModeChange, onEmptyRowEnter, onActiveRowChange, focusTarget, showMrp = false, showBatch = false, showDiscount = true,
  showTax = true, showTaxRate = true, showProfit = false, purchaseMode = false, readOnly = false, stockOnly = false,
}: ItemGridProps) {
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focusTarget) return;
    const target = gridRef.current?.querySelector<HTMLElement>(
      `tr[data-row-index="${focusTarget.row}"] [data-grid-field="${focusTarget.field}"]`,
    );
    target?.focus();
  }, [focusTarget]);

  const columnClass = (label: string) => hiddenColumns.includes(label) ? 'hidden' : undefined;
  const toggleColumn = (event: ReactMouseEvent<HTMLTableCellElement>, label: string) => {
    event.preventDefault();
    setHiddenColumns((current) => current.includes(label) ? current.filter((column) => column !== label) : [...current, label]);
  };

  const moveOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.ctrlKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    const row = event.currentTarget.closest<HTMLTableRowElement>('tr');
    const rowIndex = Number(row?.dataset.rowIndex);
    if (!row || Number.isNaN(rowIndex)) return;
    const fields = Array.from(row.querySelectorAll<HTMLInputElement>('input[data-grid-field]:not(:disabled)'));
    const next = fields[fields.indexOf(event.currentTarget) + 1];
    if (next) {
      next.focus();
      return;
    }
    if (rowIndex === lines.length - 1) {
      onEmptyRowEnter?.();
      return;
    }
    gridRef.current?.querySelector<HTMLInputElement>(`tr[data-row-index="${rowIndex + 1}"] [data-grid-field="item"]`)?.focus();
  };

  const changeLinePrice = (index: number, mode: PriceMode) => {
    const item = items.find((candidate) => candidate.id === lines[index]?.itemId);
    if (!item) return;
    onPriceModeChange?.(mode);
    update(index, { rate: priceFor(item, mode, purchaseMode) });
  };

  const ensureTrailingRow = (list: BillLine[]) => {
    const last = list[list.length - 1];
    return last && last.name ? [...list, emptyLine(newUid())] : list;
  };

  const update = (index: number, patch: Partial<BillLine>) => {
    const next = lines.map((l, i) => (i === index ? computeLine({ ...l, ...patch }) : l));
    onChange(ensureTrailingRow(next));
  };

  const pick = (index: number, item: Item) => {
    const rate = priceFor(item, priceMode, purchaseMode);
    update(index, {
      itemId: item.id, code: item.code, name: item.name, unit: item.unit, mrp: item.mrp,
      rate: stockOnly ? 0 : rate, gstRate: item.gstRate, detail: item.brand,
      batchNo: showBatch ? `B${item.code.slice(-3)}` : '', qty: lines[index]?.qty || 1,
    });
  };

  const removeRow = (index: number) => {
    const next = lines.filter((_, i) => i !== index);
    onChange(next.length ? ensureTrailingRow(next) : [emptyLine(newUid())]);
  };

  const cols = purchaseMode ? [
    { label: '#', show: true, cls: 'w-10 text-center' },
    { label: 'Code', show: true },
    { label: 'Item name', show: true, cls: 'min-w-[16rem]' },
    { label: 'Batch', show: showBatch },
    { label: 'Unit', show: true },
    { label: 'Qty', show: true, num: true },
    { label: 'Rate+Tax', show: showTax, num: true },
    { label: 'Rate', show: true, num: true },
    { label: 'Disc %', show: showDiscount, num: true },
    { label: 'Disc Amt', show: showDiscount, num: true },
    { label: 'MRP', show: showMrp, num: true },
    { label: 'Margin %', show: true, num: true },
    { label: 'Sales', show: true, num: true },
    { label: 'Amount', show: true, num: true },
    { label: 'Taxation', show: showTax, num: true },
    { label: 'Tot Amt', show: true, num: true },
    { label: 'Net Rate', show: true, num: true },
    { label: '', show: !readOnly },
  ].filter((c) => c.show) : [
    { label: '#', show: true, cls: 'w-10 text-center' },
    { label: 'Code', show: true },
    { label: 'Item name', show: true, cls: 'min-w-[16rem]' },
    { label: 'Detail', show: true, cls: 'min-w-[7rem]' },
    { label: 'Batch', show: showBatch },
    { label: 'Unit', show: true },
    { label: 'MRP', show: showMrp && !stockOnly, num: true },
    { label: 'Rate+Tax', show: showTax && !stockOnly, num: true },
    { label: 'Rate', show: !stockOnly, num: true },
    { label: 'Qty', show: true, num: true },
    { label: 'Disc %', show: showDiscount && !stockOnly, num: true },
    { label: 'Amount', show: !stockOnly, num: true },
    { label: 'Tax %', show: showTax && showTaxRate && !stockOnly, num: true },
    { label: 'Taxation', show: showTax && !stockOnly, num: true },
    { label: 'Tot Amt', show: !stockOnly, num: true },
    { label: 'Profit', show: showProfit && !stockOnly, num: true },
    { label: 'Profit %', show: showProfit && !stockOnly, num: true },
    { label: '', show: !readOnly },
  ].filter((c) => c.show);

  const qtyIndex = cols.filter((c) => c.label !== 'Qty' && cols.findIndex((entry) => entry.label === c.label) < cols.findIndex((entry) => entry.label === 'Qty') && !hiddenColumns.includes(c.label)).length;

  const totals = useMemo(() => ({
    qty: round2(lines.reduce((a, l) => a + (l.name ? l.qty : 0), 0)),
    amount: round2(lines.reduce((a, l) => a + l.amount, 0)),
    tax: round2(lines.reduce((a, l) => a + l.taxAmt, 0)),
    total: round2(lines.reduce((a, l) => a + l.total, 0)),
  }), [lines]);

  return (
    <div
      ref={gridRef}
      className="table-wrap scroll-thin max-h-[52vh] overflow-auto rounded-lg border border-cream-200"
      onFocusCapture={(event) => {
        const row = event.target instanceof HTMLElement ? event.target.closest<HTMLTableRowElement>('tr[data-row-index]') : null;
        if (row) onActiveRowChange?.(Number(row.dataset.rowIndex));
      }}
      onKeyDownCapture={(event) => {
        if (event.key !== 'Delete' || !event.ctrlKey) return;
        const row = event.target instanceof HTMLElement ? event.target.closest<HTMLTableRowElement>('tr[data-row-index]') : null;
        if (!row) return;
        event.preventDefault();
        event.stopPropagation();
        removeRow(Number(row.dataset.rowIndex));
      }}
    >
      <table className="data-table min-w-[900px]">
        <thead>
          <tr>
            {cols.map((c) => <th key={c.label || 'act'} onContextMenu={(event) => c.label && toggleColumn(event, c.label)} title={c.label ? 'Right-click to hide this column' : undefined} className={cn(c.num && 'num', c.cls, columnClass(c.label))}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => {
            const profit = line.name && !stockOnly ? round2((line.rate - line.rate * 0.8) * line.qty) : 0;
            const profitPct = line.amount ? round2((profit / line.amount) * 100) : 0;
            const saleRate = items.find((item) => item.id === line.itemId)?.rate ?? 0;
            const netRate = line.qty ? round2(line.taxable / line.qty) : 0;
            const marginPct = saleRate ? round2(((saleRate - netRate) / saleRate) * 100) : 0;
            const isLast = index === lines.length - 1;
            return (
              <tr key={line.uid} data-row-index={index} className={cn(isLast && !line.name && 'bg-steel-100/40')}>
                <td className={cn('text-center text-slate-500', columnClass('#'))}>{index + 1}</td>
                <td className={cn('font-mono text-xs text-slate-600', columnClass('Code'))}>
                  {!readOnly && !stockOnly ? (
                    <input
                      data-grid-field="code"
                      className="input input-sm w-24 font-mono"
                      value={line.code}
                      placeholder="Code"
                      aria-label="Item code"
                      onChange={(event) => {
                        const code = event.target.value;
                        const matched = items.find((item) => item.code.toLowerCase() === code.trim().toLowerCase() || item.barcode === code.trim());
                        if (matched) pick(index, matched);
                        else update(index, { code, itemId: undefined, name: '' });
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') return;
                        event.preventDefault();
                        const matched = items.find((item) => item.code.toLowerCase() === line.code.trim().toLowerCase() || item.barcode === line.code.trim());
                        if (matched) {
                          pick(index, matched);
                          const nextField = purchaseMode ? (showBatch ? 'batch' : 'qty') : 'detail';
                          window.setTimeout(() => gridRef.current?.querySelector<HTMLInputElement>(`tr[data-row-index="${index}"] [data-grid-field="${nextField}"]`)?.focus(), 0);
                        } else {
                          gridRef.current?.querySelector<HTMLInputElement>(`tr[data-row-index="${index}"] [data-grid-field="item"]`)?.focus();
                        }
                      }}
                    />
                  ) : line.code || <span className="text-slate-300">—</span>}
                </td>
                <td className="!whitespace-normal">
                  <ItemPicker
                    value={line.name}
                    items={items}
                    purchaseMode={purchaseMode}
                    disabled={readOnly}
                    placeholder={index === 0 ? 'SPACE = item list, or type / scan' : 'Item name'}
                    onPick={(item) => pick(index, item)}
                    onType={(text) => update(index, { name: text, itemId: undefined, code: '' })}
                    onRemove={() => removeRow(index)}
                    onEmptyRowEnter={onEmptyRowEnter}
                    isLast={isLast}
                    data-grid-field="item"
                    onAdvance={() => {
                      const nextField = purchaseMode ? (showBatch ? 'batch' : 'qty') : 'detail';
                      window.setTimeout(() => gridRef.current?.querySelector<HTMLInputElement>(`tr[data-row-index="${index}"] [data-grid-field="${nextField}"]`)?.focus(), 0);
                    }}
                  />
                </td>
                {!purchaseMode && <td className={columnClass('Detail')}><input data-grid-field="detail" className="input input-sm min-w-[7rem]" value={line.detail} disabled={readOnly} onChange={(e) => update(index, { detail: e.target.value })} onKeyDown={moveOnEnter} aria-label="Detail" /></td>}
                {showBatch && <td className={columnClass('Batch')}><input data-grid-field="batch" className="input input-sm w-24" value={line.batchNo} disabled={readOnly} onChange={(e) => update(index, { batchNo: e.target.value })} onKeyDown={moveOnEnter} aria-label="Batch number" /></td>}
                <td className={columnClass('Unit')}><span className="text-slate-600">{line.unit || '—'}</span></td>
                {purchaseMode && <td className={cn('num', columnClass('Qty'))}><NumInput field="qty" value={line.qty} disabled={readOnly} label="Quantity" step="any" onChange={(v) => update(index, { qty: v })} onKeyDown={moveOnEnter} /></td>}
                {showMrp && !stockOnly && !purchaseMode && <td className={cn('num', columnClass('MRP'))}>{line.mrp ? formatMoneyPlain(line.mrp) : '—'}</td>}
                {showTax && !stockOnly && <td className={cn('num', columnClass('Rate+Tax'))}>{formatMoneyPlain(round2(line.rate * (1 + line.gstRate / 100)))}</td>}
                {!stockOnly && (
                  <td className={cn('num', columnClass('Rate'))}><NumInput field="rate" value={line.rate} disabled={readOnly} label="Rate" onChange={(v) => update(index, { rate: v })} onKeyDown={(event) => {
                    if (['m', 's', 'w'].includes(event.key.toLowerCase())) {
                      event.preventDefault();
                      const mode = event.key.toLowerCase() === 'm' ? 'mrp' : event.key.toLowerCase() === 'w' ? 'wholesale' : 'rate';
                      changeLinePrice(index, mode);
                    } else moveOnEnter(event);
                  }} /></td>
                )}
                {!purchaseMode && <td className={cn('num', columnClass('Qty'))}><NumInput field="qty" value={line.qty} disabled={readOnly} label="Quantity" step="any" onChange={(v) => update(index, { qty: v })} onKeyDown={moveOnEnter} /></td>}
                {showDiscount && !stockOnly && <td className={cn('num', columnClass('Disc %'))}><NumInput field="discount" value={line.discPct} disabled={readOnly} label="Discount percent" onChange={(v) => update(index, { discPct: Math.min(100, v) })} onKeyDown={moveOnEnter} /></td>}
                {purchaseMode && showDiscount && !stockOnly && <td className={cn('num', columnClass('Disc Amt'))}>{line.name ? formatMoneyPlain(line.discAmt) : ''}</td>}
                {purchaseMode && showMrp && !stockOnly && <td className={cn('num', columnClass('MRP'))}>{line.mrp ? formatMoneyPlain(line.mrp) : '—'}</td>}
                {purchaseMode && !stockOnly && <><td className={cn('num', columnClass('Margin %'))}>{line.name ? `${marginPct}%` : ''}</td><td className={cn('num', columnClass('Sales'))}>{line.name ? formatMoneyPlain(saleRate) : ''}</td></>}
                {!stockOnly && <td className={cn('num', columnClass('Amount'))}>{line.name ? formatMoneyPlain(line.amount) : ''}</td>}
                {showTax && showTaxRate && !stockOnly && !purchaseMode && <td className={cn('num', columnClass('Tax %'))}>{line.gstRate}%</td>}
                {showTax && !stockOnly && <td className={cn('num', columnClass('Taxation'))}>{formatMoneyPlain(line.taxAmt)}</td>}
                {!stockOnly && <td className={cn('num font-semibold text-navy', columnClass('Tot Amt'))}>{formatMoneyPlain(line.total)}</td>}
                {showProfit && !stockOnly && <td className={cn('num text-[#2e7d4f]', columnClass('Profit'))}>{line.name ? formatMoneyPlain(profit) : ''}</td>}
                {showProfit && !stockOnly && <td className={cn('num text-[#2e7d4f]', columnClass('Profit %'))}>{line.name ? `${profitPct}%` : ''}</td>}
                {purchaseMode && !stockOnly && <td className={cn('num', columnClass('Net Rate'))}>{line.name ? formatMoneyPlain(netRate) : ''}</td>}
                {!readOnly && (
                  <td className="text-center">
                    {line.name && (
                      <button type="button" className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-fiery" onClick={() => removeRow(index)} aria-label={`Remove line ${index + 1}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
        {!stockOnly && (
          <tfoot>
            {purchaseMode ? <tr>
              <td colSpan={Math.max(1, qtyIndex)}>Total</td>
              <td className={cn('num', columnClass('Qty'))}>{formatQty(totals.qty)}</td>
              <td className={columnClass('Rate+Tax')} />
              <td className={columnClass('Rate')} />
              <td className={columnClass('Disc %')} />
              <td className={columnClass('Disc Amt')}>{formatMoneyPlain(lines.reduce((sum, line) => sum + line.discAmt, 0))}</td>
              <td className={columnClass('MRP')} />
              <td className={columnClass('Margin %')} />
              <td className={columnClass('Sales')} />
              <td className={cn('num', columnClass('Amount'))}>{formatMoneyPlain(totals.amount)}</td>
              <td className={cn('num', columnClass('Taxation'))}>{formatMoneyPlain(totals.tax)}</td>
              <td className={cn('num', columnClass('Tot Amt'))}>{formatMoneyPlain(totals.total)}</td>
              <td className={columnClass('Net Rate')} />
              {!readOnly && <td />}
            </tr> : <tr>
              <td colSpan={Math.max(1, qtyIndex)}>Total</td>
              <td className={cn('num', columnClass('Qty'))}>{formatQty(totals.qty)}</td>
              {showDiscount && <td className={columnClass('Disc %')} />}
              {!stockOnly && <td className={cn('num', columnClass('Amount'))}>{formatMoneyPlain(totals.amount)}</td>}
              {showTax && !stockOnly && showTaxRate && <td className={columnClass('Tax %')} />}
              {showTax && !stockOnly && <td className={cn('num', columnClass('Taxation'))}>{formatMoneyPlain(totals.tax)}</td>}
              {!stockOnly && <td className={cn('num', columnClass('Tot Amt'))}>{formatMoneyPlain(totals.total)}</td>}
              {showProfit && !stockOnly && <><td className={columnClass('Profit')} /><td className={columnClass('Profit %')} /></>}
              {!readOnly && <td />}
            </tr>}
          </tfoot>
        )}
      </table>
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 border-t border-cream-200 bg-cream-50 px-3 py-1.5 text-xs text-slate-500">
          <Plus className="h-3.5 w-3.5" /> Enter moves through cells · Space opens the item list · Ctrl+Delete removes a row · right-click a heading to hide it.
          {hiddenColumns.map((column) => (
            <button key={column} type="button" className="rounded-full bg-steel-100 px-2 py-0.5 font-semibold text-navy hover:bg-steel-200" onClick={() => setHiddenColumns((current) => current.filter((hidden) => hidden !== column))}>
              Show {column}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Numeric cell that keeps typing smooth and never produces NaN. */
function NumInput({ value, onChange, disabled, label, step = '0.01', field, onKeyDown }: { value: number; onChange: (v: number) => void; disabled?: boolean; label: string; step?: string; field: string; onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      step={step}
      aria-label={label}
      data-grid-field={field}
      value={value === 0 ? '' : value}
      placeholder="0"
      disabled={disabled}
      onChange={(e) => onChange(Math.max(0, parseNum(e.target.value)))}
      onKeyDown={onKeyDown}
      onFocus={(e) => e.currentTarget.select()}
      className="input input-sm input-num w-24"
    />
  );
}

/** Item search with keyboard navigation; the dropdown filters by name, code or barcode. */
function ItemPicker({ value, items, onPick, onType, onRemove, onEmptyRowEnter, onAdvance, isLast, placeholder, disabled, purchaseMode = false, 'data-grid-field': gridField }: {
  value: string; items: Item[]; onPick: (i: Item) => void; onType: (t: string) => void; onRemove: () => void; onEmptyRowEnter?: () => void; onAdvance: () => void; isLast: boolean; placeholder: string; disabled?: boolean; purchaseMode?: boolean; 'data-grid-field': string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [listRequested, setListRequested] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return items.slice(0, 8);
    return items.filter((i) => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q) || i.barcode === value.trim()).slice(0, 8);
  }, [value, items]);

  useEffect(() => {
    const close = (e: MouseEvent) => boxRef.current && !boxRef.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, matches.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!value.trim() && isLast && !listRequested) { onEmptyRowEnter?.(); return; }
      const exact = items.find((i) => i.barcode === value.trim());
      const chosen = exact ?? matches[active];
      if (chosen) { onPick(chosen); setOpen(false); setListRequested(false); onAdvance(); }
    }
    if (e.key === 'Delete' && e.ctrlKey) { e.preventDefault(); onRemove(); }
    if (e.key === ' ' && !value) { e.preventDefault(); setOpen(true); setListRequested(true); }
  };

  return (
    <div ref={boxRef} className="relative min-w-[14rem]">
      <input
        className="input input-sm"
        data-grid-field={gridField}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-label="Item name"
        autoComplete="off"
        onChange={(e) => { onType(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && !disabled && matches.length > 0 && (
        <ul role="listbox" className="scroll-thin absolute left-0 top-full z-30 mt-1 max-h-64 w-[min(28rem,90vw)] overflow-y-auto rounded-lg border border-steel-200 bg-white py-1 shadow-pop">
          {matches.map((it, idx) => (
            <li key={it.id} role="option" aria-selected={idx === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(idx)}
                onClick={() => { onPick(it); setOpen(false); }}
                className={cn('flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm', idx === active ? 'bg-steel-100' : 'hover:bg-cream-50')}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-navy">{it.name}</span>
                  <span className="block text-[.7rem] text-slate-500">{it.code} · {it.brand} · GST {it.gstRate}% · stock {it.stock} {it.unit}</span>
                </span>
                <span className="shrink-0 text-xs font-bold tabular-nums text-maroon">₹{formatMoneyPlain(purchaseMode ? it.purchaseRate ?? it.rate : it.rate)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const blankLines = (count = 1): BillLine[] => Array.from({ length: count }, () => emptyLine(newUid()));
export const newLineId = newUid;
