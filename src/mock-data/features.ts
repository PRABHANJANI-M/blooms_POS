/** DEMO configuration data for Features and Settings screens. */
export interface VchType {
  id: string;
  name: string;
  prefix: string;
  suffix: string;
  startNo: number;
  padWidth: number;
  currentNo: number;
  includeFY: boolean;
  resetEachFY: boolean;
  separator: string;
}

export const vchTypes: VchType[] = [
  { id: 'sales', name: 'Sales Bill', prefix: 'INV', suffix: '', startNo: 1, padWidth: 4, currentNo: 30, includeFY: true, resetEachFY: true, separator: '/' },
  { id: 'pos', name: 'POS Bill', prefix: 'POS', suffix: '', startNo: 200, padWidth: 4, currentNo: 218, includeFY: false, resetEachFY: false, separator: '-' },
  { id: 'sales-return', name: 'Sales Return', prefix: 'SR', suffix: '', startNo: 1, padWidth: 3, currentNo: 4, includeFY: true, resetEachFY: true, separator: '/' },
  { id: 'quotation', name: 'Quotation', prefix: 'QT', suffix: '', startNo: 1, padWidth: 3, currentNo: 15, includeFY: true, resetEachFY: true, separator: '-' },
  { id: 'purchase-bill', name: 'Purchase Bill', prefix: 'P', suffix: '', startNo: 1, padWidth: 3, currentNo: 213, includeFY: false, resetEachFY: false, separator: '' },
  { id: 'delivery-challan', name: 'Delivery Challan', prefix: 'DC', suffix: '', startNo: 1, padWidth: 2, currentNo: 41, includeFY: true, resetEachFY: true, separator: '-' },
  { id: 'receipt', name: 'Receipt Voucher', prefix: 'RCPT', suffix: '', startNo: 100, padWidth: 0, currentNo: 101, includeFY: false, resetEachFY: false, separator: '-' },
];

export const settingsDefaults = {
  company: { displayName: 'Blooms Retail', showLogoOnInvoice: true, headerText: 'Thank you for shopping with us!' },
  invoice: { paperSize: 'A4', showHsn: true, showBatch: false, showMrp: true, roundOff: true, termsText: 'Goods once sold will not be taken back.', copies: 1 },
  gst: { defaultGstRate: 18, inclusivePricing: false, placeOfSupplyRule: 'Destination state', eInvoiceEnabled: false, eWayBillEnabled: false },
  payment: { defaultMode: 'Cash', allowUpi: true, allowCard: true, allowBankTransfer: true, allowCredit: true, upiId: 'bloomsretail@examplebank', creditDays: 30 },
  preferences: { dateFormat: 'DD/MM/YYYY', currency: 'INR', decimalPlaces: 2, theme: 'Fiery Ocean', compactTables: false, keyboardShortcuts: true },
  general: { timezone: 'Asia/Kolkata', language: 'English', autoBackup: true, backupTime: '22:00', lowStockAlerts: true },
};

export const waTemplates = [
  { id: 't1', name: 'Invoice share', channel: 'WhatsApp', body: 'Hello {{customer}}, your invoice {{invoice_no}} for ₹{{amount}} is ready. Thank you!' },
  { id: 't2', name: 'Payment reminder', channel: 'WhatsApp', body: 'Dear {{customer}}, a balance of ₹{{balance}} is due on {{due_date}}. Kindly settle at your earliest.' },
  { id: 't3', name: 'Order received', channel: 'SMS', body: 'Order {{order_no}} received. We will confirm shortly. - {{company}}' },
  { id: 't4', name: 'Delivery update', channel: 'SMS', body: 'Your challan {{challan_no}} has been dispatched. - {{company}}' },
];

export const providerConfig = {
  whatsapp: { provider: 'Not connected', phoneNumberId: '', businessAccountId: '', status: 'Not configured' as const },
  sms: { provider: 'Not connected', senderId: '', templateRegisteredId: '', status: 'Not configured' as const },
};

export const reminderLog = [
  { id: 'r1', customer: 'Bangalore Gift Hub', channel: 'WhatsApp', sentAt: '03-11-2026 10:00 AM', state: 'Draft only (demo)' },
  { id: 'r2', customer: 'Lakshmi Textiles', channel: 'SMS', sentAt: '01-11-2026 09:30 AM', state: 'Draft only (demo)' },
];
