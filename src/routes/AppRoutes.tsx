import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { useAppStore } from '../store/appStore';
import { LoginPage } from '../features/auth/LoginPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { VoucherForm } from '../features/entry/VoucherForm';
import { CreditNoteCreate } from '../features/entry/CreditNoteCreate';
import { CreditNoteDisplay } from '../features/entry/CreditNoteDisplay';
import { DebitNoteDisplay } from '../features/entry/DebitNoteDisplay';
import { StockJournalCreate } from '../features/entry/StockJournalCreate';
import { StockJournalDisplay } from '../features/entry/StockJournalDisplay';
import { StockCheckingCreate } from '../features/entry/StockCheckingCreate';
import { StockCheckingDisplay } from '../features/entry/StockCheckingDisplay';
import { VoucherDisplay } from '../features/entry/VoucherDisplay';
import { PendingReport } from '../features/entry/PendingReport';
import { PosBilling } from '../features/billing/PosBilling';
import { CounterClosing } from '../features/entry/CounterClosing';
import { CardUpiSettlement } from '../features/entry/CardUpiSettlement';
import { GodownTransfer } from '../features/entry/GodownTransfer';
import { Production } from '../features/entry/Production';
import { ProductionDisplay } from '../features/entry/ProductionDisplay';
import { VoucherEntry } from '../features/entry/VoucherEntry';
import { LedgerStatement } from '../features/entry/LedgerStatement';
import { voucherConfigs, type VoucherKind } from '../features/entry/voucherConfig';
import { MasterPage } from '../features/master/MasterPage';
import { AllReportsPage } from '../features/reports/AllReportsPage';
import { DataReportPage } from '../features/reports/DataReportPage';
import { TallyExportPage } from '../features/accounts/TallyExportPage';
import { VchNumberingPage } from '../features/features/VchNumberingPage';
import { UsersPage } from '../features/features/UsersPage';
import { SettingsPage } from '../features/features/SettingsPage';
import { WhatsAppSmsPage } from '../features/features/WhatsAppSmsPage';
import { CompanyCreateAlterPage } from '../features/company/CompanyCreateAlterPage';
import { RegistrationPage } from '../features/company/RegistrationPage';
import { ChangePeriodPage } from '../features/company/ChangePeriodPage';
import { FinancialYearPage } from '../features/company/FinancialYearPage';
import { SplitFinancialYearPage } from '../features/company/SplitFinancialYearPage';
import { BackupRestorePage } from '../features/company/BackupRestorePage';
import { ChangeCompanyPage } from '../features/quit/ChangeCompanyPage';
import { LogoutPage } from '../features/quit/LogoutPage';
import { NotFoundPage } from '../pages/NotFoundPage';

/** Sends visitors to sign-in unless a demo session is active. */
function RequireAuth({ children }: { children: ReactElement }) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

/** Entry billing kinds: create + display (+ pending where the menu has one). */
const entryKinds: { kind: VoucherKind; slug: string }[] = [
  { kind: 'sales', slug: 'sales' },
  { kind: 'sales-return', slug: 'sales-return' },
  { kind: 'quotation', slug: 'quotation' },
  { kind: 'sales-order', slug: 'sales-order' },
  { kind: 'delivery-challan', slug: 'delivery-challan' },
  { kind: 'purchase-bill', slug: 'purchase-bill' },
  { kind: 'purchase-order', slug: 'purchase-order' },
  { kind: 'purchase-return', slug: 'purchase-return' },
  { kind: 'stock-journal', slug: 'stock-journal' },
  { kind: 'stock-checking', slug: 'stock-checking' },
  { kind: 'credit-note', slug: 'credit-note' },
  { kind: 'debit-note', slug: 'debit-note' },
];

