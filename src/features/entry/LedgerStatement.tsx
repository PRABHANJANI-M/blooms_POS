import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus2, Filter, ListChecks, Printer, RefreshCw, Search, SlidersHorizontal, XCircle } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Field, SelectInput, TextInput } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { DataTable, type Column } from '../../components/tables/DataTable';
import { DateRange, type RangeOption } from '../../components/common/DateRange';
import { ExportBar } from '../../components/common/ExportBar';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAppStore } from '../../store/appStore';
import { useDemoStore, NO_RECORDS, NO_ROWS } from '../../store/demoStore';
import { recentSalesBills, voucherHistory } from '../../mock-data/entry';
import { formatINR, formatMoneyPlain } from '../../utils/money';
import { todayISO, toDisplayDate } from '../../utils/date';
import type { ReportRow, VoucherRow } from '../../types';
import { useHotkeys } from '../../hooks/useHotkeys';

type LedgerStatementRow = ReportRow & {
  id: string;
  date: string;
  voucher: string;
  particulars: string;
  debit: number;
  credit: number;
  balance: number;
  side: 'Dr' | 'Cr';
  status: string;
  opening?: number;
  sourceId?: string;
};

const ledgerColumns = ['Date', 'Voucher', 'Particulars', 'Debit', 'Credit', 'Balance', 'Status'] as const;
type LedgerColumn = typeof ledgerColumns[number];

