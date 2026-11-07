import type { ReportDef, Party, Item, CompanyProfile, UserAccount } from '../types';
import { parties } from '../mock-data/parties';
import { items } from '../mock-data/items';
import { reportDefs } from '../mock-data/reports';
import { accountDefs } from '../mock-data/accounts';
import { dashboardKpis, monthlySalesPurchase, topSellingProducts, recentActivities, dashboardTransactions } from '../mock-data/dashboard';
import { backupHistory } from '../mock-data/company';
import { isDemo } from './config';

/**
 * Service layer. Components call these functions only (never mock-data directly).
 * In demo mode they resolve sample data after a short delay so loading states are visible.
 * When a real backend is connected, swap the bodies here; the UI does not change.
 */
const delay = <T,>(value: T, ms = 380): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), ms));

const notConnected = (what: string): Promise<never> =>
  Promise.reject(new Error(`${what} needs a connected backend. This is demo mode, so nothing was sent or saved.`));

export const api = {
  isDemo,
  getParties: (kind?: Party['kind']): Promise<Party[]> => delay(kind ? parties.filter((p) => p.kind === kind) : parties),
  getItems: (): Promise<Item[]> => delay(items),
  getDashboard: () => delay({ kpis: dashboardKpis, monthly: monthlySalesPurchase, topProducts: topSellingProducts, activities: recentActivities, transactions: dashboardTransactions }, 600),
  getReport: (slug: string): Promise<ReportDef> => {
    const def = reportDefs[slug];
    return def ? delay(def, 500) : Promise.reject(new Error(`Unknown report: ${slug}`));
  },
  getAccount: (slug: string): Promise<ReportDef> => {
    const def = accountDefs[slug];
    return def ? delay(def, 500) : Promise.reject(new Error(`Unknown account statement: ${slug}`));
  },
  getBackups: () => delay(backupHistory, 400),
  /** Real backup/restore/WhatsApp/SMS/payment calls are not available without a backend. */
  createBackup: (): Promise<never> => notConnected('Creating a backup'),
  restoreBackup: (): Promise<never> => notConnected('Restoring a backup'),
  sendWhatsApp: (): Promise<never> => notConnected('Sending a WhatsApp message'),
  sendSms: (): Promise<never> => notConnected('Sending an SMS'),
  exportTally: (): Promise<never> => notConnected('Sending data to Tally'),
  saveCompany: (c: CompanyProfile): Promise<CompanyProfile> => delay(c, 300),
  saveUser: (u: UserAccount): Promise<UserAccount> => delay(u, 300),
};
