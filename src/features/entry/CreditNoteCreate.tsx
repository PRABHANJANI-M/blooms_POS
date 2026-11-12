import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FilePlus2, ListChecks, Printer, Save, Settings2, Trash2, MessageCircle, Search } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, SelectInput, TextArea, TextInput } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useHotkeys } from '../../hooks/useHotkeys';
import { useAppStore } from '../../store/appStore';
import { NO_ROWS, useDemoStore } from '../../store/demoStore';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../services/api';
import { stateList } from '../../mock-data/parties';
import { todayISO, financialYearLabel } from '../../utils/date';
import { formatMoneyPlain, parseNum, round2 } from '../../utils/money';
import type { CreditNoteLine, Party, VoucherRow } from '../../types';

type CreditColumn = 'Sno' | 'Account (Particulars)' | 'Detail' | 'Amount' | 'GST Tax Type' | 'CGST' | 'SGST' | 'IGST' | 'Total';
type CreditLineState = CreditNoteLine & { isBlank?: boolean };
type CreditTaxLine = { taxable: number; cgst: number; sgst: number; igst: number; total: number };

const creditColumns: CreditColumn[] = ['Sno', 'Account (Particulars)', 'Detail', 'Amount', 'GST Tax Type', 'CGST', 'SGST', 'IGST', 'Total'];
const blankLine = (): CreditLineState => ({ uid: Math.random().toString(36).slice(2, 10), account: '', detail: '', amount: 0, gstRate: 0, isBlank: true });
const nextNumber = (rows: VoucherRow[]) => Math.max(0, ...rows.map((row) => Number(row.no.replace(/\D/g, '')) || 0)) + 1;
const accountSeeds = ['Sales Return', 'Rate Difference', 'Discount Allowed', 'Cash Discount', 'Price Difference', 'Other Adjustment'];

const lineTotals = (line: CreditLineState, interState: boolean): CreditTaxLine => {
  const taxable = round2(line.amount);
  const tax = round2(taxable * line.gstRate / 100);
  const cgst = interState ? 0 : round2(tax / 2);
  const sgst = interState ? 0 : round2(tax - cgst);
  const igst = interState ? tax : 0;
  return { taxable, cgst, sgst, igst, total: round2(taxable + tax) };
};

