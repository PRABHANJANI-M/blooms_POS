import { create } from 'zustand';
import type { Item, MasterRecord, UserAccount, VoucherRow, CompanyProfile } from '../types';
import { masterSeeds } from '../mock-data/masters';
import { users as seedUsers, companies as seedCompanies } from '../mock-data/company';
import { vchTypes as seedVch, type VchType } from '../mock-data/features';

/** Shared empty arrays: selectors must return a stable reference or React re-renders forever. */
export const NO_ROWS: VoucherRow[] = [];
export const NO_RECORDS: MasterRecord[] = [];

/**
 * In-memory demo state. Anything saved here lasts only until the page is reloaded.
 * It is never written to a database, and the UI labels it as demo data.
 */
interface DemoState {
  vouchers: Record<string, VoucherRow[]>;
  addVoucher: (kind: string, row: VoucherRow) => void;
  itemPriceUpdates: Record<string, Partial<Pick<Item, 'rate' | 'purchaseRate' | 'mrp'>>>;
  updateItemPrices: (updates: Record<string, Partial<Pick<Item, 'rate' | 'purchaseRate' | 'mrp'>>>) => void;

  masters: Record<string, MasterRecord[]>;
  upsertMaster: (collection: string, record: MasterRecord) => void;
  deleteMaster: (collection: string, id: string) => void;
  setMasterActive: (collection: string, id: string, active: boolean) => void;

  users: UserAccount[];
  saveUser: (u: UserAccount) => void;

  vchTypes: VchType[];
  saveVchType: (v: VchType) => void;

  companies: CompanyProfile[];
  saveCompany: (c: CompanyProfile) => void;
  addCompany: (c: CompanyProfile) => void;
}

export const useDemoStore = create<DemoState>((set) => ({
  vouchers: {},
  addVoucher: (kind, row) =>
    set((s) => ({ vouchers: { ...s.vouchers, [kind]: [row, ...(s.vouchers[kind] ?? [])] } })),
  itemPriceUpdates: {},
  updateItemPrices: (updates) =>
    set((s) => ({
      itemPriceUpdates: Object.fromEntries(
        Object.entries(updates).map(([id, update]) => [id, { ...s.itemPriceUpdates[id], ...update }]),
      ),
    })),

  masters: masterSeeds,
  upsertMaster: (collection, record) =>
    set((s) => {
      const list = s.masters[collection] ?? [];
      const exists = list.some((r) => r.id === record.id);
      const next = exists ? list.map((r) => (r.id === record.id ? record : r)) : [record, ...list];
      return { masters: { ...s.masters, [collection]: next } };
    }),
  deleteMaster: (collection, id) =>
    set((s) => ({ masters: { ...s.masters, [collection]: (s.masters[collection] ?? []).filter((r) => r.id !== id) } })),
  setMasterActive: (collection, id, active) =>
    set((s) => ({
      masters: {
        ...s.masters,
        [collection]: (s.masters[collection] ?? []).map((r) => (r.id === id ? { ...r, active } : r)),
      },
    })),

  users: seedUsers,
  saveUser: (u) =>
    set((s) => ({
      users: s.users.some((x) => x.id === u.id) ? s.users.map((x) => (x.id === u.id ? u : x)) : [...s.users, u],
    })),

  vchTypes: seedVch,
  saveVchType: (v) => set((s) => ({ vchTypes: s.vchTypes.map((x) => (x.id === v.id ? v : x)) })),

  companies: seedCompanies,
  saveCompany: (c) => set((s) => ({ companies: s.companies.map((x) => (x.id === c.id ? c : x)) })),
  addCompany: (c) => set((s) => ({ companies: [...s.companies, c] })),
}));
