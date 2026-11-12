import type { SalesBillRow, VoucherRow, PayMode } from '../types';

/** DEMO sales register rows. The first eight mirror the "Recent Sales Bills" shape seen in the reference video. */
export const recentSalesBills: SalesBillRow[] = [
  { no: 30, date: '2026-11-04', party: 'Sedhu Provision Store', type: 'Credit', amount: 300, paid: 0, mode: 'Credit', status: 'Unpaid' },
  { no: 29, date: '2026-11-03', party: 'Riverside Retail', type: 'Cash', amount: 2100, paid: 2100, mode: 'Cash', status: 'Paid' },
  { no: 28, date: '2026-11-03', party: 'Nadha Electricals', type: 'Credit', amount: 2100, paid: 0, mode: 'Credit', status: 'Unpaid' },
  { no: 27, date: '2026-11-03', party: 'City Cash Customer', type: 'Cash', amount: 2200, paid: 2200, mode: 'Cash', status: 'Paid' },
  { no: 26, date: '2026-11-02', party: 'Sedhu Provision Store', type: 'Credit', amount: 2200, paid: 1000, mode: 'UPI', status: 'Partly Paid' },
  { no: 25, date: '2026-11-02', party: 'Anand Stores', type: 'Cash', amount: 480, paid: 480, mode: 'UPI', status: 'Paid' },
  { no: 24, date: '2026-11-02', party: 'Nadha Electricals', type: 'Credit', amount: 2100, paid: 0, mode: 'Credit', status: 'Unpaid' },
  { no: 23, date: '2026-11-01', party: 'Nadha Electricals', type: 'Credit', amount: 1700, paid: 700, mode: 'Bank Transfer', status: 'Partly Paid' },
];

export const paymentModes: PayMode[] = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Credit', 'Other'];

/** Generic voucher register rows keyed by entry kind (used by Display screens). */
export const voucherHistory: Record<string, VoucherRow[]> = {
  quotation: [
    { id: 'q1', no: 'QT-14', date: '2026-11-01', party: 'Bangalore Gift Hub', amount: 12450, status: 'Open', extra: 'Valid till 01/12/2026' },
    { id: 'q2', no: 'QT-15', date: '2026-11-03', party: 'Kerala Spice House', amount: 6320, status: 'Converted' },
  ],
  'sales-return': [],
  'sales-order': [
    { id: 'so1', no: 'SO-88', date: '2026-10-30', party: 'Lakshmi Textiles', amount: 15800, status: 'Pending' },
    { id: 'so2', no: 'SO-89', date: '2026-11-02', party: 'Green Valley Mart', amount: 4420, status: 'Part Billed' },
  ],
  'delivery-challan': [
    { id: 'dc1', no: 'DC-41', date: '2026-11-02', party: 'Vinayaga Hardware', amount: 8900, status: 'Not billed' },
  ],
  'purchase-bill': [
    { id: 'pb1', no: 'P-212', date: '2026-10-31', party: 'Bharat Wholesale Agencies', amount: 85000, status: 'Credit' },
    { id: 'pb2', no: 'P-213', date: '2026-11-03', party: 'Surya Industries', amount: 6500, status: 'Cash' },
  ],
  'purchase-order': [
    { id: 'po1', no: 'PO-22', date: '2026-11-01', party: 'Rajdhani Distributors', amount: 42300, status: 'Pending' },
  ],
  'purchase-return': [],
  'stock-journal': [{ id: 'sj1', no: 'SJ-3', date: '2026-11-02', party: 'Main Godown', amount: 0, status: 'Posted' }],
  'stock-checking': [{ id: 'sk1', no: 'SC-2', date: '2026-10-28', party: 'Main Godown', amount: 0, status: 'Adjusted' }],
  production: [{ id: 'pr1', no: 'PR-5', date: '2026-11-01', party: 'Masala Unit', amount: 1850, status: 'Completed' }],
  'credit-note': [{ id: 'cn1', no: 'CN-9', date: '2026-11-02', party: 'Anand Stores', amount: 480, status: 'Adjusted' }],
  'debit-note': [{ id: 'dn1', no: 'DN-4', date: '2026-10-29', party: 'Coastal Brands Pvt Ltd', amount: 1200, status: 'Adjusted' }],
  voucher: [
    {
      id: 'v1', no: 'RCPT-101', date: '2026-11-03', party: 'Anand Stores', amount: 1500, status: 'Receipt', series: 'Receipt',
      extra: 'GST Nature: -- None -- · Narration: Amount received from Anand Stores',
      voucherEntries: [
        { uid: 'v1-1', side: 'Cr', account: 'Anand Stores', debit: 0, credit: 1500 },
        { uid: 'v1-2', side: 'Dr', account: 'Cash', debit: 1500, credit: 0 },
      ],
    },
    {
      id: 'v2', no: 'PMT-57', date: '2026-11-03', party: 'Bharat Wholesale Agencies', amount: 5000, status: 'Payment', series: 'Payment',
      extra: 'GST Nature: -- None -- · Narration: Payment to Bharat Wholesale Agencies',
      voucherEntries: [
        { uid: 'v2-1', side: 'Dr', account: 'Bharat Wholesale Agencies', debit: 5000, credit: 0 },
        { uid: 'v2-2', side: 'Cr', account: 'Cash', debit: 0, credit: 5000 },
      ],
    },
  ],
  'sales-bill': [],
};

export const counterDenominations = [500, 200, 100, 50, 20, 10, 5, 2, 1] as const;
