/** Shared domain types. Demo data conforms to these shapes so a real API can replace it later. */

export type ID = string;

export interface Party {
  id: ID;
  name: string;
  kind: 'customer' | 'supplier' | 'agent';
  gstin?: string;
  state: string;
  address1?: string;
  address2?: string;
  city?: string;
  phone?: string;
  balance: number; // positive = receivable, negative = payable (demo only)
  active: boolean;
}

export interface Item {
  id: ID;
  code: string;
  name: string;
  category: string;
  brand: string;
  unit: string;
  hsn: string;
  rate: number;
  purchaseRate?: number;
  mrp: number;
  gstRate: number; // percent, e.g. 5, 12, 18
  stock: number;
  reorderLevel: number;
  barcode: string;
}

/** One row of a billing voucher (sales, purchase, quotation, challan...). */
export interface BillLine {
  uid: string;
  itemId?: ID;
  code: string;
  name: string;
  detail: string;
  batchNo: string;
  unit: string;
  mrp: number;
  rate: number;
  qty: number;
  discPct: number;
  gstRate: number;
  amount: number; // qty * rate
  discAmt: number;
  taxable: number;
  taxAmt: number;
  total: number;
  profit?: number;
}

export type PayMode = 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Credit' | 'Other';

export interface Sundry {
  label: string;
  pct: number;
  amount: number;
  amountMode?: 'percent' | 'fixed';
  percentageBase?: 'taxable' | 'afterTax';
}

export interface SalesBillRow {
  no: number;
  date: string; // ISO yyyy-mm-dd
  party: string;
  type: 'Cash' | 'Credit';
  amount: number;
  paid: number;
  mode: PayMode;
  status: 'Paid' | 'Partly Paid' | 'Unpaid';
}

export interface VoucherRow {
  id: ID;
  no: string;
  date: string;
  party: string;
  amount: number;
  status: string;
  mode?: PayMode;
  paid?: number;
  lines?: BillLine[];
  extra?: string;
}

export interface MasterRecord {
  id: ID;
  [key: string]: string | number | boolean | undefined;
}

export interface ReportColumn<T> {
  key: keyof T & string;
  label: string;
  align?: 'left' | 'right';
  format?: 'money' | 'number' | 'date' | 'text';
}

export interface ReportSummaryCard {
  label: string;
  value: string;
  tone?: 'navy' | 'fiery' | 'steel' | 'maroon' | 'cream';
}

export interface UserAccount {
  id: ID;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: 'Owner' | 'Manager' | 'Cashier' | 'Accountant' | 'Staff';
  active: boolean;
  lastLogin: string;
}

export interface CompanyProfile {
  id: ID;
  name: string;
  businessType: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin: string;
  pan: string;
  gstRegistered: boolean;
  fyStart: string; // ISO
  fyEnd: string;   // ISO
}

/** Generic tabular report/ledger definition used by the Reports and Accounts modules. */
export type ReportRow = Record<string, string | number>;

export interface ReportDef {
  slug: string;
  title: string;
  subtitle: string;
  columns: { key: string; label: string; format?: 'money' | 'number' | 'date' | 'text' | 'percent'; align?: 'left' | 'right' }[];
  rows: ReportRow[];
  /** Keys in `rows` that are monetary and should be totalled in the footer. */
  totalKeys?: string[];
  /** Whether the report is filtered by a date range (true) or is a point-in-time statement (false). */
  dated: boolean;
  tone?: 'sales' | 'purchase' | 'stock' | 'money' | 'gst' | 'accounts';
}
