import type { Party } from '../../types';
import type { PriceMode } from '../billing/ItemGrid';

export type VoucherKind =
  | 'sales' | 'sales-return' | 'quotation' | 'sales-order' | 'delivery-challan'
  | 'purchase-bill' | 'purchase-order' | 'purchase-return'
  | 'stock-journal' | 'stock-checking' | 'credit-note' | 'debit-note' | 'voucher' | 'production';

export type ActionId = 'quote' | 'order' | 'delivery-challan' | 'purchase' | 'close-order' | 'from-orders' | 'auto-order' | 'extend';

export interface VoucherKindConfig {
  kind: VoucherKind;
  title: string;
  prefix: string;
  /** Party field label; undefined hides the party block (stock vouchers). */
  partyLabel?: string;
  partyKind?: Party['kind'];
  creditAllowed: boolean;
  showValidDays: boolean;
  showThrough: boolean;
  priceMode: PriceMode;
  showMrp: boolean;
  showBatch: boolean;
  showProfit: boolean;
  stockOnly: boolean;
  showSundry: boolean;
  actions: ActionId[];
  /** Route for the matching Display screen. */
  displayPath: string;
  /** Route for the matching pending report, if any. */
  pendingPath?: string;
  /** Display / list label used in toasts. */
  label: string;
}

const base = {
  creditAllowed: true, showValidDays: false, showThrough: false, priceMode: 'rate' as PriceMode,
  showMrp: false, showBatch: false, showProfit: false, stockOnly: false, showSundry: false, actions: [] as ActionId[],
};

export const voucherConfigs: Record<VoucherKind, VoucherKindConfig> = {
  sales: {
    ...base, kind: 'sales', title: 'Sales Bill', prefix: 'INV', partyLabel: 'Customer', partyKind: 'customer',
    showMrp: true, showBatch: true, showSundry: true, showThrough: true, actions: ['quote', 'order', 'delivery-challan', 'purchase'],
    displayPath: '/entry/sales/display', label: 'Sales bill',
  },
  'sales-return': {
    ...base, kind: 'sales-return', title: 'Sales Return', prefix: 'SR', partyLabel: 'Customer', partyKind: 'customer',
    showThrough: true, showBatch: true, showProfit: true, showSundry: true,
    displayPath: '/entry/sales-return/display', label: 'Sales return',
  },
  quotation: {
    ...base, kind: 'quotation', title: 'Quotation', prefix: 'QT', partyLabel: 'Customer', partyKind: 'customer',
    showThrough: true, showBatch: true, showProfit: true, showSundry: true,
    displayPath: '/entry/quotation/display', label: 'Quotation', actions: [],
  },
  'sales-order': {
    ...base, kind: 'sales-order', title: 'Sales Order', prefix: 'SO', partyLabel: 'Customer', partyKind: 'customer',
    showValidDays: true, showThrough: true, showBatch: true, showProfit: true, showSundry: true,
    displayPath: '/entry/sales-order/display', pendingPath: '/entry/sales-order/pending', label: 'Sales order', actions: ['quote', 'extend', 'close-order'],
  },
  'delivery-challan': {
    ...base, kind: 'delivery-challan', title: 'Delivery Challan', prefix: 'DC', partyLabel: 'Customer', partyKind: 'customer',
    showThrough: true, showBatch: true, showProfit: true, showSundry: true,
    displayPath: '/entry/delivery-challan/display', pendingPath: '/entry/delivery-challan/pending',
    label: 'Delivery challan', actions: ['quote', 'order', 'close-order'],
  },
  'purchase-bill': {
    ...base, kind: 'purchase-bill', title: 'Purchase Bill', prefix: 'P', partyLabel: 'Supplier', partyKind: 'supplier',
    showThrough: true, showMrp: true, showSundry: true, showBatch: true,
    displayPath: '/entry/purchase-bill/display', label: 'Purchase bill', actions: ['order'],
  },
  'purchase-order': {
    ...base, kind: 'purchase-order', title: 'Purchase Order', prefix: 'PO', partyLabel: 'Supplier', partyKind: 'supplier',
    showValidDays: true, showThrough: true, showMrp: true, showBatch: true, showSundry: true,
    displayPath: '/entry/purchase-order/display', pendingPath: '/entry/purchase-order/pending', label: 'Purchase order',
    actions: ['auto-order', 'from-orders', 'extend', 'close-order'],
  },
  'purchase-return': {
    ...base, kind: 'purchase-return', title: 'Purchase Return', prefix: 'PR', partyLabel: 'Supplier', partyKind: 'supplier',
    showSundry: true, actions: ['quote', 'order', 'close-order'],
    displayPath: '/entry/purchase-return/display', label: 'Purchase return',
  },
  'stock-journal': {
    ...base, kind: 'stock-journal', title: 'Stock Journal', prefix: 'SJ', creditAllowed: false, stockOnly: true,
    displayPath: '/entry/stock-journal/display', label: 'Stock journal',
  },
  'stock-checking': {
    ...base, kind: 'stock-checking', title: 'Stock Checking', prefix: 'SC', creditAllowed: false, stockOnly: true,
    displayPath: '/entry/stock-checking/display', label: 'Stock check',
  },
  'credit-note': {
    ...base, kind: 'credit-note', title: 'Credit Note', prefix: 'CN', partyLabel: 'Customer', partyKind: 'customer',
    displayPath: '/entry/credit-note/display', label: 'Credit note',
  },
  'debit-note': {
    ...base, kind: 'debit-note', title: 'Debit Note', prefix: 'DN', partyLabel: 'Supplier', partyKind: 'supplier',
    displayPath: '/entry/debit-note/display', label: 'Debit note',
  },
  voucher: {
    ...base, kind: 'voucher', title: 'Voucher', prefix: 'V', partyLabel: 'Account', creditAllowed: false, stockOnly: true,
    displayPath: '/entry/voucher/display', label: 'Voucher',
  },
  production: {
    ...base, kind: 'production', title: 'Production', prefix: 'PRD', creditAllowed: false, stockOnly: true,
    displayPath: '/entry/production/display', label: 'Production',
  },
};

export const actionLabels: Record<ActionId, string> = {
  quote: 'Quote',
  order: 'Order',
  'delivery-challan': 'DC',
  purchase: 'Purchase',
  'close-order': 'Close Order',
  'from-orders': 'From Sales Orders',
  'auto-order': 'Auto Order (Alt+W)',
  extend: 'Extend',
};
