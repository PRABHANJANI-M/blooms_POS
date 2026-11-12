import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FilePlus2, ListChecks, Printer, Save, Settings2, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, SelectInput, TextArea, TextInput } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useHotkeys } from '../../hooks/useHotkeys';
import { useAppStore } from '../../store/appStore';
import { NO_RECORDS, NO_ROWS, useDemoStore } from '../../store/demoStore';
import { todayISO, financialYearLabel } from '../../utils/date';
import { formatINR, formatMoneyPlain, parseNum, round2 } from '../../utils/money';
import type { VoucherEntryLine, VoucherRow } from '../../types';

type VoucherType = 'Receipt' | 'Payment' | 'Contra' | 'Journal' | 'Memo';
type Column = 'Type' | 'Particulars' | 'Debit' | 'Credit' | 'Remarks';
type Entry = VoucherEntryLine;
type EntryWithBlank = Entry & { blank?: boolean };

const voucherTypes: VoucherType[] = ['Receipt', 'Payment', 'Contra', 'Journal', 'Memo'];
const columns: Column[] = ['Type', 'Particulars', 'Debit', 'Credit', 'Remarks'];
const blankEntry = (side: Entry['side'] = 'Cr'): EntryWithBlank => ({
  uid: Math.random().toString(36).slice(2, 10), side, account: '', debit: 0, credit: 0, blank: true,
});
const firstNumber = (rows: VoucherRow[]) => Math.max(0, ...rows.map((row) => Number(row.no.replace(/\D/g, '')) || 0)) + 1;
const prefixes: Record<VoucherType, string> = { Receipt: 'RCPT', Payment: 'PAY', Contra: 'CON', Journal: 'JRN', Memo: 'MEMO' };
const defaultSeries: Record<VoucherType, string> = { Receipt: 'Receipt', Payment: 'Payment', Contra: 'Contra', Journal: 'Journal', Memo: 'Memo' };
const defaultSide: Record<VoucherType, Entry['side']> = { Receipt: 'Cr', Payment: 'Dr', Contra: 'Dr', Journal: 'Dr', Memo: 'Dr' };