const masterSlugs = ['products', 'categories', 'brands', 'units', 'customers', 'suppliers', 'agents', 'taxes', 'godowns', 'payment-modes', 'ledgers'];
const reportSlugs = ['stock', 'gst', 'pos', 'sales-summary', 'purchase-summary', 'outstanding', 'sales-profit', 'history', 'job-card'];
const accountSlugs = ['ledger', 'day-book', 'cash-book', 'bank-book', 'trial-balance', 'profit-loss', 'balance-sheet', 'outstanding'];

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />

        {/* Entry module */}
        {entryKinds.map(({ kind, slug }) => (
          <Route key={kind}>
            <Route path={`/entry/${slug}/create`} element={kind === 'stock-journal' ? <StockJournalCreate /> : kind === 'stock-checking' ? <StockCheckingCreate /> : kind === 'credit-note' || kind === 'debit-note' ? <CreditNoteCreate key={kind} kind={kind} /> : <VoucherForm cfg={voucherConfigs[kind]} />} />
            <Route path={`/entry/${slug}/display`} element={kind === 'stock-journal' ? <StockJournalDisplay /> : kind === 'stock-checking' ? <StockCheckingDisplay /> : kind === 'credit-note' ? <CreditNoteDisplay /> : kind === 'debit-note' ? <DebitNoteDisplay /> : <VoucherDisplay kind={kind} />} />
          </Route>
        ))}
        <Route path="/entry/sales/pos" element={<PosBilling />} />
        <Route path="/entry/sales/counter-closing" element={<CounterClosing />} />
        <Route path="/entry/sales/card-upi-settlement" element={<CardUpiSettlement />} />
        <Route path="/entry/sales-order/pending" element={<PendingReport kind="sales-order" />} />
        <Route path="/entry/delivery-challan/pending" element={<PendingReport kind="delivery-challan" />} />
        <Route path="/entry/purchase-order/pending" element={<PendingReport kind="purchase-order" />} />
        <Route path="/entry/godown-transfer" element={<GodownTransfer />} />
        <Route path="/entry/production/create" element={<Production />} />
        <Route path="/entry/production/display" element={<ProductionDisplay />} />
        <Route path="/entry/voucher/create" element={<VoucherEntry />} />
        <Route path="/entry/voucher/display" element={<VoucherDisplay kind="voucher" />} />
        <Route path="/entry/voucher/ledger-statement" element={<LedgerStatement />} />

        {/* Master */}
        {masterSlugs.map((slug) => (
          <Route key={slug} path={`/master/${slug}`} element={<MasterPage slug={slug} />} />
        ))}

        {/* Reports */}
        <Route path="/reports/all" element={<AllReportsPage />} />
        {reportSlugs.map((slug) => (
          <Route key={slug} path={`/reports/${slug}`} element={<DataReportPage source="report" slug={slug} />} />
        ))}

        {/* Accounts */}
        {accountSlugs.map((slug) => (
          <Route key={slug} path={`/accounts/${slug}`} element={<DataReportPage source="account" slug={slug} />} />
        ))}
        <Route path="/accounts/export-tally" element={<TallyExportPage />} />

        {/* Features */}
        <Route path="/features/vch-numbering" element={<VchNumberingPage />} />
        <Route path="/features/users" element={<UsersPage />} />
        <Route path="/features/settings" element={<SettingsPage />} />
        <Route path="/features/whatsapp-sms" element={<WhatsAppSmsPage />} />

        {/* Company */}
        <Route path="/company/create-alter" element={<CompanyCreateAlterPage />} />
        <Route path="/company/registration" element={<RegistrationPage />} />
        <Route path="/company/change-period" element={<ChangePeriodPage />} />
        <Route path="/company/financial-year" element={<FinancialYearPage />} />
        <Route path="/company/split-financial-year" element={<SplitFinancialYearPage />} />
        <Route path="/company/backup-restore" element={<BackupRestorePage />} />

        {/* Quit */}
        <Route path="/quit/change-company" element={<ChangeCompanyPage />} />
        <Route path="/quit/logout" element={<LogoutPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