export function CreditNoteCreate({ kind = 'credit-note' }: { kind?: 'credit-note' | 'debit-note' }) {
  const isDebitNote = kind === 'debit-note';
  const noteTitle = isDebitNote ? 'Debit Note' : 'Credit Note';
  const seriesDefault = isDebitNote ? 'Dr Note' : 'Cr Note';
  const accountListId = `${kind}-accounts`;
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useAppStore((state) => state.toast);
  const rows = useDemoStore((state) => state.vouchers[kind] ?? NO_ROWS);
  const upsertVoucher = useDemoStore((state) => state.upsertVoucher);
  const removeVoucher = useDemoStore((state) => state.removeVoucher);
  const ledgers = useDemoStore((state) => state.masters.ledgers ?? []);
  const taxes = useDemoStore((state) => state.masters.taxes ?? []);
  const { data: parties, loading: partiesLoading, error: partiesError } = useAsync(() => api.getParties(), []);
  const [series, setSeries] = useState(seriesDefault);
  const [number, setNumber] = useState(() => nextNumber(rows));
  const [date, setDate] = useState(todayISO());
  const [reason, setReason] = useState('RATE DIFFERENCE');
  const [partyName, setPartyName] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [cell, setCell] = useState('');
  const [state, setState] = useState('33 - Tamil Nadu');
  const [againstInvoice, setAgainstInvoice] = useState('');
  const [againstDate, setAgainstDate] = useState('');
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<CreditLineState[]>([blankLine()]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<CreditColumn[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; column: CreditColumn } | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [partyOpen, setPartyOpen] = useState(false);
  const [partyQuery, setPartyQuery] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountQuery, setAccountQuery] = useState('');
  const [accountRow, setAccountRow] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const partyInputRef = useRef<HTMLInputElement>(null);
  const currentRecord = rows.find((row) => row.id === activeId);
  const interState = state !== '33 - Tamil Nadu';
  const activeLines = lines.filter((line) => !line.isBlank && line.account.trim());
  const taxLines = activeLines.map((line) => lineTotals(line, interState));
  const taxable = round2(taxLines.reduce((sum, line) => sum + line.taxable, 0));
  const cgst = round2(taxLines.reduce((sum, line) => sum + line.cgst, 0));
  const sgst = round2(taxLines.reduce((sum, line) => sum + line.sgst, 0));
  const igst = round2(taxLines.reduce((sum, line) => sum + line.igst, 0));
  const gross = round2(taxable + cgst + sgst + igst);
  const netAmount = Math.round(gross);
  const roundOff = round2(netAmount - gross);
  const availableParties = useMemo(() => (parties ?? []).filter((party) => party.kind !== 'agent' && party.active), [parties]);
  const availableAccounts = useMemo(() => {
    const names = ledgers
      .filter((record) => record.active !== false)
      .map((record) => String(record.name ?? ''))
      .filter(Boolean);
    return [...new Set([...accountSeeds, ...names])];
  }, [ledgers]);
  const taxOptions = useMemo(() => {
    const configured = taxes.filter((tax) => tax.active !== false)
      .map((tax) => Number(tax.rate))
      .filter((rate) => Number.isFinite(rate) && rate >= 0);
    return [...new Set([0, ...configured])].sort((a, b) => a - b);
  }, [taxes]);
  const visibleColumns = creditColumns.filter((column) => !hiddenColumns.includes(column));
  const filteredParties = availableParties.filter((party) => `${party.name} ${party.city ?? ''} ${party.phone ?? ''}`.toLowerCase().includes(partyQuery.trim().toLowerCase()));
  const filteredAccounts = availableAccounts.filter((account) => account.toLowerCase().includes(accountQuery.trim().toLowerCase()));

  const selectParty = (party: Party) => {
    setPartyName(party.name);
    setAddress([party.address1, party.address2, party.city].filter(Boolean).join(', '));
    setGstin(party.gstin ?? '');
    setCell(party.phone ?? '');
    setState(party.state || '33 - Tamil Nadu');
    setPartyOpen(false);
  };
  const loadRecord = (record: VoucherRow) => {
    const metadata = record.extra ?? '';
    const read = (label: string) => metadata.match(new RegExp(`(?:^| · )${label}: ([^·]*)`))?.[1]?.trim() ?? '';
    setActiveId(record.id);
    setNumber(Number(record.no.replace(/\D/g, '')) || 1);
    setDate(record.date);
    setPartyName(record.party);
    setSeries(record.series || seriesDefault);
    const party = availableParties.find((entry) => entry.name === record.party);
    if (party) {
      setAddress([party.address1, party.address2, party.city].filter(Boolean).join(', '));
      setGstin(party.gstin ?? '');
      setCell(party.phone ?? '');
      setState(party.state || '33 - Tamil Nadu');
    }
    setReason(read('Reason') || 'RATE DIFFERENCE');
    setAgainstInvoice(read('Against invoice'));
    setAgainstDate(read('Invoice date'));
    setNarration(read('Narration'));
    const savedLines = isDebitNote ? record.debitNoteLines : record.creditNoteLines;
    setLines(savedLines?.length ? [...savedLines.map((line) => ({ ...line })), blankLine()] : [blankLine()]);
  };
  const moveRecord = (direction: -1 | 1) => {
    const ordered = [...rows].sort((a, b) => Number(a.no.replace(/\D/g, '')) - Number(b.no.replace(/\D/g, '')));
    const currentIndex = ordered.findIndex((record) => record.id === activeId);
    const target = currentIndex < 0
      ? ordered.find((record) => direction < 0
        ? Number(record.no.replace(/\D/g, '')) < number
        : Number(record.no.replace(/\D/g, '')) > number)
      : ordered[currentIndex + direction];
    if (target) loadRecord(target);
    else toast({ tone: 'info', title: `No ${noteTitle.toLowerCase()} found`, message: `There is no ${direction < 0 ? 'previous' : 'next'} saved ${noteTitle.toLowerCase()}.` });
  };
  const newNote = () => {
    const next = nextNumber(rows);
    setActiveId(null);
    setSeries(seriesDefault);
    setNumber(next);
    setDate(todayISO());
    setReason('RATE DIFFERENCE');
    setPartyName('');
    setAddress('');
    setGstin('');
    setCell('');
    setState('33 - Tamil Nadu');
    setAgainstInvoice('');
    setAgainstDate('');
    setNarration('');
    setLines([blankLine()]);
    setTimeout(() => partyInputRef.current?.focus(), 0);
  };
  useEffect(() => {
    const recordId = (location.state as { creditNoteId?: string; debitNoteId?: string } | null)?.[isDebitNote ? 'debitNoteId' : 'creditNoteId'];
    if (!recordId) return;
    const record = rows.find((row) => row.id === recordId);
    if (record) loadRecord(record);
    else toast({ tone: 'error', title: `${noteTitle} not found`, message: 'The selected session record is no longer available.' });
    navigate(location.pathname, { replace: true, state: null });
  }, [location.key, location.pathname, location.state, navigate, rows, availableParties, toast, isDebitNote, noteTitle]);
  const updateLine = (index: number, patch: Partial<CreditLineState>) => {
    setLines((current) => {
      const updated = [...current];
      updated[index] = { ...updated[index], ...patch, isBlank: false };
      if (index === current.length - 1 && (updated[index].account || updated[index].detail || updated[index].amount > 0)) updated.push(blankLine());
      return updated;
    });
  };
  const chooseAccount = (account: string) => {
    updateLine(accountRow, { account });
    setAccountOpen(false);
    focusGridField(accountRow, 'detail');
  };
  const removeLine = (index: number) => {
    setLines((current) => {
      const next = current.filter((_, rowIndex) => rowIndex !== index);
      return next.length ? next : [blankLine()];
    });
  };
  const save = () => {
    if (!activeLines.length) {
      toast({ tone: 'error', title: 'Could not save', message: `Enter at least one account and amount for the ${noteTitle.toLowerCase()}.` });
      return;
    }
    if (activeLines.some((line) => !line.amount || line.amount < 0)) {
      toast({ tone: 'error', title: `Check ${noteTitle.toLowerCase()} amounts`, message: 'Each account line must have an amount greater than zero.' });
      return;
    }
    const id = activeId ?? `${kind}-${Date.now()}`;
    const extra = [
      `Reason: ${reason}`,
      `Inter-state: ${interState}`,
      gstin.trim() && `GSTIN: ${gstin.trim()}`,
      againstInvoice.trim() && `Against invoice: ${againstInvoice.trim()}`,
      againstDate && `Invoice date: ${againstDate}`,
      narration.trim() && `Narration: ${narration.trim()}`,
    ].filter(Boolean).join(' · ');
    upsertVoucher(kind, {
      id,
      no: `${isDebitNote ? 'DN' : 'CN'}-${number}`,
      date,
      party: partyName.trim() || 'CASH CUSTOMER',
      amount: netAmount,
      status: 'Adjusted',
      extra,
      series,
      ...(isDebitNote
        ? { debitNoteLines: activeLines.map(({ uid, account, detail, amount, gstRate }) => ({ uid, account, detail, amount, gstRate })) }
        : { creditNoteLines: activeLines.map(({ uid, account, detail, amount, gstRate }) => ({ uid, account, detail, amount, gstRate })) }),
    });
    setActiveId(id);
    toast({ tone: 'success', title: `${noteTitle} ${isDebitNote ? 'DN' : 'CN'}-${number} saved`, message: 'Saved for this browser session only. The party balance adjustment is demo data.' });
  };
  const deleteCurrent = () => {
    if (currentRecord) {
      removeVoucher(kind, currentRecord.id);
      toast({ tone: 'success', title: `${noteTitle} ${currentRecord.no} deleted`, message: 'The session record was removed.' });
    }
    newNote();
    setDeleteOpen(false);
  };
  const toggleColumn = (column: CreditColumn) => {
    if (!hiddenColumns.includes(column) && visibleColumns.length <= 1) {
      toast({ tone: 'warning', title: 'Keep one visible column', message: 'At least one grid column must remain visible.' });
      return;
    }
    setHiddenColumns((current) => current.includes(column) ? current.filter((entry) => entry !== column) : [...current, column]);
  };
  const openColumnMenu = (event: MouseEvent<HTMLTableCellElement>, column: CreditColumn) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, column });
  };
  const focusGridField = (index: number, field: string) => window.setTimeout(() => {
    gridRef.current?.querySelector<HTMLInputElement | HTMLSelectElement>(`tr[data-credit-row="${index}"] [data-credit-field="${field}"]`)?.focus();
  }, 0);
  const handleGridKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>, index: number, field: string) => {
    if (event.key === ' ' && field === 'account' && !event.currentTarget.value) {
      event.preventDefault();
      setAccountRow(index);
      setAccountQuery('');
      setAccountOpen(true);
      return;
    }
    if (event.key !== 'Enter' || event.ctrlKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    const order = ['account', 'detail', 'amount', 'tax'];
    const nextField = order[order.indexOf(field) + 1];
    if (nextField) focusGridField(index, nextField);
    else {
      const nextRow = index + 1;
      if (nextRow >= lines.length) setLines((current) => [...current, blankLine()]);
      focusGridField(nextRow, 'account');
    }
  };
  const hotkeys = useMemo(() => ({
    'Alt+S': save,
    'F2': newNote,
    'Ctrl+Delete': () => removeLine(Math.max(0, lines.findIndex((line) => line.isBlank) - 1)),
    'PageUp': () => moveRecord(-1),
    'PageDown': () => moveRecord(1),
  }), [activeId, againstDate, againstInvoice, date, gstin, kind, lines, narration, number, partyName, reason, rows, series, state]);
  useHotkeys(hotkeys);
  const renderHeader = (column: CreditColumn) => visibleColumns.includes(column) && (
    <th key={column} className={['Amount', 'CGST', 'SGST', 'IGST', 'Total'].includes(column) ? 'num' : ''} onContextMenu={(event) => openColumnMenu(event, column)}>{column}</th>
  );

  return (
    <div className="credit-note-create -mx-3 -mt-3 flex min-h-[calc(100vh-3.5rem)] flex-col gap-2 bg-[#e7f1fc] p-2 sm:-mx-4 sm:-mt-4 sm:p-2">
      <PageHeader variant="bill" title={noteTitle} shortcuts="PgUp / PgDn = previous / next · F2 = New · Alt+S = Save · Ctrl+Del = remove row · Right-click heading = hide / unhide columns" />

      <div className="grid gap-2 xl:grid-cols-[12.5rem_minmax(24rem,1.35fr)_minmax(20rem,1fr)]">
        <section className="grid grid-cols-2 gap-2 rounded-xl border border-blue-200 bg-white p-2 shadow-panel xl:grid-cols-1">
          <div className="col-span-2 flex items-center justify-between rounded-lg bg-[#edf6ff] p-1 xl:col-span-1">
            <Button size="sm" variant="outline" aria-label={`Previous ${noteTitle.toLowerCase()}`} onClick={() => moveRecord(-1)}>‹</Button>
            <strong className="text-xs text-navy">{noteTitle}</strong>
            <Button size="sm" variant="outline" aria-label={`Next ${noteTitle.toLowerCase()}`} onClick={() => moveRecord(1)}>›</Button>
          </div>
          <Field label="Series">
            <SelectInput compact value={series} onChange={(event) => setSeries(event.target.value)}>
              <option>{seriesDefault}</option><option>Default</option><option>Main series</option>
            </SelectInput>
          </Field>
          <Field label={isDebitNote ? 'DN No' : 'CN No'}>
            <div className="flex items-center gap-1">
              <TextInput compact numeric type="number" min={1} value={number} onChange={(event) => setNumber(Math.max(1, Math.floor(parseNum(event.target.value))))} aria-label={`${noteTitle} number`} />
              <span className="whitespace-nowrap text-[.62rem] text-slate-500">{financialYearLabel(date)}</span>
            </div>
          </Field>
          <Field label="Date">
            <TextInput compact type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label={`${noteTitle} date`} />
          </Field>
          <Field label="Reason">
            <SelectInput compact value={reason} onChange={(event) => setReason(event.target.value)}>
              <option>RATE DIFFERENCE</option><option>DISCOUNT</option><option>SALES RETURN</option><option>GOODS RETURN</option><option>OTHER</option>
            </SelectInput>
          </Field>
        </section>

        <section className="grid content-start gap-2 rounded-xl border border-blue-200 bg-white p-2 shadow-panel sm:grid-cols-2">
          <Field label="Party" className="sm:col-span-2">
            <div className="relative">
              <TextInput ref={partyInputRef} compact value={partyName} placeholder="SEARCH CUSTOMER / SUPPLIER (SPACE = LIST)" aria-label={`${noteTitle} party`} onChange={(event) => {
                setPartyName(event.target.value);
                const match = availableParties.find((party) => party.name.toLowerCase() === event.target.value.trim().toLowerCase());
                if (match) selectParty(match);
              }} onKeyDown={(event) => { if (event.key === ' ' && !partyName) { event.preventDefault(); setPartyQuery(''); setPartyOpen(true); } }} />
              <button type="button" className="credit-party-open" aria-label="Choose party" onClick={() => { setPartyQuery(''); setPartyOpen(true); }}><Search className="h-3.5 w-3.5" /></button>
            </div>
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <TextArea rows={2} className="min-h-9 resize-y text-xs" value={address} aria-label="Party address" onChange={(event) => setAddress(event.target.value)} />
          </Field>
          <Field label="GSTIN"><TextInput compact value={gstin} aria-label="Party GSTIN" onChange={(event) => setGstin(event.target.value.toUpperCase())} /></Field>
          <Field label="Cell"><TextInput compact value={cell} aria-label="Party cell" onChange={(event) => setCell(event.target.value)} /></Field>
          <Field label="State" className="sm:col-span-2">
            <div className="flex items-center gap-2">
              <SelectInput compact value={state} className="flex-1" aria-label="Party state" onChange={(event) => setState(event.target.value)}>{stateList.map((entry) => <option key={entry}>{entry}</option>)}</SelectInput>
              <span className="whitespace-nowrap rounded-md bg-green-50 px-2 py-1 text-[.62rem] font-bold text-green-700">{interState ? 'IGST' : 'CGST + SGST'}</span>
            </div>
          </Field>
          <p className="sm:col-span-2 text-[.62rem] text-slate-500">Pick the party from the list (Space = list).</p>
        </section>

        <section className="grid content-start gap-2 rounded-xl border border-blue-200 bg-white p-2 shadow-panel sm:grid-cols-[minmax(0,1fr)_6rem]">
          <Field label="Against Inv">
            <TextInput compact value={againstInvoice} placeholder="INVOICE NO (OPTIONAL)" aria-label="Against invoice" onChange={(event) => setAgainstInvoice(event.target.value)} />
          </Field>
          <Field label=" "><TextInput compact type="date" value={againstDate} aria-label="Against invoice date" onChange={(event) => setAgainstDate(event.target.value)} /></Field>
          <Field label="Narration" className="sm:col-span-2">
            <TextArea rows={2} className="min-h-12 resize-y text-xs" value={narration} placeholder={`E.G. ${isDebitNote ? 'SHORT BILLED' : 'RATE DIFFERENCE ALLOWED'} ON INV 125`} aria-label={`${noteTitle} narration`} onChange={(event) => setNarration(event.target.value)} />
          </Field>
          <p className="sm:col-span-2 text-[.62rem] leading-relaxed text-slate-500">{isDebitNote
            ? "Debit Note: the party's balance goes UP (extra charge to customer, or amount claimed from supplier)."
            : "Credit Note: the party's balance goes DOWN (discount / rate difference given to customer, or claim to supplier)."}</p>
        </section>
      </div>

      <section ref={gridRef} className="min-h-[32vh] flex-1 overflow-auto rounded-xl border border-blue-200 bg-white shadow-panel">
        <table className="data-table credit-note-grid">
          <colgroup>{visibleColumns.map((column) => <col key={column} className={`cn-col-${column === 'Sno' ? 'sno' : column === 'Account (Particulars)' ? 'account' : column === 'Detail' ? 'detail' : column === 'Amount' ? 'amount' : column === 'GST Tax Type' ? 'tax' : column === 'Total' ? 'total' : 'taxvalue'}`} />)}<col className="cn-col-remove" /></colgroup>
          <thead><tr>{creditColumns.map(renderHeader)}<th className="cn-remove-column" /></tr></thead>
          <tbody>
            {lines.map((line, index) => {
              const amounts = lineTotals(line, interState);
              return <tr key={line.uid} data-credit-row={index}>
                {visibleColumns.includes('Sno') && <td className="text-center text-slate-500">{index + 1}</td>}
                {visibleColumns.includes('Account (Particulars)') && <td>
                  <input className="input input-sm cn-account-input" data-credit-field="account" list={accountListId} aria-label={`Row ${index + 1} account`} placeholder={index === 0 ? 'SPACE = ACCOUNT LIST, OR TYPE TO SEARCH' : 'Select account'} value={line.account} onChange={(event) => updateLine(index, { account: event.target.value })} onKeyDown={(event) => handleGridKeyDown(event, index, 'account')} />
                </td>}
                {visibleColumns.includes('Detail') && <td><input className="input input-sm" data-credit-field="detail" aria-label={`Row ${index + 1} detail`} value={line.detail} onChange={(event) => updateLine(index, { detail: event.target.value })} onKeyDown={(event) => handleGridKeyDown(event, index, 'detail')} /></td>}
                {visibleColumns.includes('Amount') && <td><input className="input input-sm input-num" data-credit-field="amount" type="number" min={0} step="0.01" aria-label={`Row ${index + 1} amount`} value={line.amount || ''} onChange={(event) => updateLine(index, { amount: Math.max(0, parseNum(event.target.value)) })} onKeyDown={(event) => handleGridKeyDown(event, index, 'amount')} /></td>}
                {visibleColumns.includes('GST Tax Type') && <td><select className="select input-sm" data-credit-field="tax" aria-label={`Row ${index + 1} GST tax type`} value={line.gstRate} onChange={(event) => updateLine(index, { gstRate: parseNum(event.target.value) })} onKeyDown={(event) => handleGridKeyDown(event, index, 'tax')}>
                  <option value={0}>-- No GST --</option>{taxOptions.filter((rate) => rate > 0).map((rate) => <option key={rate} value={rate}>GST {rate}%</option>)}
                </select></td>}
                {visibleColumns.includes('CGST') && <td className="num">{formatMoneyPlain(amounts.cgst)}</td>}
                {visibleColumns.includes('SGST') && <td className="num">{formatMoneyPlain(amounts.sgst)}</td>}
                {visibleColumns.includes('IGST') && <td className="num">{formatMoneyPlain(amounts.igst)}</td>}
                {visibleColumns.includes('Total') && <td className="num font-semibold">{formatMoneyPlain(amounts.total)}</td>}
                <td className="cn-remove-column"><button type="button" className="btn btn-ghost btn-sm btn-icon text-fiery" aria-label={`Remove ${noteTitle.toLowerCase()} row ${index + 1}`} onClick={() => removeLine(index)}><Trash2 className="h-3.5 w-3.5" /></button></td>
              </tr>;
            })}
          </tbody>
          <tfoot><tr>
            {visibleColumns.map((column) => <td key={column} className={['Amount', 'CGST', 'SGST', 'IGST', 'Total'].includes(column) ? 'num' : ''}>
              {column === (visibleColumns.includes('Account (Particulars)') ? 'Account (Particulars)' : visibleColumns.includes('Sno') ? 'Sno' : 'Detail') ? `${activeLines.length} account(s)` : column === 'Amount' ? formatMoneyPlain(taxable)
                : column === 'CGST' ? formatMoneyPlain(cgst)
                  : column === 'SGST' ? formatMoneyPlain(sgst)
                    : column === 'IGST' ? formatMoneyPlain(igst)
                      : column === 'Total' ? formatMoneyPlain(gross) : ''}
            </td>)}
            <td className="cn-remove-column" />
          </tr></tfoot>
        </table>
      </section>

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5" aria-label={`${noteTitle} totals`}>
        <TotalCard label="Taxable" value={formatMoneyPlain(taxable)} />
        <TotalCard label="CGST" value={formatMoneyPlain(cgst)} />
        <TotalCard label="SGST" value={formatMoneyPlain(sgst)} />
        <TotalCard label="Cess / Round Off" value={`0.00 / ${formatMoneyPlain(roundOff)}`} />
        <TotalCard label="Net Amount" value={formatMoneyPlain(netAmount)} highlight />
      </section>

      <footer className="no-print flex flex-wrap items-center justify-end gap-2 rounded-xl border border-blue-200 bg-white/90 p-2">
        <Button size="sm" variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDeleteOpen(true)}>Delete</Button>
        <Button size="sm" variant="outline" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Print</Button>
        <Button size="sm" variant="success" icon={<MessageCircle className="h-4 w-4" />} onClick={() => toast({ tone: 'warning', title: 'WhatsApp not connected', message: `Connect a provider under Features → W/A - SMS to share this ${noteTitle.toLowerCase()}.` })}>WhatsApp</Button>
        <Button size="sm" variant="navy" icon={<ListChecks className="h-4 w-4" />} onClick={() => navigate(`/entry/${kind}/display`)}>Display</Button>
        <Button size="sm" variant="outline" icon={<FilePlus2 className="h-4 w-4" />} onClick={newNote}>New (F2)</Button>
        <Button size="sm" variant="outline" icon={<Settings2 className="h-4 w-4" />} onClick={() => setOptionsOpen(true)}>Options</Button>
        <Button size="sm" variant="primary" icon={<Save className="h-4 w-4" />} onClick={save}>Save</Button>
      </footer>
      <datalist id={accountListId}>{availableAccounts.map((account) => <option key={account} value={account} />)}</datalist>

      <Modal open={partyOpen} onClose={() => setPartyOpen(false)} title="Select customer / supplier" width="max-w-2xl" footer={<Button variant="outline" onClick={() => setPartyOpen(false)}>Close</Button>}>
        <div className="space-y-3">
          <TextInput autoFocus value={partyQuery} aria-label="Search parties" placeholder="Search customer or supplier name, city, phone" onChange={(event) => setPartyQuery(event.target.value)} />
          {partiesError && <p className="error-text" role="alert">Could not load parties: {partiesError}</p>}
          {partiesLoading && <p className="text-sm text-slate-500">Loading parties…</p>}
          <div className="max-h-[55vh] overflow-auto rounded-lg border border-blue-100">
            <table className="data-table"><thead><tr><th>Party</th><th>Type</th><th>State</th><th>Phone</th><th /></tr></thead>
              <tbody>{filteredParties.map((party) => <tr key={party.id} onDoubleClick={() => selectParty(party)}>
                <td>{party.name}</td><td>{party.kind}</td><td>{party.state}</td><td>{party.phone || '—'}</td>
                <td><Button size="sm" variant="navy" onClick={() => selectParty(party)}>Select</Button></td>
              </tr>)}</tbody>
            </table>
            {!filteredParties.length && <p className="p-4 text-center text-sm text-slate-500">No matching parties.</p>}
          </div>
        </div>
      </Modal>

      <Modal open={accountOpen} onClose={() => setAccountOpen(false)} title="Select account" width="max-w-lg" footer={<Button variant="outline" onClick={() => setAccountOpen(false)}>Close</Button>}>
        <div className="space-y-3">
          <TextInput autoFocus value={accountQuery} aria-label="Search accounts" placeholder="Search account / particulars" onChange={(event) => setAccountQuery(event.target.value)} />
          <div className="max-h-[55vh] overflow-auto rounded-lg border border-blue-100">
            {filteredAccounts.map((account) => <button key={account} type="button" className="credit-menu-item border-b border-blue-50" onClick={() => chooseAccount(account)}>{account}</button>)}
            {!filteredAccounts.length && <p className="p-4 text-center text-sm text-slate-500">No matching account.</p>}
          </div>
        </div>
      </Modal>

      <Modal open={optionsOpen} onClose={() => setOptionsOpen(false)} title={`${noteTitle} options`} width="max-w-lg" footer={<Button variant="primary" onClick={() => setOptionsOpen(false)}>Done</Button>}>
        <div>
          <h3 className="mb-2 text-sm font-bold text-navy">Visible columns</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {creditColumns.map((column) => <label key={column} className="flex items-center gap-2 rounded-lg border border-blue-100 px-2 py-1.5 text-sm">
              <input type="checkbox" checked={visibleColumns.includes(column)} onChange={() => toggleColumn(column)} />{column}
            </label>)}
          </div>
          <p className="mt-3 text-xs text-slate-500">Right-click a heading to hide or restore columns. Tax is split using the party state.</p>
        </div>
      </Modal>

      {contextMenu && <div className="fixed z-50 w-48 rounded-lg border border-blue-200 bg-white p-2 shadow-pop" style={{ left: Math.min(contextMenu.x, window.innerWidth - 200), top: Math.min(contextMenu.y, window.innerHeight - 140) }} role="menu" aria-label="Credit note column menu">
        <button type="button" className="credit-menu-item" onClick={() => { toggleColumn(contextMenu.column); setContextMenu(null); }}>Hide {contextMenu.column}</button>
        <button type="button" className="credit-menu-item" onClick={() => { setHiddenColumns([]); setContextMenu(null); }}>Unhide all columns</button>
        <button type="button" className="credit-menu-item" onClick={() => setContextMenu(null)}>Close</button>
      </div>}

      <ConfirmDialog open={deleteOpen} title={currentRecord ? `Delete ${currentRecord.no}?` : `Clear this ${noteTitle.toLowerCase()}?`} message={currentRecord ? `This removes the saved ${noteTitle.toLowerCase()} from this browser session.` : `This clears the current ${noteTitle.toLowerCase()} entries.`} confirmLabel={currentRecord ? `Delete ${noteTitle.toLowerCase()}` : `Clear ${noteTitle.toLowerCase()}`} tone="danger" onCancel={() => setDeleteOpen(false)} onConfirm={deleteCurrent} />
    </div>
  );
}

function TotalCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return <div className={`credit-total-card ${highlight ? 'credit-total-highlight' : ''}`}>
    <span>{label}</span><strong>{value}</strong>
  </div>;
}
