import { create } from 'zustand';
import type { UserAccount } from '../types';
import { companies, users } from '../mock-data/company';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';
export interface Toast { id: number; tone: ToastTone; title: string; message?: string }
export interface OpenTab { path: string; label: string }

let toastSeq = 1;

interface AppState {
  /** Demo session. Login is a demo interaction, not real authentication. */
  isAuthenticated: boolean;
  user: UserAccount | null;
  companyId: string;
  periodFrom: string;
  periodTo: string;
  toasts: Toast[];
  /** Recently opened billing screens shown in the bottom task strip (like the reference video). */
  openTabs: OpenTab[];
  mobileNavOpen: boolean;
  railCollapsed: boolean;

  login: (username: string) => boolean;
  logout: () => void;
  switchCompany: (id: string) => void;
  setPeriod: (from: string, to: string) => void;
  toast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  touchTab: (path: string, label: string) => void;
  closeTab: (path: string) => void;
  setMobileNavOpen: (open: boolean) => void;
  toggleRail: () => void;
}

const firstCompany = companies[0];

export const useAppStore = create<AppState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  companyId: firstCompany.id,
  periodFrom: firstCompany.fyStart,
  periodTo: firstCompany.fyEnd,
  toasts: [],
  openTabs: [],
  mobileNavOpen: false,
  railCollapsed: false,

  login: (username) => {
    const found = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.active);
    if (!found) return false;
    set({ isAuthenticated: true, user: found });
    return true;
  },

  logout: () => set({ isAuthenticated: false, user: null, openTabs: [], toasts: [] }),

  switchCompany: (id) => {
    const c = companies.find((x) => x.id === id);
    if (!c) return;
    set({ companyId: id, periodFrom: c.fyStart, periodTo: c.fyEnd, openTabs: [] });
    get().toast({ tone: 'success', title: 'Company switched', message: `Now working in ${c.name}. Screens reloaded with this company's data.` });
  },

  setPeriod: (from, to) => set({ periodFrom: from, periodTo: to }),

  toast: (t) => {
    const id = toastSeq++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
    setTimeout(() => get().dismissToast(id), t.tone === 'error' ? 6500 : 3800);
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  touchTab: (path, label) =>
    set((s) => {
      const rest = s.openTabs.filter((t) => t.path !== path);
      return { openTabs: [...rest, { path, label }].slice(-8) };
    }),

  closeTab: (path) => set((s) => ({ openTabs: s.openTabs.filter((t) => t.path !== path) })),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  toggleRail: () => set((s) => ({ railCollapsed: !s.railCollapsed })),
}));
