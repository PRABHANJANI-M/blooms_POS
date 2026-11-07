import type { ReportDef, ReportRow } from '../types';
import { rng, pick, between } from './seed';
import { parties } from './parties';
import { items } from './items';

/**
 * DEMO report datasets. Generated deterministically from the demo masters above,
 * so they are obviously sample values and never real transactions.
 */
const dayStr = (offset: number): string => {
  const d = new Date(2026, 10, 4);
  d.setDate(d.getDate() - offset);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

const customers = parties.filter((p) => p.kind === 'customer');
const suppliers = parties.filter((p) => p.kind === 'supplier');
const money = (min: number, max: number) => Math.round(between(min, max) * 100) / 100;

const salesRows: ReportRow[] = Array.from({ length: 30 }, (_, i) => {
  const taxable = money(800, 9000);
  const gst = Math.round(taxable * 0.09 * 100) / 100;
  return { date: dayStr(29 - i), invoices: between(2, 14), taxable, cgst: gst, sgst: gst, total: Math.round((taxable + gst * 2) * 100) / 100 };
});

const purchaseRows: ReportRow[] = suppliers.flatMap((s) => [
  { supplier: s.name, city: s.city ?? '', bills: between(1, 6), taxable: money(5000, 90000), returns: money(0, 1200), net: money(4000, 80000) },
]);

const stockRows: ReportRow[] = items.map((it) => {
  const opening = between(10, 120);
  const purchased = between(0, 80);
  const sold = Math.min(opening + purchased, between(0, 90));
  const closing = opening + purchased - sold;
  return { code: it.code, name: it.name, category: it.category, unit: it.unit, opening, purchased, sold, closing, value: Math.round(closing * it.rate * 100) / 100, reorder: it.reorderLevel };
});

const gstRows: ReportRow[] = Array.from({ length: 24 }, (_, i) => {
  const c = pick(customers);
  const slab = pick([0, 5, 12, 18]);
  const taxable = money(300, 12000);
  const half = Math.round(taxable * (slab / 200) * 100) / 100;
  const igst = c.state.startsWith('33') ? 0 : Math.round(taxable * (slab / 100) * 100) / 100;
  return {
    invoice: `INV-${String(i + 1).padStart(3, '0')}`, date: dayStr(20 - (i % 20)), party: c.name, gstin: c.gstin ?? 'Unregistered',
    slab: `${slab}%`, taxable, cgst: igst ? 0 : half, sgst: igst ? 0 : half, igst,
    total: Math.round((taxable + (igst || half * 2)) * 100) / 100,
  };
});

const posRows: ReportRow[] = Array.from({ length: 18 }, (_, i) => ({
  bill: `POS-${String(200 + i).padStart(4, '0')}`, time: `${String(between(9, 20)).padStart(2, '0')}:${String(between(0, 59)).padStart(2, '0')}`,
  cashier: pick(['Priya Counter', 'Admin User']), items: between(1, 9), mode: pick(['Cash', 'UPI', 'Card']), amount: money(40, 3200),
}));

const outstandingRows: ReportRow[] = customers.filter((c) => c.balance > 0).flatMap((c, i) => [
  { party: c.name, billNo: `INV-${20 + i}`, billDate: dayStr(10 + i * 3), dueDate: dayStr(i * 3 - 10), amount: c.balance, overdueDays: Math.max(0, i * 3 - 10 + 1) },
]);

const profitRows: ReportRow[] = Array.from({ length: 22 }, (_, i) => {
  const sales = money(300, 6000);
  const cost = Math.round(sales * (0.6 + rng() * 0.25) * 100) / 100;
  return { bill: `INV-${String(i + 40).padStart(3, '0')}`, date: dayStr(i), party: pick(customers).name, sales, cost, profit: Math.round((sales - cost) * 100) / 100, margin: Math.round(((sales - cost) / sales) * 10000) / 100 };
});

const historyRows: ReportRow[] = [
  { at: '04-11-2026 02:01 PM', user: 'Admin User', action: 'Created', ref: 'Sales Bill #30', detail: 'Credit sale, 1 line' },
  { at: '04-11-2026 01:48 PM', user: 'Priya Counter', action: 'Edited', ref: 'Counter Closing', detail: 'Denomination count saved' },
  { at: '03-11-2026 06:40 PM', user: 'Karthik Accounts', action: 'Posted', ref: 'Voucher RCPT-101', detail: 'Receipt from Anand Stores' },
  { at: '03-11-2026 11:20 AM', user: 'Admin User', action: 'Created', ref: 'Purchase Bill P-213', detail: 'Surya Industries' },
  { at: '02-11-2026 09:14 AM', user: 'Admin User', action: 'Deleted', ref: 'Quotation QT-13', detail: 'Draft removed' },
  { at: '01-11-2026 05:30 PM', user: 'Priya Counter', action: 'Viewed', ref: 'Day Book', detail: 'Report opened' },
];

const jobRows: ReportRow[] = Array.from({ length: 12 }, (_, i) => ({
  job: `JC-${String(310 + i)}`, date: dayStr(i * 2), customer: pick(customers).name,
  device: pick(['Mixer Grinder', 'Ceiling Fan', 'Water Pump', 'Iron Box', 'Inverter Battery']),
  technician: pick(['Selvam', 'Arun', 'Basheer']), status: pick(['Open', 'In Progress', 'Delivered']), charges: money(150, 2400),
}));

const cols = {
  sales: [
    { key: 'date', label: 'Date', format: 'date' as const },
    { key: 'invoices', label: 'Invoices', format: 'number' as const, align: 'right' as const },
    { key: 'taxable', label: 'Taxable', format: 'money' as const, align: 'right' as const },
    { key: 'cgst', label: 'CGST', format: 'money' as const, align: 'right' as const },
    { key: 'sgst', label: 'SGST', format: 'money' as const, align: 'right' as const },
    { key: 'total', label: 'Total', format: 'money' as const, align: 'right' as const },
  ],
};

export const reportDefs: Record<string, ReportDef> = {
  stock: {
    slug: 'stock', title: 'Stock Report', subtitle: 'Opening, movement and closing stock by item', dated: true, tone: 'stock',
    columns: [
      { key: 'code', label: 'Code' }, { key: 'name', label: 'Item' }, { key: 'category', label: 'Category' }, { key: 'unit', label: 'Unit' },
      { key: 'opening', label: 'Opening', format: 'number', align: 'right' }, { key: 'purchased', label: 'Purchased', format: 'number', align: 'right' },
      { key: 'sold', label: 'Sold', format: 'number', align: 'right' }, { key: 'closing', label: 'Closing', format: 'number', align: 'right' },
      { key: 'reorder', label: 'Reorder Lvl', format: 'number', align: 'right' }, { key: 'value', label: 'Value', format: 'money', align: 'right' },
    ],
    rows: stockRows, totalKeys: ['value'],
  },
  gst: {
    slug: 'gst', title: 'GST Reports', subtitle: 'Outward supplies by GST slab (GSTR-1 style summary)', dated: true, tone: 'gst',
    columns: [
      { key: 'invoice', label: 'Invoice' }, { key: 'date', label: 'Date', format: 'date' }, { key: 'party', label: 'Party' }, { key: 'gstin', label: 'GSTIN' },
      { key: 'slab', label: 'Rate' }, { key: 'taxable', label: 'Taxable', format: 'money', align: 'right' },
      { key: 'cgst', label: 'CGST', format: 'money', align: 'right' }, { key: 'sgst', label: 'SGST', format: 'money', align: 'right' },
      { key: 'igst', label: 'IGST', format: 'money', align: 'right' }, { key: 'total', label: 'Total', format: 'money', align: 'right' },
    ],
    rows: gstRows, totalKeys: ['taxable', 'cgst', 'sgst', 'igst', 'total'],
  },
  pos: {
    slug: 'pos', title: 'POS Report', subtitle: 'Counter bills by cashier and payment mode', dated: true, tone: 'sales',
    columns: [
      { key: 'bill', label: 'Bill No' }, { key: 'time', label: 'Time' }, { key: 'cashier', label: 'Cashier' },
      { key: 'items', label: 'Lines', format: 'number', align: 'right' }, { key: 'mode', label: 'Mode' },
      { key: 'amount', label: 'Amount', format: 'money', align: 'right' },
    ],
    rows: posRows, totalKeys: ['amount'],
  },
  'sales-summary': {
    slug: 'sales-summary', title: 'Sales Summary', subtitle: 'Day-wise sales with CGST and SGST split', dated: true, tone: 'sales',
    columns: cols.sales,
    rows: salesRows, totalKeys: ['taxable', 'cgst', 'sgst', 'total'],
  },
  'purchase-summary': {
    slug: 'purchase-summary', title: 'Purchase Summary', subtitle: 'Supplier-wise purchases with returns', dated: true, tone: 'purchase',
    columns: [
      { key: 'supplier', label: 'Supplier' }, { key: 'city', label: 'City' },
      { key: 'bills', label: 'Bills', format: 'number', align: 'right' }, { key: 'taxable', label: 'Taxable', format: 'money', align: 'right' },
      { key: 'returns', label: 'Returns', format: 'money', align: 'right' }, { key: 'net', label: 'Net', format: 'money', align: 'right' },
    ],
    rows: purchaseRows, totalKeys: ['taxable', 'returns', 'net'],
  },
  outstanding: {
    slug: 'outstanding', title: 'Outstanding Receivables', subtitle: 'Unpaid customer bills with overdue ageing', dated: false, tone: 'money',
    columns: [
      { key: 'party', label: 'Party' }, { key: 'billNo', label: 'Bill' }, { key: 'billDate', label: 'Bill Date', format: 'date' },
      { key: 'dueDate', label: 'Due Date', format: 'date' }, { key: 'overdueDays', label: 'Overdue (days)', format: 'number', align: 'right' },
      { key: 'amount', label: 'Outstanding', format: 'money', align: 'right' },
    ],
    rows: outstandingRows, totalKeys: ['amount'],
  },
  'sales-profit': {
    slug: 'sales-profit', title: 'Sales Profit', subtitle: 'Gross margin per bill (sample costing)', dated: true, tone: 'sales',
    columns: [
      { key: 'bill', label: 'Bill' }, { key: 'date', label: 'Date', format: 'date' }, { key: 'party', label: 'Party' },
      { key: 'sales', label: 'Sales', format: 'money', align: 'right' }, { key: 'cost', label: 'Cost', format: 'money', align: 'right' },
      { key: 'profit', label: 'Profit', format: 'money', align: 'right' }, { key: 'margin', label: 'Margin %', format: 'percent', align: 'right' },
    ],
    rows: profitRows, totalKeys: ['sales', 'cost', 'profit'],
  },
  history: {
    slug: 'history', title: 'History', subtitle: 'Who did what, and when (audit trail sample)', dated: false, tone: 'accounts',
    columns: [
      { key: 'at', label: 'When' }, { key: 'user', label: 'User' }, { key: 'action', label: 'Action' },
      { key: 'ref', label: 'Reference' }, { key: 'detail', label: 'Detail' },
    ],
    rows: historyRows,
  },
  'job-card': {
    slug: 'job-card', title: 'Job Card Report', subtitle: 'Service and repair job cards with charges', dated: true, tone: 'sales',
    columns: [
      { key: 'job', label: 'Job No' }, { key: 'date', label: 'Date', format: 'date' }, { key: 'customer', label: 'Customer' },
      { key: 'device', label: 'Item / Device' }, { key: 'technician', label: 'Technician' }, { key: 'status', label: 'Status' },
      { key: 'charges', label: 'Charges', format: 'money', align: 'right' },
    ],
    rows: jobRows, totalKeys: ['charges'],
  },
};
