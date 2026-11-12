import { useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Factory, FilePlus2, Search } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/Field';
import { useAppStore } from '../../store/appStore';
import { NO_ROWS, useDemoStore } from '../../store/demoStore';
import { voucherHistory } from '../../mock-data/entry';
import { todayISO, toDisplayDate } from '../../utils/date';
import { formatMoneyPlain, formatQty, round2 } from '../../utils/money';
import type { VoucherRow } from '../../types';

type ProductionDisplayRow = {
  id: string;
  no: string;
  date: string;
  finishedGoods: string;
  finishedQty: number;
  rawQty: number;
  rawGoods: string;
  rawValue: number;
  expenses: number;
  totalCost: number;
  productionPct: number | null;
  narration: string;
  source: VoucherRow;
};

function financialYearRange(date: string) {
  const [yearText, monthText] = date.split('-');
  const year = Number(yearText);
  const startYear = Number(monthText) >= 4 ? year : year - 1;
  return { from: `${startYear}-04-01`, to: `${startYear + 1}-03-31` };
}

function toProductionRow(source: VoucherRow): ProductionDisplayRow {
  const finished = source.productionFinishedLines ?? [];
  const raw = source.productionRawLines ?? [];
  const finishedQty = round2(finished.reduce((sum, line) => sum + line.qty, 0));
  const rawQty = round2(raw.reduce((sum, line) => sum + line.qty, 0));
  const rawValue = round2(raw.reduce((sum, line) => sum + line.qty * line.rate, 0));
  const expenses = round2((source.productionExpenses ?? []).reduce((sum, expense) =>
    sum + (expense.type === '%' ? rawValue * expense.value / 100 : expense.value), 0));
  return {
    id: source.id,
    no: source.no,
    date: source.date,
    finishedGoods: finished.map((line) => line.name).filter(Boolean).join(', ') || '—',
    finishedQty,
    rawQty,
    rawGoods: raw.map((line) => line.name).filter(Boolean).join(', '),
    rawValue,
    expenses,
    totalCost: source.amount || round2(rawValue + expenses),
    productionPct: rawQty ? round2(finishedQty / rawQty * 100) : null,
    narration: source.extra ?? '',
    source,
  };
}

