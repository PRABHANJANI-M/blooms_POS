import { useNavigate } from 'react-router-dom';
import { Wallet, ShoppingBag, Receipt, CalendarDays, Users, Truck, Package, AlertTriangle, TrendingUp, FilePlus, ListChecks, BookOpen, Activity, Landmark, FileText, Coins } from 'lucide-react';
import { api } from '../../services/api';
import { useAsync } from '../../hooks/useAsync';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { Panel } from '../../components/ui/Panel';
import { Button } from '../../components/ui/Button';
import { DemoNotice } from '../../components/ui/DemoNotice';
import { LoadingRows, EmptyState } from '../../components/ui/EmptyState';
import { Badge, statusTone } from '../../components/ui/Badge';
import { SalesPurchaseChart } from '../../components/charts/SalesPurchaseChart';
import { DataTable, type Column } from '../../components/tables/DataTable';
import { formatINR, formatQty } from '../../utils/money';
import { toDisplayDate } from '../../utils/date';
import { recentSalesBills } from '../../mock-data/entry';
import { items } from '../../mock-data/items';
import type { SalesBillRow } from '../../types';

const quickActions = [
  { label: 'Sales Bill', path: '/entry/sales/create', icon: FilePlus, key: 'F2' },
  { label: 'Sales List', path: '/entry/sales/display', icon: ListChecks, key: 'F3' },
  { label: 'Purchase Bill', path: '/entry/purchase-bill/create', icon: ShoppingBag, key: 'F10' },
  { label: 'Quotation', path: '/entry/quotation/create', icon: FileText, key: 'F4' },
  { label: 'Ledger', path: '/accounts/ledger', icon: BookOpen, key: 'F7' },
  { label: 'Outstanding', path: '/accounts/outstanding', icon: Wallet, key: '' },
  { label: 'Voucher', path: '/entry/voucher/create', icon: Coins, key: '' },
  { label: 'Counter Closing', path: '/entry/sales/counter-closing', icon: Landmark, key: '' },
];

