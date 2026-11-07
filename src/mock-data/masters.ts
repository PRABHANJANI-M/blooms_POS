import type { MasterRecord } from '../types';
import { items, categories, brands, units } from './items';
import { parties } from './parties';

/** DEMO master collections. Each is editable in memory during the session only. */
const rec = (o: object): MasterRecord => ({ ...o } as MasterRecord);

export const masterSeeds: Record<string, MasterRecord[]> = {
  products: items.map(rec),
  categories: categories.map((name, i) => rec({ id: `cat${i}`, name, active: true, items: items.filter((it) => it.category === name).length })),
  brands: brands.map((name, i) => rec({ id: `brd${i}`, name, active: true })),
  units: units.map((name, i) => rec({ id: `unt${i}`, name, symbol: name.toLowerCase(), decimals: name === 'Kg' || name === 'Ltr' ? 3 : 0, active: true })),
  customers: parties.filter((p) => p.kind === 'customer').map(rec),
  suppliers: parties.filter((p) => p.kind === 'supplier').map(rec),
  agents: parties.filter((p) => p.kind === 'agent').map(rec),
  taxes: [
    rec({ id: 'tx0', name: 'GST 0%', rate: 0, cgst: 0, sgst: 0, igst: 0, hsnCount: 3, active: true }),
    rec({ id: 'tx5', name: 'GST 5%', rate: 5, cgst: 2.5, sgst: 2.5, igst: 5, hsnCount: 6, active: true }),
    rec({ id: 'tx12', name: 'GST 12%', rate: 12, cgst: 6, sgst: 6, igst: 12, hsnCount: 3, active: true }),
    rec({ id: 'tx18', name: 'GST 18%', rate: 18, cgst: 9, sgst: 9, igst: 18, hsnCount: 5, active: true }),
  ],
  godowns: [
    rec({ id: 'g1', name: 'MAIN GODOWN', address: 'Anna Salai warehouse', incharge: 'Selvam', active: true }),
    rec({ id: 'g2', name: 'SHOP', address: 'Front counter display', incharge: 'Priya', active: true }),
  ],
  'payment-modes': [
    rec({ id: 'pm1', name: 'Cash', kind: 'Cash', ledger: 'Cash in Hand', active: true }),
    rec({ id: 'pm2', name: 'UPI', kind: 'Digital', ledger: 'UPI Settlement', active: true }),
    rec({ id: 'pm3', name: 'Card', kind: 'Digital', ledger: 'Card Settlement', active: true }),
    rec({ id: 'pm4', name: 'Bank Transfer', kind: 'Bank', ledger: 'HDFC Current A/c', active: true }),
    rec({ id: 'pm5', name: 'Cheque', kind: 'Bank', ledger: 'HDFC Current A/c', active: false }),
  ],
  ledgers: [
    rec({ id: 'l1', name: 'Cash in Hand', group: 'Cash-in-hand', openingBalance: 7200, type: 'Dr', active: true }),
    rec({ id: 'l2', name: 'HDFC Current A/c', group: 'Bank Accounts', openingBalance: 185400, type: 'Dr', active: true }),
    rec({ id: 'l3', name: 'Sales A/c', group: 'Sales Accounts', openingBalance: 0, type: 'Cr', active: true }),
    rec({ id: 'l4', name: 'Purchase A/c', group: 'Purchase Accounts', openingBalance: 0, type: 'Dr', active: true }),
    rec({ id: 'l5', name: 'GST Payable', group: 'Duties & Taxes', openingBalance: 47210, type: 'Cr', active: true }),
  ],
};
