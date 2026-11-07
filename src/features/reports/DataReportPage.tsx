import { useMemo, useState } from 'react';
import { Search, CalendarRange, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard, type StatTone } from '../../components/ui/StatCard';
import { Panel } from '../../components/ui/Panel';
import { DemoNotice } from '../../components/ui/DemoNotice';
import { DataTable, type Column } from '../../components/tables/DataTable';
import { DateRange, type RangeOption } from '../../components/common/DateRange';
import { ExportBar } from '../../components/common/ExportBar';
import { SalesPurchaseChart } from '../../components/charts/SalesPurchaseChart';
import { TextInput } from '../../components/ui/Field';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../services/api';
import { formatINR, formatMoneyPlain, formatQty, sumBy } from '../../utils/money';
import { toDisplayDate, todayISO } from '../../utils/date';
import type { ReportDef, ReportRow } from '../../types';

interface Card { label: string; value: string; tone: StatTone; hint?: string }

/** Summary cards per statement type. Figures are computed from the rows, never typed in by hand. */
const summarize = (def: ReportDef, rows: ReportRow[]): Card[] => {
  const num = (r: ReportRow, k: string) => Number(r[k] ?? 0);
  if (def.slug === 'trial-balance') {
    const dr = sumBy(rows, (r) => num(r, 'debit'));
    const cr = sumBy(rows, (r) => num(r, 'credit'));
    const ok = Math.abs(dr - cr) < 0.005;
    return [
      { label: 'Total debit', value: formatINR(dr), tone: 'navy' },
      { label: 'Total credit', value: formatINR(cr), tone: 'steel' },
      { label: 'Status', value: ok ? 'Balanced' : 'Not balanced', tone: ok ? 'cream' : 'fiery', hint: ok ? 'Debit equals credit' : `Difference ${formatINR(Math.abs(dr - cr))}` },
    ];
  }
  if (def.slug === 'profit-loss') {
    const income = sumBy(rows.filter((r) => r.section === 'Income'), (r) => num(r, 'amount'));
    const expense = sumBy(rows.filter((r) => r.section === 'Expense'), (r) => num(r, 'amount'));
    const profit = Math.round((income - expense) * 100) / 100;
    return [
      { label: 'Total income', value: formatINR(income), tone: 'navy' },
      { label: 'Total expense', value: formatINR(expense), tone: 'steel' },
      { label: profit >= 0 ? 'Net profit' : 'Net loss', value: formatINR(Math.abs(profit)), tone: profit >= 0 ? 'cream' : 'fiery' },
    ];
  }
  if (def.slug === 'balance-sheet') {
    const liab = sumBy(rows.filter((r) => r.side === 'Liabilities'), (r) => num(r, 'amount'));
    const assets = sumBy(rows.filter((r) => r.side === 'Assets'), (r) => num(r, 'amount'));
    const ok = Math.abs(liab - assets) < 0.005;
    return [
      { label: 'Liabilities', value: formatINR(liab), tone: 'navy' },
      { label: 'Assets', value: formatINR(assets), tone: 'steel' },
      { label: 'Status', value: ok ? 'Balanced' : 'Not balanced', tone: ok ? 'cream' : 'fiery' },
    ];
  }
  const tones: StatTone[] = ['navy', 'steel', 'maroon', 'fiery'];
  const totals = (def.totalKeys ?? []).slice(0, 3).map((k, i) => ({
    label: `Total ${def.columns.find((c) => c.key === k)?.label ?? k}`,
    value: formatINR(sumBy(rows, (r) => num(r, k))),
    tone: tones[i],
  }));
  return [{ label: 'Records', value: formatQty(rows.length), tone: 'cream' as StatTone }, ...totals];
};

/**
 * Shared page for every Reports and Accounts statement.
 * Dated statements get From/To filters and a day-stepper; all statements get search, sorting,
 * pagination, summary cards, a chart for sales-style reports and Excel / PDF / Print exports.
 */