const billColumns: Column<SalesBillRow>[] = [
  { key: 'no', header: 'No', sortValue: (r) => r.no, render: (r) => <span className="font-semibold text-navy">{r.no}</span> },
  { key: 'date', header: 'Date', sortValue: (r) => r.date, render: (r) => toDisplayDate(r.date) },
  { key: 'party', header: 'Party', sortValue: (r) => r.party, render: (r) => r.party },
  { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
  { key: 'amount', header: 'Amount', align: 'right', sortValue: (r) => r.amount, render: (r) => formatINR(r.amount) },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useAsync(() => api.getDashboard(), []);
  const lowStock = items.filter((i) => i.stock <= i.reorderLevel);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Business overview at a glance"
        actions={<Button variant="primary" icon={<FilePlus className="h-4 w-4" />} onClick={() => navigate('/entry/sales/create')}>New Sales Bill</Button>}
      />
      <div className="mb-4"><DemoNotice /></div>

      {/* Today's summary strip — matches the reference video's entry dashboard */}
      <Panel title="Today's Summary" icon={<CalendarDays className="h-4 w-4" />} actions={<span className="text-xs font-semibold text-slate-500">{toDisplayDate('2026-11-04')}</span>} className="mb-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard tone="steel" label="Sales" value={formatINR(300)} />
          <StatCard tone="fiery" label="Sales Return" value={formatINR(0)} />
          <StatCard tone="navy" label="Purchase" value={formatINR(0)} />
          <StatCard tone="cream" label="Receipt" value={formatINR(1500)} />
          <StatCard tone="maroon" label="Payment" value={formatINR(0)} />
          <StatCard tone="steel" label="Cash in Hand" value={formatINR(7965)} />
        </div>
      </Panel>

      {/* KPI grid */}
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-fiery">{error}</div>}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard tone="navy" label="Total Sales" value={formatINR(data?.kpis.totalSales ?? 0)} icon={<TrendingUp className="h-5 w-5" />} hint="Sample figure" />
        <StatCard tone="cream" label="Total Purchases" value={formatINR(data?.kpis.totalPurchases ?? 0)} icon={<ShoppingBag className="h-5 w-5" />} />
        <StatCard tone="steel" label="Today's Revenue" value={formatINR(data?.kpis.todayRevenue ?? 0)} icon={<Receipt className="h-5 w-5" />} />
        <StatCard tone="maroon" label="Monthly Revenue" value={formatINR(data?.kpis.monthlyRevenue ?? 0)} icon={<CalendarDays className="h-5 w-5" />} />
        <StatCard tone="cream" label="Total Customers" value={String(data?.kpis.totalCustomers ?? 0)} icon={<Users className="h-5 w-5" />} />
        <StatCard tone="cream" label="Total Suppliers" value={String(data?.kpis.totalSuppliers ?? 0)} icon={<Truck className="h-5 w-5" />} />
        <StatCard tone="cream" label="Total Products" value={String(data?.kpis.totalProducts ?? 0)} icon={<Package className="h-5 w-5" />} />
        <StatCard tone="fiery" label="Low Stock Alerts" value={String(lowStock.length)} icon={<AlertTriangle className="h-5 w-5" />} hint="At or below reorder level" />
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-3">
        <Panel title="Sales & Purchases" icon={<Activity className="h-4 w-4" />} className="xl:col-span-2">
          {loading ? <LoadingRows rows={6} /> : <SalesPurchaseChart data={data?.monthly ?? []} />}
        </Panel>
        <Panel title="Quick Actions" icon={<FilePlus className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((q) => (
              <button key={q.label} type="button" onClick={() => navigate(q.path)}
                className="flex items-center gap-2 rounded-lg border border-cream-200 bg-cream-50 p-3 text-left text-sm font-semibold text-navy transition hover:-translate-y-0.5 hover:border-steel hover:bg-steel-100">
                <q.icon className="h-4 w-4 shrink-0 text-fiery" />
                <span className="min-w-0 flex-1 truncate">{q.label}</span>
                {q.key && <span className="kbd">{q.key}</span>}
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-3">
        <Panel title="Recent Sales Bills" icon={<Receipt className="h-4 w-4" />} className="xl:col-span-2" flush>
          <DataTable<SalesBillRow> columns={billColumns} rows={recentSalesBills} rowKey={(r) => String(r.no)} pageSize={8} caption="Recent sales bills" />
        </Panel>
        <Panel title="Recent Activities" icon={<Activity className="h-4 w-4" />}>
          {loading ? <LoadingRows rows={4} /> : (
            <ol className="space-y-3">
              {(data?.activities ?? []).map((a) => (
                <li key={a.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-fiery" />
                  <div className="min-w-0"><p className="text-slate-700">{a.text}</p><p className="text-xs text-slate-400">{a.time}</p></div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-3">
        <Panel title="Top-Selling Products" icon={<TrendingUp className="h-4 w-4" />} className="xl:col-span-1">
          {loading ? <LoadingRows rows={4} /> : (
            <ul className="space-y-3">
              {(data?.topProducts ?? []).map((p, i) => {
                const max = Math.max(...(data?.topProducts ?? [{ units: 1 }]).map((x) => x.units));
                return (
                  <li key={p.name}>
                    <div className="mb-1 flex justify-between text-sm"><span className="font-semibold text-navy">{i + 1}. {p.name}</span><span className="tabular-nums text-slate-600">{formatQty(p.units)} units</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-steel-100"><div className="h-full rounded-full bg-gradient-to-r from-steel to-navy" style={{ width: `${(p.units / max) * 100}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel title="Outstanding Payments" icon={<Wallet className="h-4 w-4" />}>
          <p className="text-3xl font-extrabold tabular-nums text-fiery">{formatINR(data?.kpis.outstandingPayments ?? 0)}</p>
          <p className="mt-1 text-sm text-slate-500">Across customer bills still unpaid (demo)</p>
          <Button className="mt-4" variant="outline" size="sm" onClick={() => navigate('/accounts/outstanding')}>View outstanding</Button>
        </Panel>
        <Panel title="Low Stock Alerts" icon={<AlertTriangle className="h-4 w-4" />}>
          {lowStock.length === 0 ? <EmptyState title="All items are above reorder level" /> : (
            <ul className="divide-y divide-cream-200">
              {lowStock.slice(0, 6).map((i) => (
                <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="truncate pr-2 text-slate-700">{i.name}</span>
                  <Badge tone="red">{i.stock} {i.unit}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Latest Transactions" icon={<Receipt className="h-4 w-4" />} flush>
        <DataTable
          columns={[
            { key: 'no', header: 'Voucher', render: (r) => <span className="font-semibold text-navy">{r.no}</span> },
            { key: 'date', header: 'Date', render: (r) => r.date },
            { key: 'party', header: 'Party', render: (r) => r.party },
            { key: 'type', header: 'Type', render: (r) => <Badge tone={statusTone(r.type)}>{r.type}</Badge> },
            { key: 'amount', header: 'Amount', align: 'right', render: (r) => formatINR(r.amount) },
          ]}
          rows={data?.transactions ?? []}
          rowKey={(r) => r.no}
          loading={loading}
          emptyTitle="No transactions yet"
          pageSize={5}
        />
      </Panel>
    </>
  );
}