export function VoucherEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useAppStore((state) => state.toast);
  const vouchers = useDemoStore((state) => state.vouchers.voucher ?? NO_ROWS);
  const ledgers = useDemoStore((state) => state.masters.ledgers ?? NO_RECORDS);
  const upsertVoucher = useDemoStore((state) => state.upsertVoucher);
  const removeVoucher = useDemoStore((state) => state.removeVoucher);
  const [type, setType] = useState<VoucherType>('Receipt');
  const [series, setSeries] = useState(defaultSeries.Receipt);
  const [number, setNumber] = useState(() => firstNumber(vouchers));
  const [date, setDate] = useState(todayISO());
  const [gstNature, setGstNature] = useState('-- None --');
  const [narration, setNarration] = useState('');
  const [carryVoucher, setCarryVoucher] = useState(false);
  const [multiEntry, setMultiEntry] = useState(false);
  const [entries, setEntries] = useState<EntryWithBlank[]>([blankEntry('Cr')]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<Column[]>(['Remarks']);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; column: Column } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const narrationRef = useRef<HTMLTextAreaElement>(null);
  const visibleColumns = columns.filter((column) => !hiddenColumns.includes(column));
  const activeEntries = entries.filter((entry) => !entry.blank && entry.account.trim() && (entry.debit > 0 || entry.credit > 0));
  const debit = round2(activeEntries.reduce((sum, entry) => sum + entry.debit, 0));
  const credit = round2(activeEntries.reduce((sum, entry) => sum + entry.credit, 0));
  const difference = round2(debit - credit);
  const balanced = debit > 0 && difference === 0;
  const currentRecord = vouchers.find((record) => record.id === activeId);
  const activeLedgers = useMemo(() => ledgers.filter((ledger) => ledger.active !== false).map((ledger) => String(ledger.name ?? '')).filter(Boolean), [ledgers]);
  const dayName = new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long' });

  const reset = (keepNarration = false, nextVoucherNumber?: number) => {
    setActiveId(null);
    setType('Receipt');
    setSeries(defaultSeries.Receipt);
    setNumber(nextVoucherNumber ?? firstNumber(vouchers));
    setDate(todayISO());
    setGstNature('-- None --');
    setEntries([blankEntry('Cr')]);
    if (!keepNarration) setNarration('');
    setCarryVoucher(false);
    setMultiEntry(false);
  };
  const changeType = (nextType: VoucherType) => {
    setType(nextType);
    setSeries(defaultSeries[nextType]);
    setEntries((current) => current.map((entry) => entry.blank ? { ...entry, side: defaultSide[nextType] } : entry));
  };
  const loadRecord = (record: VoucherRow) => {
    const savedType = voucherTypes.includes(record.status as VoucherType) ? record.status as VoucherType : 'Receipt';
    const metadata = record.extra ?? '';
    setActiveId(record.id);
    setType(savedType);
    setSeries(record.series || defaultSeries[savedType]);
    setNumber(Number(record.no.replace(/\D/g, '')) || 1);
    setDate(record.date);
    setNarration(metadata.match(/(?:^| · )Narration: ([^·]*)/)?.[1]?.trim() ?? '');
    setGstNature(metadata.match(/(?:^| · )GST Nature: ([^·]*)/)?.[1]?.trim() ?? '-- None --');
    setEntries(record.voucherEntries?.length ? [...record.voucherEntries.map((entry) => ({ ...entry })), blankEntry(defaultSide[savedType])] : [blankEntry(defaultSide[savedType])]);
  };
  useEffect(() => {
    const state = location.state as { voucherId?: string; voucherCopy?: VoucherRow } | null;
    if (!state?.voucherId && !state?.voucherCopy) return;
    const record = state.voucherId
      ? vouchers.find((row) => row.id === state.voucherId)
      : state.voucherCopy;
    if (record) {
      loadRecord(record);
      if (state.voucherCopy) {
        setActiveId(null);
        setNumber(firstNumber(vouchers));
        setEntries(record.voucherEntries?.length
          ? [...record.voucherEntries.map((entry) => ({ ...entry, uid: Math.random().toString(36).slice(2, 10) })), blankEntry(defaultSide[(record.status as VoucherType) || 'Receipt'])]
          : [blankEntry(defaultSide[(record.status as VoucherType) || 'Receipt'])]);
      }
    } else toast({ tone: 'error', title: 'Voucher not found', message: 'The selected session entry is no longer available.' });
    navigate(location.pathname, { replace: true, state: null });
  }, [location.key, location.pathname, location.state, navigate, toast, vouchers]);
  const moveRecord = (direction: -1 | 1) => {
    const ordered = [...vouchers].sort((a, b) => Number(a.no.replace(/\D/g, '')) - Number(b.no.replace(/\D/g, '')));
    const index = ordered.findIndex((record) => record.id === activeId);
    const target = index < 0
      ? ordered.find((record) => direction < 0 ? Number(record.no.replace(/\D/g, '')) < number : Number(record.no.replace(/\D/g, '')) > number)
      : ordered[index + direction];
    if (target) loadRecord(target);
    else toast({ tone: 'info', title: 'No voucher found', message: `There is no ${direction < 0 ? 'previous' : 'next'} saved voucher.` });
  };
  const updateEntry = (uid: string, patch: Partial<EntryWithBlank>) => {
    setEntries((current) => {
      const next = current.map((entry) => entry.uid === uid ? { ...entry, ...patch, blank: false } : entry);
      const changed = next.find((entry) => entry.uid === uid);
      if (changed && !next.some((entry) => entry.blank) && (changed.account || changed.debit || changed.credit)) next.push(blankEntry(defaultSide[type]));
      return next;
    });
  };
  const removeEntry = (uid: string) => setEntries((current) => {
    const next = current.filter((entry) => entry.uid !== uid);
    return next.length ? next : [blankEntry(defaultSide[type])];
  });
  const focusCell = (index: number, name: string) => window.setTimeout(() => {
    tableRef.current?.querySelector<HTMLInputElement | HTMLSelectElement>(`tr[data-voucher-row="${index}"] [data-voucher-field="${name}"]`)?.focus();
  }, 0);
  const handleCellKey = (event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>, index: number, field: string) => {
    if (event.key === ' ' && field === 'account' && !event.currentTarget.value) {
      event.preventDefault();
      event.currentTarget.focus();
      return;
    }
    if (event.key !== 'Enter' || event.ctrlKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    const order = ['side', 'account', 'debit', 'credit'];
    const nextName = order[order.indexOf(field) + 1];
    if (nextName) focusCell(index, nextName);
    else if (index < entries.length - 1) focusCell(index + 1, 'side');
    else {
      setEntries((current) => [...current, blankEntry(defaultSide[type])]);
      focusCell(index + 1, 'side');
    }
  };
  const save = () => {
    if (!activeEntries.length) {
      toast({ tone: 'error', title: 'No voucher entries', message: 'Select ledger accounts and enter debit or credit amounts.' });
      return;
    }
    if (!balanced) {
      toast({ tone: 'error', title: 'Debit and credit do not match', message: `Difference ${formatINR(Math.abs(difference))}.` });
      return;
    }
    const id = activeId ?? `vc-${Date.now()}`;
    const extra = [`GST Nature: ${gstNature}`, narration.trim() && `Narration: ${narration.trim()}`].filter(Boolean).join(' · ');
    upsertVoucher('voucher', {
      id,
      no: `${prefixes[type]}-${number}`,
      date,
      series,
      party: activeEntries[0].account,
      amount: debit,
      status: type,
      extra,
      voucherEntries: activeEntries.map(({ uid, side, account, debit: dr, credit: cr, remarks }) => ({ uid, side, account, debit: dr, credit: cr, remarks })),
    });
    setActiveId(id);
    toast({ tone: 'success', title: `${type} ${number} saved`, message: 'Recorded for this browser session only. Ledger balances are not changed.' });
    const nextNo = Math.max(firstNumber(vouchers), number + 1);
    if (carryVoucher) {
      setActiveId(null);
      setNumber(nextNo);
      setEntries([blankEntry(defaultSide[type])]);
    } else reset(false, nextNo);
  };
  const deleteCurrent = () => {
    if (currentRecord) {
      removeVoucher('voucher', currentRecord.id);
      toast({ tone: 'success', title: `Voucher ${currentRecord.no} deleted`, message: 'The session record was removed.' });
    }
    reset();
    setDeleteOpen(false);
  };
  const toggleColumn = (column: Column) => {
    if (!hiddenColumns.includes(column) && visibleColumns.length <= 1) {
      toast({ tone: 'warning', title: 'Keep one visible column', message: 'At least one grid column must remain visible.' });
      return;
    }
    setHiddenColumns((current) => current.includes(column) ? current.filter((item) => item !== column) : [...current, column]);
  };
  const openColumnMenu = (event: MouseEvent<HTMLTableCellElement>, column: Column) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, column });
  };
  const previousRemarks = () => {
    const previous = [...vouchers].sort((a, b) => b.date.localeCompare(a.date))[0];
    const remarks = previous?.extra?.match(/(?:^| · )Narration: ([^·]*)/)?.[1]?.trim();
    if (remarks) setNarration(remarks);
    else toast({ tone: 'info', title: 'No previous remarks', message: 'Save a voucher with narration first.' });
  };
  const copyVoucher = () => {
    const source = currentRecord ?? [...vouchers].sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!source) {
      toast({ tone: 'info', title: 'No voucher to copy', message: 'Save a voucher first, then use Xerox to copy it.' });
      return;
    }
    loadRecord(source);
    setActiveId(null);
    setNumber(firstNumber(vouchers));
    setEntries(source.voucherEntries?.length
      ? [...source.voucherEntries.map((entry) => ({ ...entry, uid: Math.random().toString(36).slice(2, 10) })), blankEntry(defaultSide[(source.status as VoucherType) || 'Receipt'])]
      : [blankEntry(defaultSide[(source.status as VoucherType) || 'Receipt'])]);
  };
  const quickTypes: Record<string, VoucherType> = { F4: 'Contra', F5: 'Payment', F6: 'Receipt', F7: 'Journal', F10: 'Memo' };
  const hotkeys = useMemo(() => ({
    'Alt+S': save,
    'Ctrl+S': save,
    'Alt+N': () => reset(),
    F2: () => reset(),
    'Ctrl+Delete': () => {
      const last = entries.filter((entry) => !entry.blank).at(-1);
      if (last) removeEntry(last.uid);
    },
    PageUp: () => moveRecord(-1),
    PageDown: () => moveRecord(1),
    Escape: () => navigate('/'),
    'Alt+C': () => navigate('/master/ledgers'),
    'Ctrl+R': previousRemarks,
    'Alt+X': copyVoucher,
    'Ctrl+L': () => navigate('/entry/voucher/ledger-statement'),
    'Alt+L': () => navigate('/master/ledgers'),
    F11: () => setHiddenColumns((current) => current.includes('Remarks') ? current.filter((column) => column !== 'Remarks') : [...current, 'Remarks']),
    F4: () => changeType(quickTypes.F4),
    F5: () => changeType(quickTypes.F5),
    F6: () => changeType(quickTypes.F6),
    F7: () => changeType(quickTypes.F7),
    F10: () => changeType(quickTypes.F10),
  }), [activeId, date, entries, gstNature, narration, number, series, type, vouchers]);
  useHotkeys(hotkeys);
  const tableColumns: Record<Column, string> = { Type: 'vch-col-type', Particulars: 'vch-col-particulars', Debit: 'vch-col-amount', Credit: 'vch-col-amount', Remarks: 'vch-col-remarks' };

  return (
    <div className="voucher-entry -mx-3 -mt-3 flex min-h-[calc(100vh-3.5rem)] flex-col gap-2 bg-[#e7f1fc] p-2 sm:-mx-4 sm:-mt-4 sm:p-2">
      <PageHeader variant="bill" title="Voucher Entry" shortcuts="Alt+C = Create Ledger · PgUp / PgDn = previous / next · Ctrl+L = Ledger Statement · Alt+S = Save · Alt+X = Xerox · F11 = Individual Remarks" />

      <div className="voucher-header-grid grid gap-2">
        <section className="grid gap-2 rounded-xl border border-blue-200 bg-white p-2 shadow-panel sm:grid-cols-2">
          <Field label="Vch Type">
            <SelectInput value={type} onChange={(event) => changeType(event.target.value as VoucherType)} aria-label="Voucher type">
              {voucherTypes.map((voucherType) => <option key={voucherType}>{voucherType}</option>)}
            </SelectInput>
          </Field>
          <div className="voucher-current-type" aria-live="polite">{type}</div>
          <Field label="GST Nature" className="sm:col-span-2">
            <SelectInput value={gstNature} aria-label="GST nature" onChange={(event) => setGstNature(event.target.value)}>
              <option>-- None --</option><option>Taxable</option><option>Exempt</option><option>Nil Rated</option><option>Export</option><option>Reverse Charge</option>
            </SelectInput>
          </Field>
        </section>

        <section className="grid content-center gap-2 rounded-xl border border-blue-200 bg-white p-2 shadow-panel sm:grid-cols-[1fr_auto]">
          <Field label="Series">
            <SelectInput value={series} aria-label="Voucher series" onChange={(event) => setSeries(event.target.value)}>
              {[...new Set([defaultSeries[type], 'Default', 'Main series'])].map((item) => <option key={item}>{item}</option>)}
            </SelectInput>
          </Field>
          <div className="flex flex-col items-center justify-center gap-1">
            <span className="text-[.65rem] font-semibold text-slate-500">Vch No</span>
            <div className="flex items-center gap-1">
              <TextInput compact type="number" min={1} value={number} aria-label="Voucher number" onChange={(event) => setNumber(Math.max(1, Math.floor(parseNum(event.target.value))))} />
              <span className="whitespace-nowrap text-[.62rem] text-slate-500">{financialYearLabel(date)}</span>
            </div>
          </div>
          <div className="flex justify-center gap-1 sm:col-span-2">
            <Button size="sm" variant="navy" onClick={() => moveRecord(-1)}>‹ Prev</Button>
            <Button size="sm" variant="navy" onClick={() => moveRecord(1)}>Next ›</Button>
          </div>
        </section>

        <section className="grid content-center gap-2 rounded-xl border border-blue-200 bg-white p-2 shadow-panel sm:grid-cols-[4rem_1fr]">
          <label className="self-center text-xs font-semibold text-navy" htmlFor="voucher-date">Date</label>
          <div>
            <TextInput id="voucher-date" type="date" value={date} aria-label="Voucher date" onChange={(event) => setDate(event.target.value)} />
            <p className="mt-1 text-right text-[.65rem] font-semibold text-blue-700">{dayName}</p>
          </div>
        </section>
      </div>

      <section ref={tableRef} className="min-h-[36vh] flex-1 overflow-auto rounded-xl border border-blue-200 bg-white shadow-panel">
        <table className="data-table voucher-entry-grid">
          <colgroup>{visibleColumns.map((column) => <col key={column} className={tableColumns[column]} />)}</colgroup>
          <thead><tr>{visibleColumns.map((column) => <th key={column} className={column === 'Debit' || column === 'Credit' ? 'num' : ''} onContextMenu={(event) => openColumnMenu(event, column)}>{column}</th>)}</tr></thead>
          <tbody>{entries.map((entry, index) => <tr key={entry.uid} data-voucher-row={index}>
            {visibleColumns.includes('Type') && <td>
              <select className="select input-sm voucher-side-select" value={entry.side} aria-label={`Row ${index + 1} type`} data-voucher-field="side" onChange={(event) => {
                const side = event.target.value as Entry['side'];
                updateEntry(entry.uid, side === 'Dr'
                  ? { side, debit: entry.credit || entry.debit, credit: 0 }
                  : { side, credit: entry.debit || entry.credit, debit: 0 });
              }} onKeyDown={(event) => handleCellKey(event, index, 'side')}>
                <option>Dr</option><option>Cr</option>
              </select>
            </td>}
            {visibleColumns.includes('Particulars') && <td>
              <select className="select input-sm" value={entry.account} aria-label={`Row ${index + 1} particulars`} data-voucher-field="account" onChange={(event) => updateEntry(entry.uid, { account: event.target.value })} onKeyDown={(event) => handleCellKey(event, index, 'account')}>
                <option value="">{index === 0 ? 'SPACE = PARTY / INCOME LIST' : 'Select ledger…'}</option>
                {activeLedgers.map((ledger) => <option key={ledger}>{ledger}</option>)}
              </select>
            </td>}
            {visibleColumns.includes('Debit') && <td><TextInput compact numeric type="number" min={0} step="0.01" value={entry.debit || ''} aria-label={`Row ${index + 1} debit`} data-voucher-field="debit" onChange={(event) => updateEntry(entry.uid, { debit: Math.max(0, parseNum(event.target.value)), credit: 0, side: 'Dr' })} onKeyDown={(event) => handleCellKey(event, index, 'debit')} /></td>}
            {visibleColumns.includes('Credit') && <td><TextInput compact numeric type="number" min={0} step="0.01" value={entry.credit || ''} aria-label={`Row ${index + 1} credit`} data-voucher-field="credit" onChange={(event) => updateEntry(entry.uid, { credit: Math.max(0, parseNum(event.target.value)), debit: 0, side: 'Cr' })} onKeyDown={(event) => handleCellKey(event, index, 'credit')} /></td>}
            {visibleColumns.includes('Remarks') && <td><TextInput compact value={entry.remarks ?? ''} aria-label={`Row ${index + 1} remarks`} data-voucher-field="remarks" onChange={(event) => updateEntry(entry.uid, { remarks: event.target.value })} /></td>}
          </tr>)}</tbody>
          <tfoot><tr>{visibleColumns.map((column) => <td key={column} className={column === 'Debit' || column === 'Credit' ? 'num' : ''}>
            {column === 'Particulars' ? 'Total'
              : column === 'Debit' ? formatMoneyPlain(debit)
                : column === 'Credit' ? formatMoneyPlain(credit)
                  : column === 'Type' && !visibleColumns.includes('Particulars') ? 'Total' : ''}
          </td>)}</tr></tfoot>
        </table>
      </section>

      <div className="voucher-footer-grid grid gap-2">
        <section className="grid gap-1 rounded-xl border border-blue-200 bg-white p-2 shadow-panel">
          <div className="flex flex-wrap gap-3 text-xs font-semibold text-navy">
            <label className="flex items-center gap-1"><input type="checkbox" checked={carryVoucher} onChange={(event) => setCarryVoucher(event.target.checked)} /> Carry voucher</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={multiEntry} onChange={(event) => setMultiEntry(event.target.checked)} /> Multi entry</label>
          </div>
          <Field label="Narration">
            <TextArea ref={narrationRef} rows={2} className="min-h-12 resize-y text-xs" value={narration} aria-label="Voucher narration" onChange={(event) => setNarration(event.target.value)} onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                save();
              }
            }} />
          </Field>
          <p className="flex justify-between text-[.62rem] text-slate-500"><span>Enter = Save · Shift+Enter = new line</span><span>Ctrl+R = previous remarks</span></p>
        </section>
        <section className="flex flex-col justify-between gap-3 rounded-xl border border-blue-200 bg-white p-2 shadow-panel">
          <div className="flex items-center justify-between px-1 text-xs text-slate-500"><span>Total</span><strong className="text-navy">{formatINR(debit)}</strong></div>
          <div className="voucher-action-buttons no-print">
            <Button size="sm" variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDeleteOpen(true)}>Delete</Button>
            <Button size="sm" variant="outline" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Print</Button>
            <Button size="sm" variant="navy" icon={<ListChecks className="h-4 w-4" />} onClick={() => navigate('/entry/voucher/display')}>Display</Button>
            <Button size="sm" variant="outline" icon={<FilePlus2 className="h-4 w-4" />} onClick={() => reset()}>New</Button>
            <Button size="sm" variant="outline" icon={<Settings2 className="h-4 w-4" />} onClick={() => setOptionsOpen(true)}>Options</Button>
            <Button size="sm" variant="primary" icon={<Save className="h-4 w-4" />} onClick={save}>Save</Button>
          </div>
        </section>
      </div>

      <section className="voucher-type-switcher no-print rounded-full border border-blue-200 bg-white p-1.5">
        {(['Contra', 'Payment', 'Receipt', 'Journal', 'Memo'] as const).map((voucherType, index) => (
          <button key={voucherType} type="button" className={`voucher-type-chip voucher-type-chip-${voucherType.toLowerCase()} ${type === voucherType ? 'is-active' : ''}`} onClick={() => changeType(voucherType)}>
            <span>{['⇄', '⇧', '♟', '▣', '▰'][index]}</span> F{index === 0 ? 4 : index === 1 ? 5 : index === 2 ? 6 : index === 3 ? 7 : 10}-{voucherType}
          </button>
        ))}
      </section>

      {contextMenu && <div className="fixed z-50 w-48 rounded-lg border border-blue-200 bg-white p-2 shadow-pop" style={{ left: Math.min(contextMenu.x, window.innerWidth - 200), top: Math.min(contextMenu.y, window.innerHeight - 140) }} role="menu" aria-label="Voucher column menu">
        <button type="button" className="voucher-menu-item" onClick={() => { toggleColumn(contextMenu.column); setContextMenu(null); }}>Hide {contextMenu.column}</button>
        <button type="button" className="voucher-menu-item" onClick={() => { setHiddenColumns([]); setContextMenu(null); }}>Unhide all columns</button>
        <button type="button" className="voucher-menu-item" onClick={() => setContextMenu(null)}>Close</button>
      </div>}

      <Modal open={optionsOpen} onClose={() => setOptionsOpen(false)} title="Voucher options" width="max-w-lg" footer={<Button variant="primary" onClick={() => setOptionsOpen(false)}>Done</Button>}>
        <div>
          <h3 className="mb-2 text-sm font-bold text-navy">Visible columns</h3>
          <div className="grid grid-cols-2 gap-2">
            {columns.map((column) => <label key={column} className="flex items-center gap-2 rounded-lg border border-blue-100 px-2 py-1.5 text-sm">
              <input type="checkbox" checked={visibleColumns.includes(column)} onChange={() => toggleColumn(column)} />{column}
            </label>)}
          </div>
          <p className="mt-3 text-xs text-slate-500">Right-click a heading to hide or restore columns. Debit and credit totals must match before saving.</p>
        </div>
      </Modal>

      <ConfirmDialog open={deleteOpen} title={currentRecord ? `Delete ${currentRecord.no}?` : 'Clear this voucher?'} message={currentRecord ? 'This removes the saved voucher from this browser session.' : 'This clears the current voucher entries.'} confirmLabel={currentRecord ? 'Delete voucher' : 'Clear voucher'} tone="danger" onCancel={() => setDeleteOpen(false)} onConfirm={deleteCurrent} />
    </div>
  );
}