export function DataReportPage({ source, slug }: { source: 'report' | 'account'; slug: string }) {
  const loader = () => (source === 'report' ? api.getReport(slug) : api.getAccount(slug));
  const { data: def, loading, error } = useAsync(loader, [source, slug]);
  const [from, setFrom] = useState('2026-10-01');
  const [to, setTo] = useState(todayISO());
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    if (!def) return [];
    const q = query.trim().toLowerCase();
    return def.rows.filter((r) => {
      if (q && !Object.values(r).some((v) => String(v).toLowerCase().includes(q))) return false;
      return true;
    });
  }, [def, query]);

  const chartData = useMemo(() => {
    if (!def || !['sales-summary', 'purchase-summary'].includes(def.slug)) return null;
    return def.rows.slice(0, 12).map((r, i) => ({ month: String(r.date ?? r.supplier ?? i + 1).slice(0, 5), sales: Number(r.total ?? r.taxable ?? 0), purchases: Number(r.net ?? 0) }));
  }, [def]);

  if (error) return <Panel title="Could not load"><p className="text-fiery">{error}</p></Panel>;

  const columns: Column<ReportRow>[] = (def?.columns ?? []).map((c) => ({
    key: c.key,
    header: c.label,
    align: c.align ?? (c.format === 'money' || c.format === 'number' || c.format === 'percent' ? 'right' : 'left'),
    sortValue: (r: ReportRow) => (c.format === 'money' || c.format === 'number' || c.format === 'percent' ? Number(r[c.key] ?? 0) : String(r[c.key] ?? '')),
    render: (r: ReportRow) => {
      const v = r[c.key];
      if (c.format === 'money') return formatMoneyPlain(Number(v ?? 0));
      if (c.format === 'percent') return `${Number(v ?? 0).toFixed(2)}%`;
      if (c.format === 'number') return formatQty(Number(v ?? 0));
      if (c.format === 'date') return toDisplayDate(String(v ?? ''));
      return String(v ?? '');
    },
  }));

  const footerTotals = def?.totalKeys?.length
    ? def.totalKeys
    : [];

  return (
    <>
      <PageHeader
        title={def?.title ?? 'Loading…'}
        subtitle={def?.subtitle}
        actions={def ? <ExportBar filename={def.title.replace(/\s+/g, '_')} columns={def.columns.map((c) => ({ key: c.key, label: c.label }))} rows={rows as unknown as Record<string, unknown>[]} /> : undefined}
      />
      <div className="space-y-4">
        <DemoNotice>Figures are sample values generated for demonstration. They are not real business or accounting results.</DemoNotice>

        {def?.dated && (
          <Panel bodyClassName="p-3 sm:p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <DateRange from={from} to={to} onChange={(f, t, _o: RangeOption) => { setFrom(f); setTo(t); }} />
              <div className="flex items-center gap-2 text-xs text-slate-500"><CalendarRange className="h-4 w-4" /> Period {toDisplayDate(from)} – {toDisplayDate(to)}</div>
            </div>
          </Panel>
        )}

        {def && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summarize(def, def.rows).map((c) => (
              <StatCard key={c.label} label={c.label} value={c.value} tone={c.tone} hint={c.hint} icon={
                c.label === 'Status' ? (c.value === 'Balanced' ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />) : undefined} />
            ))}
          </div>
        )}

        {chartData && (
          <Panel title="Trend" bodyClassName="p-3"><SalesPurchaseChart data={chartData} /></Panel>
        )}

        <Panel flush title={def?.title ?? 'Report'} actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <TextInput compact value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search rows…" className="w-56 pl-8" aria-label="Search rows" />
          </div>
        }>
          <DataTable<ReportRow>
            columns={columns}
            rows={rows}
            rowKey={(r) => JSON.stringify(r)}
            loading={loading}
            pageSize={12}
            emptyTitle="No rows for these filters"
            emptyMessage="Try clearing the search or widening the dates."
            caption={def?.title}
            footer={footerTotals.length && def ? (
              <tr>
                {def.columns.map((c, i) => (
                  <td key={c.key} className={c.align === 'right' ? 'num' : undefined}>
                    {i === 0 ? 'Total' : footerTotals.includes(c.key) ? formatMoneyPlain(sumBy(rows, (r) => Number(r[c.key] ?? 0))) : ''}
                  </td>
                ))}
              </tr>
            ) : undefined}
          />
        </Panel>
      </div>
    </>
  );
}