/** Ledger statement for a selected account with opening and running balances. */
export function LedgerStatement() {
  const navigate = useNavigate();
  const toast = useAppStore((state) => state.toast);
  const ledgers = useDemoStore((state) => state.masters.ledgers ?? NO_RECORDS);
  const savedVouchers = useDemoStore((state) => state.vouchers.voucher ?? NO_ROWS);
  const savedBills = useDemoStore((state) => state.vouchers.sales ?? NO_ROWS);
  const savedCreditNotes = useDemoStore((state) => state.vouchers['credit-note'] ?? NO_ROWS);
  const savedDebitNotes = useDemoStore((state) => state.vouchers['debit-note'] ?? NO_ROWS);
  const upsertVoucher = useDemoStore((state) => state.upsertVoucher);
  const [ledger, setLedger] = useState(String(ledgers[0]?.name ?? ''));
  const [from, setFrom] = useState('2026-04-01');
  const [to, setTo] = useState(todayISO());
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [detailed, setDetailed] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<LedgerColumn[]>([]);

  const allLedgers = useMemo(() => {
    const names = new Set(ledgers.map((item) => String(item.name ?? '')).filter(Boolean));
    const records: Array<Pick<VoucherRow, 'party' | 'voucherEntries'>> = [
      ...(voucherHistory.voucher ?? []), ...savedVouchers,
      ...(voucherHistory['credit-note'] ?? []), ...(voucherHistory['debit-note'] ?? []),
      ...savedCreditNotes, ...savedDebitNotes,
      ...recentSalesBills.map((bill) => ({ party: bill.party, voucherEntries: undefined })),
      ...savedBills,
    ];
    records.forEach((voucher) => {
      voucher.voucherEntries?.forEach((entry) => names.add(entry.account));
      if (!voucher.voucherEntries?.length && voucher.party) names.add(voucher.party);
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [ledgers, savedVouchers, savedBills, savedCreditNotes, savedDebitNotes]);
  const selectedLedger = ledgers.find((item) => String(item.name) === ledger);
  const openingAmount = Number(selectedLedger?.openingBalance ?? 0);
  const openingSigned = String(selectedLedger?.type ?? 'Dr') === 'Cr' ? -openingAmount : openingAmount;
  const sourceVouchers = useMemo(() => {
    const salesRows: VoucherRow[] = recentSalesBills.map((bill) => ({
      id: `sample-sales-${bill.no}`,
      no: `INV-${bill.no}`,
      date: bill.date,
      party: bill.party,
      amount: bill.amount,
      status: 'Sales Bill',
      mode: bill.mode,
      paid: bill.paid,
      extra: `${bill.type} · ${bill.status}`,
    }));
    const combined = [
      ...(voucherHistory.voucher ?? []), ...savedVouchers,
      ...salesRows,       ...savedBills.map((bill) => ({ ...bill, status: 'Sales Bill', mode: bill.status === 'Credit' ? 'Credit' as const : 'Cash' as const })),
      ...(voucherHistory['credit-note'] ?? []).map((note) => ({ ...note, status: 'Credit Note' })),
      ...(voucherHistory['debit-note'] ?? []).map((note) => ({ ...note, status: 'Debit Note' })),
      ...savedCreditNotes.map((note) => ({ ...note, status: 'Credit Note' })),
      ...savedDebitNotes.map((note) => ({ ...note, status: 'Debit Note' })),
    ];
    return [...new Map(combined.map((voucher) => [voucher.id, voucher])).values()]
      .filter((voucher) => !voucher.cancelled && !voucher.deleted)
      .sort((a, b) => a.date.localeCompare(b.date) || a.no.localeCompare(b.no, 'en', { numeric: true }));
  }, [savedVouchers, savedBills, savedCreditNotes, savedDebitNotes]);

  const statementRows = useMemo(() => {
    if (!ledger) return [];
    const movements = sourceVouchers.flatMap((voucher) => {
      const entries = voucher.voucherEntries ?? [];
      const matching = entries.filter((entry) => entry.account === ledger);
      if (matching.length) {
        return matching.map((entry, index) => ({
          voucher,
          id: `${voucher.id}-${entry.uid || index}`,
          debit: entry.debit,
          credit: entry.credit,
          particulars: entries.filter((other) => other.uid !== entry.uid && other.account !== ledger).map((other) => other.account).join(', ') || voucher.party,
        }));
      }
      if (!entries.length && voucher.party === ledger) {
        const isCreditNote = voucher.status === 'Credit Note';
        const isReceipt = voucher.status === 'Receipt';
        return [{
          voucher,
          id: voucher.id,
          debit: isCreditNote || isReceipt ? 0 : voucher.amount,
          credit: isCreditNote || isReceipt ? voucher.amount : 0,
          particulars: voucher.extra?.match(/(?:^| · )Narration: ([^·]*)/)?.[1]?.trim() || voucher.status,
        }];
      }
      if (!entries.length && voucher.status === 'Sales Bill' && (voucher.mode === 'Cash' && /cash/i.test(ledger) || voucher.mode && voucher.mode !== 'Cash' && voucher.mode !== 'Credit' && /bank|hdfc/i.test(ledger))) {
        return [{ voucher, id: `${voucher.id}-${ledger}`, debit: voucher.amount, credit: 0, particulars: voucher.party }];
      }
      return [];
    });
    let balance = openingSigned + movements.filter(({ voucher }) => voucher.date < from)
      .reduce((total, movement) => total + movement.debit - movement.credit, 0);
    const openingBalance = balance;
    const openingRow: LedgerStatementRow = {
      id: `opening-${ledger}-${from}`,
      date: from,
      voucher: 'OPENING',
      particulars: 'Opening balance b/f',
      debit: 0,
      credit: 0,
      balance: Math.abs(openingBalance),
      side: openingBalance < 0 ? 'Cr' : 'Dr',
      status: 'Opening',
      opening: 1,
    };
    const transactionRows: LedgerStatementRow[] = movements
      .filter(({ voucher }) => voucher.date >= from && voucher.date <= to)
      .map(({ voucher, id, debit, credit, particulars }) => {
        balance += debit - credit;
        const row: LedgerStatementRow = {
          id,
          date: voucher.date,
          voucher: voucher.no,
          particulars,
          debit,
          credit,
          balance: Math.abs(balance),
          side: balance < 0 ? 'Cr' : 'Dr',
          status: voucher.cancelled ? 'Cancelled' : voucher.status,
          sourceId: voucher.id,
        };
        if (detailed) row.narration = voucher.extra ?? '';
        return row;
      });
    return [openingRow, ...transactionRows].filter((row) =>
      (!query || `${row.voucher} ${row.particulars} ${row.status}`.toLowerCase().includes(query.toLowerCase()))
      && (!typeFilter || row.status === typeFilter)
      && (minAmount === '' || Math.max(row.debit, row.credit) >= Number(minAmount))
      && (maxAmount === '' || Math.max(row.debit, row.credit) <= Number(maxAmount)),
    );
  }, [ledger, sourceVouchers, openingSigned, from, to, query, typeFilter, minAmount, maxAmount, detailed]);

  const visibleColumns = useMemo(() => {
    const columns: Column<LedgerStatementRow>[] = [
      { key: 'date', header: 'Date', sortValue: (row) => row.date, render: (row) => toDisplayDate(row.date) },
      { key: 'voucher', header: 'Voucher', sortValue: (row) => row.voucher, render: (row) => <span className="font-semibold text-navy">{row.voucher}</span> },
      { key: 'particulars', header: 'Particulars', sortValue: (row) => row.particulars, render: (row) => row.particulars },
      { key: 'debit', header: 'Debit', align: 'right', sortValue: (row) => row.debit, render: (row) => row.debit ? formatMoneyPlain(row.debit) : '' },
      { key: 'credit', header: 'Credit', align: 'right', sortValue: (row) => row.credit, render: (row) => row.credit ? formatMoneyPlain(row.credit) : '' },
      { key: 'balance', header: 'Balance', align: 'right', sortValue: (row) => row.balance, render: (row) => `${formatMoneyPlain(row.balance)} ${row.side}` },
      ...(detailed ? [{ key: 'narration', header: 'Narration', render: (row: LedgerStatementRow) => String(row.narration ?? '—') }] : []),
      { key: 'status', header: 'Type / Status', render: (row) => row.status },
    ];
    return columns.filter((column) => !hiddenColumns.includes(column.header as LedgerColumn));
  }, [detailed, hiddenColumns]);

  const allTypes = [...new Set(sourceVouchers.map((voucher) => voucher.status))];
  const selectedRow = statementRows.find((row) => row.id === selectedId);
  const closingSigned = sourceVouchers
    .filter((voucher) => voucher.date <= to)
    .reduce((balance, voucher) => {
      const entries = voucher.voucherEntries ?? [];
      const matches = entries.filter((entry) => entry.account === ledger);
      if (matches.length) return balance + matches.reduce((total, entry) => total + entry.debit - entry.credit, 0);
      if (voucher.party !== ledger) {
        const cashSales = voucher.status === 'Sales Bill' && (voucher.mode === 'Cash' && /cash/i.test(ledger) || voucher.mode && voucher.mode !== 'Cash' && voucher.mode !== 'Credit' && /bank|hdfc/i.test(ledger));
        if (!cashSales) return balance;
        return balance + voucher.amount;
      }
      if (voucher.status === 'Receipt' || voucher.status === 'Credit Note') return balance - voucher.amount;
      return balance + voucher.amount;
    }, openingSigned);
  const closingBalance = `${formatINR(Math.abs(closingSigned))} ${closingSigned < 0 ? 'Cr' : 'Dr'}`;
  const exportColumns = visibleColumns.map((column) => ({ key: column.key, label: column.header }));
  const exportRows = statementRows.map((row) => ({
    ...row,
    date: toDisplayDate(row.date),
    debit: row.debit ? formatMoneyPlain(row.debit) : '',
    credit: row.credit ? formatMoneyPlain(row.credit) : '',
    balance: `${formatMoneyPlain(row.balance)} ${row.side}`,
  }));
  const openRow = (row = selectedRow) => {
    if (!row?.sourceId) return;
    const voucher = sourceVouchers.find((item) => item.id === row.sourceId);
    if (!voucher) return;
    if (!savedVouchers.some((item) => item.id === voucher.id)) upsertVoucher('voucher', voucher);
    navigate('/entry/voucher/create', { state: { voucherId: voucher.id } });
  };
  const refresh = () => toast({ tone: 'info', title: 'Ledger statement refreshed', message: `${statementRows.length} row(s) for ${ledger || 'the selected ledger'}.` });

  useHotkeys({
    'Alt+O': () => setFiltersOpen(true),
    'Alt+N': () => navigate('/entry/voucher/create'),
    Enter: () => openRow(),
    Escape: () => navigate('/'),
  });

  return (
    <>
      <PageHeader variant="bill" title="Ledger Statement" shortcuts="Select a ledger · Enter / double-click = open voucher · Alt+O = filters · Esc = dashboard" />
      <div className="mt-2 flex min-h-[calc(100vh-7rem)] flex-col gap-2">
        <section className="flex flex-wrap items-end gap-2 rounded-xl border border-blue-200 bg-white p-2 shadow-panel">
          <Field label="Ledger" className="min-w-[14rem] flex-1">
            <SelectInput compact value={ledger} onChange={(event) => { setLedger(event.target.value); setSelectedId(null); }} aria-label="Ledger">
              <option value="">TYPE / SPACE = LEDGER LIST</option>
              {allLedgers.map((name) => <option key={name} value={name}>{name}</option>)}
            </SelectInput>
          </Field>
          <DateRange from={from} to={to} onChange={(start, end, _option: RangeOption) => { setFrom(start); setTo(end); }} />
          <Button size="sm" variant="outline" icon={<SlidersHorizontal className="h-4 w-4" />} onClick={() => setFiltersOpen(true)}>Filters</Button>
          <Button size="sm" variant="navy" icon={<Filter className="h-4 w-4" />} onClick={refresh}>Load</Button>
          {ledger && <div className="rounded-lg bg-navy px-3 py-1.5 text-white">
            <p className="text-[.62rem] uppercase opacity-70">Closing · {ledger}</p>
            <p className="text-sm font-bold tabular-nums">{closingBalance}</p>
          </div>}
        </section>

        <section className="flex min-h-[35vh] flex-1 flex-col overflow-hidden rounded-xl border border-blue-200 bg-white shadow-panel">
          {ledger ? (
            <DataTable<LedgerStatementRow>
              columns={visibleColumns}
              rows={statementRows}
              rowKey={(row) => row.id}
              onRowClick={(row) => setSelectedId(row.id)}
              onRowDoubleClick={openRow}
              selectedKey={selectedId}
              pageSize={50}
              emptyTitle={`No ledger movements for ${ledger}`}
              emptyMessage="Change the date range or select another ledger."
              footer={<tr>{visibleColumns.map((column, index) => <td key={column.key} className={column.align === 'right' ? 'num' : ''}>
                {index === 0 ? `Opening ${formatINR(openingAmount)} ${String(selectedLedger?.type ?? 'Dr')} · ${statementRows.length - 1} movement(s)`
                  : column.key === 'debit' ? formatINR(statementRows.reduce((total, row) => total + row.debit, 0))
                    : column.key === 'credit' ? formatINR(statementRows.reduce((total, row) => total + row.credit, 0))
                      : column.key === 'balance' ? closingBalance : ''}
              </td>)}</tr>}
              caption={`${ledger} ledger statement`}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState title="Pick a ledger" message="Choose a ledger and date range to view its opening balance and voucher movements." icon={<ListChecks className="h-7 w-7" />} />
            </div>
          )}
        </section>

        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-navy">
          <span>{ledger ? `${ledger} · ${statementRows.length - 1} movement(s)` : 'No ledger selected'}{selectedRow?.sourceId ? ` · Current voucher: ${selectedRow.voucher}` : ''}</span>
          <div className="ml-auto inline-flex rounded-full border border-steel-200 bg-white p-0.5">
            <button type="button" aria-pressed={!detailed} className={`rounded-full px-3 py-1 text-xs font-semibold ${!detailed ? 'bg-[#c42c9a] text-white shadow-sm' : 'text-slate-600'}`} onClick={() => setDetailed(false)}>Normal view</button>
            <button type="button" aria-pressed={detailed} className={`rounded-full px-3 py-1 text-xs font-semibold ${detailed ? 'bg-[#c42c9a] text-white shadow-sm' : 'text-slate-600'}`} onClick={() => setDetailed(true)}>Detailed view</button>
          </div>
        </div>

        <footer className="no-print flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-white/90 p-2 shadow-panel">
          <ExportBar filename={`Ledger_${ledger || 'Statement'}_${from}_${to}`} columns={exportColumns} rows={exportRows as unknown as Record<string, unknown>[]} printLabel="Print A4" />
          <Button size="sm" variant="navy" icon={<RefreshCw className="h-4 w-4" />} onClick={refresh}>Refresh</Button>
          <Button size="sm" variant="outline" icon={<Printer className="h-4 w-4" />} disabled={!selectedRow?.sourceId} onClick={() => selectedRow?.sourceId && openRow()}>Open Voucher</Button>
          <Button size="sm" variant="navy" icon={<ListChecks className="h-4 w-4" />} onClick={() => navigate('/entry/voucher/display')}>Voucher Display</Button>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button size="sm" variant="primary" icon={<FilePlus2 className="h-4 w-4" />} onClick={() => navigate('/entry/voucher/create')}>New Voucher</Button>
            <Button size="sm" variant="outline" icon={<Search className="h-4 w-4" />} onClick={() => setFiltersOpen(true)}>Find</Button>
            <Button size="sm" variant="outline" icon={<SlidersHorizontal className="h-4 w-4" />} onClick={() => setOptionsOpen(true)}>Options</Button>
            <Button size="sm" variant="outline" icon={<XCircle className="h-4 w-4" />} onClick={() => navigate('/')}>Cancel</Button>
          </div>
        </footer>
      </div>

      <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Ledger statement filters" width="max-w-xl"
        footer={<><Button variant="outline" onClick={() => { setQuery(''); setTypeFilter(''); setMinAmount(''); setMaxAmount(''); }}>Clear filters</Button><Button variant="primary" onClick={() => setFiltersOpen(false)}>Apply filters</Button></>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Search voucher / particulars"><TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ledger movements" /></Field>
          <Field label="Voucher type"><SelectInput value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="">All voucher types</option>{allTypes.map((type) => <option key={type}>{type}</option>)}</SelectInput></Field>
          <Field label="Minimum debit / credit (₹)"><TextInput type="number" min={0} value={minAmount} onChange={(event) => setMinAmount(event.target.value)} placeholder="No minimum" /></Field>
          <Field label="Maximum debit / credit (₹)"><TextInput type="number" min={0} value={maxAmount} onChange={(event) => setMaxAmount(event.target.value)} placeholder="No maximum" /></Field>
        </div>
      </Modal>

      <Modal open={optionsOpen} onClose={() => setOptionsOpen(false)} title="Ledger statement options" width="max-w-lg"
        footer={<Button variant="primary" onClick={() => setOptionsOpen(false)}>Done</Button>}>
        <div className="mb-4 inline-flex rounded-full border border-steel-200 bg-white p-0.5">
          <button type="button" aria-pressed={!detailed} className={`rounded-full px-3 py-1 text-xs font-semibold ${!detailed ? 'bg-[#c42c9a] text-white' : 'text-slate-600'}`} onClick={() => setDetailed(false)}>Normal view</button>
          <button type="button" aria-pressed={detailed} className={`rounded-full px-3 py-1 text-xs font-semibold ${detailed ? 'bg-[#c42c9a] text-white' : 'text-slate-600'}`} onClick={() => setDetailed(true)}>Detailed view</button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {ledgerColumns.map((column) => <label key={column} className="flex items-center gap-2 rounded-lg border border-blue-100 px-2 py-1.5 text-sm">
            <input type="checkbox" checked={!hiddenColumns.includes(column)} onChange={() => setHiddenColumns((current) => current.includes(column) ? current.filter((item) => item !== column) : current.length >= ledgerColumns.length - 1 ? current : [...current, column])} />{column}
          </label>)}
        </div>
        <p className="mt-3 text-xs text-slate-500">Detailed view adds voucher narration to the statement.</p>
      </Modal>
    </>
  );
}
