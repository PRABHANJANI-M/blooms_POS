import type { ReportDef, ReportRow } from '../types';

/**
 * DEMO accounting statements. Balances are sample figures chosen to be internally consistent
 * (debits equal credits in the trial balance) and are NOT real accounting transactions.
 */
const ledgerRows: ReportRow[] = [
  { date: '01-04-2026', voucher: 'OPENING', particulars: 'Opening balance b/f', debit: 42000, credit: 0, balance: 42000, side: 'Dr' },
  { date: '12-06-2026', voucher: 'SAL-11', particulars: 'Sales (cash)', debit: 0, credit: 3150, balance: 38850, side: 'Dr' },
  { date: '03-08-2026', voucher: 'RCPT-44', particulars: 'Receipt against SAL-19', debit: 0, credit: 8000, balance: 30850, side: 'Dr' },
  { date: '20-09-2026', voucher: 'SAL-30', particulars: 'Sales on credit', debit: 6750, credit: 0, balance: 37600, side: 'Dr' },
  { date: '04-11-2026', voucher: 'RCPT-101', particulars: 'Receipt (cash)', debit: 0, credit: 1500, balance: 36100, side: 'Dr' },
];

const dayBookRows: ReportRow[] = [
  { date: '04-11-2026', type: 'Sales', no: 'INV-30', particulars: 'Sedhu Provision Store', debit: 300, credit: 300 },
  { date: '03-11-2026', type: 'Purchase', no: 'P-213', particulars: 'Surya Industries', debit: 6500, credit: 6500 },
  { date: '03-11-2026', type: 'Receipt', no: 'RCPT-101', particulars: 'Anand Stores', debit: 1500, credit: 1500 },
  { date: '02-11-2026', type: 'Payment', no: 'PMT-57', particulars: 'Bharat Wholesale Agencies', debit: 5000, credit: 5000 },
  { date: '02-11-2026', type: 'Credit Note', no: 'CN-9', particulars: 'Anand Stores', debit: 480, credit: 480 },
];

const cashRows: ReportRow[] = [
  { date: '01-11-2026', particulars: 'Opening cash', receipt: 0, payment: 0, balance: 7200 },
  { date: '02-11-2026', particulars: 'Cash sales (counter)', receipt: 4650, payment: 0, balance: 11850 },
  { date: '02-11-2026', particulars: 'Payment to Surya Industries', receipt: 0, payment: 2000, balance: 9850 },
  { date: '03-11-2026', particulars: 'Receipt RCPT-101', receipt: 1500, payment: 0, balance: 11350 },
  { date: '04-11-2026', particulars: 'Counter closing (expected)', receipt: 0, payment: 3385, balance: 7965 },
];

const bankRows: ReportRow[] = [
  { date: '01-11-2026', particulars: 'Opening bank (Main A/c)', receipt: 0, payment: 0, balance: 185400 },
  { date: '02-11-2026', particulars: 'Card / UPI settlement', receipt: 6230, payment: 0, balance: 191630 },
  { date: '03-11-2026', particulars: 'NEFT to Bharat Wholesale', receipt: 0, payment: 15000, balance: 176630 },
  { date: '03-11-2026', particulars: 'Bank charges', receipt: 0, payment: 118, balance: 176512 },
];