export function ProductionDisplay() {
  const navigate = useNavigate();
  const toast = useAppStore((state) => state.toast);
  const saved = useDemoStore((state) => state.vouchers.production ?? NO_ROWS);
  const range = useMemo(() => financialYearRange(todayISO()), []);
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allRows = useMemo(() => {
    const savedIds = new Set(saved.map((row) => row.id));
    return [...saved, ...(voucherHistory.production ?? []).filter((row) => !savedIds.has(row.id))].map(toProductionRow);
  }, [saved]);
  const rows = useMemo(() => allRows.filter((row) =>
    row.date >= from
    && row.date <= to
    && (!appliedQuery || `${row.finishedGoods} ${row.rawGoods} ${row.narration}`.toLowerCase().includes(appliedQuery.toLowerCase())),
  ), [allRows, from, to, appliedQuery]);
  const selectedIndex = rows.findIndex((row) => row.id === selectedId);
  const totals = useMemo(() => ({
    finishedQty: round2(rows.reduce((sum, row) => sum + row.finishedQty, 0)),
    rawQty: round2(rows.reduce((sum, row) => sum + row.rawQty, 0)),
    rawValue: round2(rows.reduce((sum, row) => sum + row.rawValue, 0)),
    expenses: round2(rows.reduce((sum, row) => sum + row.expenses, 0)),
    totalCost: round2(rows.reduce((sum, row) => sum + row.totalCost, 0)),
  }), [rows]);
  const totalProductionPct = totals.rawQty ? round2(totals.finishedQty / totals.rawQty * 100) : null;

  const showResults = () => {
    if (from && to && from > to) {
      toast({ tone: 'warning', title: 'Invalid date range', message: 'The From date must be on or before the To date.' });
      return;
    }
    setAppliedQuery(query.trim());
    setSelectedId(null);
  };
  const openRow = (id: string) => {
    const row = rows.find((entry) => entry.id === id);
    if (!row) return;
    if (!saved.some((entry) => entry.id === id)) {
      toast({ tone: 'info', title: 'Sample production entry', message: 'This example record is read-only. Create a new production entry to edit it.' });
      return;
    }
    navigate('/entry/production/create', { state: { productionId: id } });
  };
  const newProduction = () => navigate('/entry/production/create');
  const handleGridKeyDown = (event: KeyboardEvent<HTMLTableSectionElement>) => {
    if (event.key === 'F2') {
      event.preventDefault();
      newProduction();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      navigate('/');
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!rows.length) return;
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const currentIndex = selectedIndex < 0 ? (direction > 0 ? -1 : rows.length) : selectedIndex;
      const next = Math.min(rows.length - 1, Math.max(0, currentIndex + direction));
      setSelectedId(rows[next].id);
    } else if (event.key === 'Enter' && selectedId) {
      event.preventDefault();
      openRow(selectedId);
    }
  };

  return (
    <div className="production-display -mx-3 -mt-3 min-h-[calc(100vh-3.5rem)] bg-[#edf6ff] p-2 sm:-mx-4 sm:-mt-4 sm:p-2">
      <header className="production-display-header">
        <h1><Factory className="h-4 w-4" aria-hidden />Production Display</h1>
        <span>↑ ↓ move · Enter = open · F2 = new · Esc = close</span>
      </header>
      <section className="mt-2 rounded-xl border border-blue-200 bg-white p-3 shadow-panel">
        <div className="mb-2 flex flex-wrap items-end gap-2">
          <label className="production-filter-field">
            <span>From</span>
            <TextInput type="date" compact aria-label="From date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="production-filter-field">
            <span>To</span>
            <TextInput type="date" compact aria-label="To date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          <label className="production-filter-field production-filter-query">
            <span>Item / Narration</span>
            <TextInput compact aria-label="Filter by item or narration" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') showResults(); }} />
          </label>
          <Button size="sm" variant="navy" icon={<Search className="h-4 w-4" />} onClick={showResults}>Show</Button>
          <Button size="sm" variant="outline" icon={<FilePlus2 className="h-4 w-4" />} onClick={newProduction}>New (F2)</Button>
        </div>

        <div className="overflow-auto rounded-lg border border-blue-100">
          <table className="data-table production-display-table" aria-label="Production entries">
            <colgroup>
              <col className="production-col-no" />
              <col className="production-col-date" />
              <col className="production-col-finished" />
              <col className="production-col-qty" />
              <col className="production-col-qty" />
              <col className="production-col-value" />
              <col className="production-col-value" />
              <col className="production-col-value" />
              <col className="production-col-percent" />
              <col className="production-col-narration" />
            </colgroup>
            <thead>
              <tr>
                <th>No</th><th>Date</th><th>Finished Goods</th>
                <th className="num">Fin Qty</th><th className="num">Raw Qty</th>
                <th className="num">Raw Value</th><th className="num">Expenses</th>
                <th className="num">Total Cost</th><th className="num">Prod %</th><th>Narration</th>
              </tr>
            </thead>
            <tbody tabIndex={0} onKeyDown={handleGridKeyDown}>
              {rows.length ? rows.map((row) => (
                <tr
                  key={row.id}
                  className={selectedId === row.id ? 'is-selected cursor-pointer' : 'cursor-pointer'}
                  tabIndex={-1}
                  onClick={(event) => {
                    setSelectedId(row.id);
                    event.currentTarget.parentElement?.focus();
                  }}
                  onDoubleClick={() => openRow(row.id)}
                >
                  <td className="font-semibold">{row.no}</td>
                  <td>{toDisplayDate(row.date)}</td>
                  <td>{row.finishedGoods}</td>
                  <td className="num">{formatQty(row.finishedQty)}</td>
                  <td className="num">{formatQty(row.rawQty)}</td>
                  <td className="num">{formatMoneyPlain(row.rawValue)}</td>
                  <td className="num">{formatMoneyPlain(row.expenses)}</td>
                  <td className="num font-semibold">{formatMoneyPlain(row.totalCost)}</td>
                  <td className="num">{row.productionPct === null ? '—' : `${formatQty(row.productionPct)}%`}</td>
                  <td>{row.narration || '—'}</td>
                </tr>
              )) : <tr><td colSpan={10} className="production-empty">No production in this period.</td></tr>}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Total ({rows.length})</td>
                <td className="num">{formatQty(totals.finishedQty)}</td>
                <td className="num">{formatQty(totals.rawQty)}</td>
                <td className="num">{formatMoneyPlain(totals.rawValue)}</td>
                <td className="num">{formatMoneyPlain(totals.expenses)}</td>
                <td className="num">{formatMoneyPlain(totals.totalCost)}</td>
                <td className="num">{totalProductionPct === null ? '—' : `${formatQty(totalProductionPct)}%`}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
