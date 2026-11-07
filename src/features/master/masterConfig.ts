import { stateList } from '../../mock-data/parties';
import { categories, brands, units } from '../../mock-data/items';

export type FieldType = 'text' | 'email' | 'number' | 'select' | 'checkbox' | 'textarea';

export interface MasterField {
  key: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  options?: string[];
  /** Show this field as a column in the list table. */
  inTable?: boolean;
  hint?: string;
}

export interface MasterCollection {
  slug: string;
  title: string;
  singular: string;
  /** Route group note shown on the page (Master menu hierarchy). */
  group: string;
  fields: MasterField[];
}

const active: MasterField = { key: 'active', label: 'Active', type: 'checkbox' };
const partyFields: MasterField[] = [
  { key: 'name', label: 'Name', required: true, inTable: true },
  { key: 'city', label: 'City', inTable: true },
  { key: 'state', label: 'State', type: 'select', options: stateList, inTable: true },
  { key: 'gstin', label: 'GSTIN', hint: 'Leave blank if unregistered' },
  { key: 'phone', label: 'Mobile', inTable: true, hint: '10-digit mobile number' },
  { key: 'balance', label: 'Opening balance (₹)', type: 'number', hint: 'Positive = receivable, negative = payable' },
  active,
];

export const masterCollections: Record<string, MasterCollection> = {
  products: {
    slug: 'products', title: 'Product Master', singular: 'product', group: 'Items',
    fields: [
      { key: 'code', label: 'Item code', required: true, inTable: true },
      { key: 'name', label: 'Item name', required: true, inTable: true },
      { key: 'category', label: 'Category', type: 'select', options: categories, inTable: true },
      { key: 'brand', label: 'Brand', type: 'select', options: brands, inTable: true },
      { key: 'unit', label: 'Unit', type: 'select', options: units, inTable: true },
      { key: 'hsn', label: 'HSN code' },
      { key: 'rate', label: 'Sale rate (₹)', type: 'number', inTable: true },
      { key: 'mrp', label: 'MRP (₹)', type: 'number' },
      { key: 'gstRate', label: 'GST %', type: 'number', inTable: true },
      { key: 'stock', label: 'Opening stock', type: 'number' },
      { key: 'reorderLevel', label: 'Reorder level', type: 'number' },
      { key: 'barcode', label: 'Barcode / SKU' },
    ],
  },
  categories: {
    slug: 'categories', title: 'Category Master', singular: 'category', group: 'Items',
    fields: [{ key: 'name', label: 'Category name', required: true, inTable: true }, active],
  },
  brands: {
    slug: 'brands', title: 'Brand Master', singular: 'brand', group: 'Items',
    fields: [{ key: 'name', label: 'Brand name', required: true, inTable: true }, active],
  },
  units: {
    slug: 'units', title: 'Unit Master', singular: 'unit', group: 'Items',
    fields: [
      { key: 'name', label: 'Unit name', required: true, inTable: true },
      { key: 'symbol', label: 'Symbol', inTable: true },
      { key: 'decimals', label: 'Decimal places allowed', type: 'number', hint: 'e.g. 3 for kg/litre' },
      active,
    ],
  },
  customers: {
    slug: 'customers', title: 'Customer Master', singular: 'customer', group: 'Parties', fields: partyFields,
  },
  suppliers: {
    slug: 'suppliers', title: 'Supplier Master', singular: 'supplier', group: 'Parties', fields: partyFields,
  },
  agents: {
    slug: 'agents', title: 'Agent / Salesman Master', singular: 'agent', group: 'Parties',
    fields: [
      { key: 'name', label: 'Name', required: true, inTable: true },
      { key: 'city', label: 'Area', inTable: true },
      { key: 'phone', label: 'Mobile', inTable: true },
      { key: 'state', label: 'State', type: 'select', options: stateList },
      { key: 'balance', label: 'Commission due (₹)', type: 'number' },
      active,
    ],
  },
  taxes: {
    slug: 'taxes', title: 'Tax Master', singular: 'tax slab', group: 'Tax',
    fields: [
      { key: 'name', label: 'Tax name', required: true, inTable: true },
      { key: 'rate', label: 'Total GST %', type: 'number', inTable: true },
      { key: 'cgst', label: 'CGST %', type: 'number', inTable: true, hint: 'Half of total for intra-state' },
      { key: 'sgst', label: 'SGST %', type: 'number', inTable: true },
      { key: 'igst', label: 'IGST %', type: 'number', hint: 'Equal to total GST for inter-state' },
      active,
    ],
  },
  godowns: {
    slug: 'godowns', title: 'Godown Master', singular: 'godown', group: 'Stock locations',
    fields: [
      { key: 'name', label: 'Godown name', required: true, inTable: true },
      { key: 'address', label: 'Address', inTable: true },
      { key: 'incharge', label: 'In-charge', inTable: true },
      active,
    ],
  },
  'payment-modes': {
    slug: 'payment-modes', title: 'Payment Modes', singular: 'payment mode', group: 'Configuration',
    fields: [
      { key: 'name', label: 'Mode name', required: true, inTable: true },
      { key: 'kind', label: 'Kind', type: 'select', options: ['Cash', 'Digital', 'Bank', 'Other'], inTable: true },
      { key: 'ledger', label: 'Posts to ledger', inTable: true },
      active,
    ],
  },
  ledgers: {
    slug: 'ledgers', title: 'Ledger Accounts', singular: 'ledger', group: 'Accounts',
    fields: [
      { key: 'name', label: 'Ledger name', required: true, inTable: true },
      { key: 'group', label: 'Under group', type: 'select', options: ['Cash-in-hand', 'Bank Accounts', 'Sundry Debtors', 'Sundry Creditors', 'Sales Accounts', 'Purchase Accounts', 'Duties & Taxes', 'Indirect Expenses', 'Capital Account'], inTable: true },
      { key: 'openingBalance', label: 'Opening balance (₹)', type: 'number', inTable: true },
      { key: 'type', label: 'Dr / Cr', type: 'select', options: ['Dr', 'Cr'], inTable: true },
      active,
    ],
  },
};