/** Built so that total debits equal total credits exactly (checked in the verification step). */
const balancedTrial: ReportRow[] = [
  { ledger: 'Cash in Hand', group: 'Cash-in-hand', debit: 7965, credit: 0 },
  { ledger: 'HDFC Current A/c', group: 'Bank Accounts', debit: 176512, credit: 0 },
  { ledger: 'Sundry Debtors', group: 'Sundry Debtors', debit: 152340, credit: 0 },
  { ledger: 'Fixed Assets', group: 'Fixed Assets', debit: 240000, credit: 0 },
  { ledger: 'Opening Stock', group: 'Stock-in-hand', debit: 280000, credit: 0 },
  { ledger: 'Purchase A/c', group: 'Purchase Accounts', debit: 934200, credit: 0 },
  { ledger: 'Rent & Utilities', group: 'Indirect Expenses', debit: 96000, credit: 0 },
  { ledger: 'Salaries & Wages', group: 'Indirect Expenses', debit: 214000, credit: 0 },
  { ledger: 'Closing Stock (asset)', group: 'Stock-in-hand', debit: 318900, credit: 0 },
  { ledger: 'Sundry Creditors', group: 'Sundry Creditors', debit: 0, credit: 224550 },
  { ledger: 'Capital Account', group: 'Capital Account', debit: 0, credit: 500000 },
  { ledger: 'Loan from Director', group: 'Loans (Liability)', debit: 0, credit: 40487 },
  { ledger: 'GST Payable', group: 'Duties & Taxes', debit: 0, credit: 47210 },
  { ledger: 'Sales A/c', group: 'Sales Accounts', debit: 0, credit: 1284650 },
  { ledger: 'Other Income (interest)', group: 'Indirect Income', debit: 0, credit: 4120 },
  { ledger: 'Closing Stock (adjustment)', group: 'Stock-in-hand', debit: 0, credit: 318900 },
];

const plRows: ReportRow[] = [
  { head: 'Sales Accounts', section: 'Income', amount: 1284650 },
  { head: 'Other Income (interest)', section: 'Income', amount: 4120 },
  { head: 'Opening stock', section: 'Expense', amount: 280000 },
  { head: 'Purchase Accounts', section: 'Expense', amount: 934200 },
  { head: 'Closing stock', section: 'Expense', amount: -318900 },
  { head: 'Rent & Utilities', section: 'Expense', amount: 96000 },
  { head: 'Salaries & Wages', section: 'Expense', amount: 214000 },
];

const bsRows: ReportRow[] = [
  { side: 'Liabilities', head: 'Capital Account', amount: 500000 },
  { side: 'Liabilities', head: 'Current Year Profit', amount: 83470 },
  { side: 'Liabilities', head: 'Loan from Director', amount: 40487 },
  { side: 'Liabilities', head: 'Sundry Creditors', amount: 224550 },
  { side: 'Liabilities', head: 'Duties & Taxes (GST)', amount: 47210 },
  { side: 'Assets', head: 'Fixed Assets', amount: 240000 },
  { side: 'Assets', head: 'Stock-in-hand', amount: 318900 },
  { side: 'Assets', head: 'Sundry Debtors', amount: 152340 },
  { side: 'Assets', head: 'Bank & Cash', amount: 184477 },
];

const outRows: ReportRow[] = [
  { party: 'Lakshmi Textiles', type: 'Receivable', amount: 18750.5, days: 12 },
  { party: 'Bangalore Gift Hub', type: 'Receivable', amount: 12500, days: 33 },
  { party: 'Green Valley Mart', type: 'Receivable', amount: 9360, days: 5 },
  { party: 'Bharat Wholesale Agencies', type: 'Payable', amount: 85000, days: 18 },
  { party: 'Rajdhani Distributors', type: 'Payable', amount: 42300, days: 41 },
];

const tallyRows: ReportRow[] = [
  { batch: 'TALLY-0411-01', from: '01-11-2026', to: '04-11-2026', vouchers: 27, status: 'Demo export ready' },
  { batch: 'TALLY-1031-02', from: '25-10-2026', to: '31-10-2026', vouchers: 64, status: 'Exported' },
];

export const accountDefs: Record<string, ReportDef> = {
  ledger: {
    slug: 'ledger', title: 'Ledger', subtitle: 'Party / account ledger with running balance (sample: Anand Stores)', dated: true, tone: 'accounts',
    columns: [
      { key: 'date', label: 'Date', format: 'date' }, { key: 'voucher', label: 'Voucher' }, { key: 'particulars', label: 'Particulars' },
      { key: 'debit', label: 'Debit', format: 'money', align: 'right' }, { key: 'credit', label: 'Credit', format: 'money', align: 'right' },
      { key: 'balance', label: 'Balance', format: 'money', align: 'right' }, { key: 'side', label: 'Dr/Cr' },
    ],
    rows: ledgerRows, totalKeys: ['debit', 'credit'],
  },
  'day-book': {
    slug: 'day-book', title: 'Day Book', subtitle: 'All vouchers posted in the selected period', dated: true, tone: 'accounts',
    columns: [
      { key: 'date', label: 'Date', format: 'date' }, { key: 'type', label: 'Type' }, { key: 'no', label: 'Voucher No' },
      { key: 'particulars', label: 'Particulars' }, { key: 'debit', label: 'Debit', format: 'money', align: 'right' },
      { key: 'credit', label: 'Credit', format: 'money', align: 'right' },
    ],
    rows: dayBookRows, totalKeys: ['debit', 'credit'],
  },
  'cash-book': {
    slug: 'cash-book', title: 'Cash Book', subtitle: 'Cash receipts, payments and running balance', dated: true, tone: 'accounts',
    columns: [
      { key: 'date', label: 'Date', format: 'date' }, { key: 'particulars', label: 'Particulars' },
      { key: 'receipt', label: 'Receipt (Dr)', format: 'money', align: 'right' }, { key: 'payment', label: 'Payment (Cr)', format: 'money', align: 'right' },
      { key: 'balance', label: 'Balance', format: 'money', align: 'right' },
    ],
    rows: cashRows, totalKeys: ['receipt', 'payment'],
  },
  'bank-book': {
    slug: 'bank-book', title: 'Bank Book', subtitle: 'Bank account movements (demo bank: HDFC Current A/c)', dated: true, tone: 'accounts',
    columns: [
      { key: 'date', label: 'Date', format: 'date' }, { key: 'particulars', label: 'Particulars' },
      { key: 'receipt', label: 'Deposit (Dr)', format: 'money', align: 'right' }, { key: 'payment', label: 'Withdrawal (Cr)', format: 'money', align: 'right' },
      { key: 'balance', label: 'Balance', format: 'money', align: 'right' },
    ],
    rows: bankRows, totalKeys: ['receipt', 'payment'],
  },
  'trial-balance': {
    slug: 'trial-balance', title: 'Trial Balance', subtitle: 'Closing balances by ledger; total debit must equal total credit', dated: false, tone: 'accounts',
    columns: [
      { key: 'ledger', label: 'Ledger' }, { key: 'group', label: 'Group' },
      { key: 'debit', label: 'Debit', format: 'money', align: 'right' }, { key: 'credit', label: 'Credit', format: 'money', align: 'right' },
    ],
    rows: balancedTrial, totalKeys: ['debit', 'credit'],
  },
  'profit-loss': {
    slug: 'profit-loss', title: 'Profit & Loss', subtitle: 'Income and expense heads for the financial year', dated: true, tone: 'accounts',
    columns: [
      { key: 'section', label: 'Section' }, { key: 'head', label: 'Head' },
      { key: 'amount', label: 'Amount', format: 'money', align: 'right' },
    ],
    rows: plRows,
  },
  'balance-sheet': {
    slug: 'balance-sheet', title: 'Balance Sheet', subtitle: 'Liabilities and assets as on the period end date', dated: false, tone: 'accounts',
    columns: [
      { key: 'side', label: 'Side' }, { key: 'head', label: 'Head' },
      { key: 'amount', label: 'Amount', format: 'money', align: 'right' },
    ],
    rows: bsRows,
  },
  outstanding: {
    slug: 'outstanding', title: 'Outstanding Statement', subtitle: 'Receivables and payables by party with age in days', dated: false, tone: 'money',
    columns: [
      { key: 'party', label: 'Party' }, { key: 'type', label: 'Type' },
      { key: 'days', label: 'Age (days)', format: 'number', align: 'right' },
      { key: 'amount', label: 'Amount', format: 'money', align: 'right' },
    ],
    rows: outRows, totalKeys: ['amount'],
  },
  'export-tally': {
    slug: 'export-tally', title: 'Export to Tally', subtitle: 'Prepare a Tally XML batch from vouchers (demo: file is generated locally, nothing is sent to Tally)', dated: true, tone: 'accounts',
    columns: [
      { key: 'batch', label: 'Batch' }, { key: 'from', label: 'From' }, { key: 'to', label: 'To' },
      { key: 'vouchers', label: 'Vouchers', format: 'number', align: 'right' }, { key: 'status', label: 'Status' },
    ],
    rows: tallyRows,
  },
};
