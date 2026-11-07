# Blooms AI – Fiery Ocean Frontend

A React + TypeScript + Vite + Tailwind CSS frontend for the Blooms AI billing and business-management software. It runs entirely on demo data. No real payments, SMS/WhatsApp messages, backups, database writes or cloud sync happen anywhere in this app.

## 1. Extract the ZIP

Unzip `BloomsAI_FieryOcean_Frontend.zip` to any folder (for example `Documents/BloomsAI_FieryOcean_Frontend`). Do not put it inside a synced folder while installing.

## 2. Open in VS Code

1. Open VS Code.
2. `File → Open Folder…` and select the extracted `BloomsAI_FieryOcean_Frontend` folder.
3. Open the integrated terminal (`Ctrl+`` ` or `View → Terminal`).

## 3. Node.js version

Use **Node.js 20.19+ or 22.12+** (Vite 8 requires this). Check with:

```bash
node -v
npm -v
```

Install the current LTS from https://nodejs.org if needed.

## 4. Install

```bash
npm install
```

## 5. Run in development

```bash
npm run dev
```

Open the URL shown in the terminal (normally http://localhost:5173). Sign in with the demo user **`admin`**. The login is a demo interaction and is not real authentication.

## 6. Build for production

```bash
npm run build
```

This runs TypeScript checks (`tsc -b`) and then `vite build`. The output goes to `dist/`. To preview the production build locally:

```bash
npm run preview
```

Other scripts: `npm run typecheck` runs the TypeScript check on its own.

## 7. What is included

- **Login** (demo user `admin`) and a company / period selector.
- **Dashboard**: Today's Summary tiles, KPI cards, sales vs purchase chart, quick actions, recent bills, activity, top products, outstanding, low stock and latest transactions.
- **Entry** (the entry menu from the reference video): Sales (Create, Sales Bill – POS, Display, Counter Closing, Card / UPI Settlement), Sales Return, Quotation, Sales Order, Delivery Challan, Purchase Bill, Purchase Order, Purchase Return, Stock Journal, Stock Checking, Godown Transfer, Production, Credit Note, Debit Note, and Voucher (including Ledger Statement). Billing screens have a form, item grid, totals, and Create / Display / Pending views where the menu lists them. Sales Return Create includes bill lookup, return reason, item and tax adjustments, and print/import actions; its Display includes date filtering, normal/detailed views, totals, exports, print, and session-record management. Quotation Create includes customer and payment type, agent, credit/discount terms, item/tax/profit columns, sundry, and a Make Bill action that transfers the quotation to Sales Bill. Quotation Display includes date filtering, normal/detailed item and terms views, totals, exports, print and bill-print actions, advanced filters, and session-record management. Sales Order Create includes cash/credit selection, customer details, validity and credit/discount terms, agent and price selection, batch/profit item columns, after-tax sundry, import/print/share actions, and order controls. Sales Order Display includes date filtering, an empty state, order count and net total, normal/detailed item and order-term views, exports, bill printing, WhatsApp and E-waybill demo actions, advanced filters, and session-record management. Delivery Challan Create includes customer/address and agent details, cash/credit and credit-discount terms, item batches and profits, after-tax sundry, item import, print/share and order actions. Purchase Bill Create includes supplier invoice number/date, a purchase-specific batch and tax item grid, an item-master price-update option, and Order, AI Import, Sticker, Excel Import, print and save actions. AI Import and external integrations are labeled as demo/unconnected; item-master price updates and records are session-only. All demo records remain session-only.
- **Master**: 11 masters (products, categories, brands, units, customers, suppliers, agents, taxes, godowns, payment modes, ledger accounts), each with a generic list and create / edit / delete dialog.
- **Reports**: 10 reports (stock, GST, POS, sales and purchase summaries, outstanding, sales profit, history, job card) with date range, search, sort, pagination and Excel / PDF / Print export.
- **Accounts**: 9 statements (ledger, day book, cash book, bank book, trial balance, profit & loss, balance sheet, outstanding, Tally export preview).
- **Features**: voucher numbering, users and roles, settings, WhatsApp / SMS templates and reminders (demo only).
- **Company**: create / alter company, registration, change period, financial year, split financial year (demo only), backup and restore (demo only).
- **Quit**: change company, logout.
- **Keyboard shortcuts**: `Alt+F2` change period, `Alt+F3` change company, `Esc` back to the dashboard from billing screens. Entry screens also show an open-screens strip at the bottom.

Every screen that shows numbers is marked as demo data. Demo data is generated deterministically and lives in memory, so changes last only for the current browser session and are lost on refresh.

## 8. Demo data and what is simulated

| Action | What happens in this build |
| --- | --- |
| Save a voucher / master | Stored in memory for the session only. |
| Payment / receipt | Shown in the UI only. No real payment is taken. |
| Send WhatsApp / SMS | Shown as a demo message only. Nothing is sent. |
| Backup / restore | Demo messages only. No file is read or written. |
| Tally export | Shows an XML preview only. Nothing is sent to Tally. |
| Split financial year | Preview and confirmation only. Nothing changes. |

## 9. Connecting a real backend later

All data access goes through one service layer:

- `src/services/config.ts` reads `VITE_DATA_MODE` (default `demo`).
- `src/services/api.ts` contains the functions the screens call (`getParties`, `getItems`, `getDashboard`, `getReport`, `getAccount`, `getBackups`, and the write actions). The write actions currently reject with "needs a connected backend".

To connect a backend:

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_DATA_MODE=api` and fill in your API or Supabase settings.
3. Implement the functions in `src/services/api.ts` against your backend.
4. Replace the auth stub in `src/store/appStore.ts` (`login`) with real authentication.

Do not set `VITE_DATA_MODE=api` until those functions are implemented; the screens will otherwise show the "needs a connected backend" message.

## 10. Hosting notes

This is a single-page app using client-side routing. Your host must serve `index.html` for unknown paths (a SPA fallback), otherwise refreshing a deep link such as `/reports/gst` will return 404. Most static hosts have a setting for this (for example a `_redirects` file on Netlify or a `rewrites` rule on Vercel).

## 11. Project structure

```
src/
  components/   shared UI, tables, navigation, layout, charts
  config/       navigation tree, palette
  features/     one folder per module (auth, dashboard, billing, entry, master, reports, accounts, features, company, quit)
  layouts/      app shell and demo banner
  mock-data/    deterministic demo data
  services/     data-access layer (demo or API)
  store/        zustand stores (app state and in-memory demo store)
  styles/       Tailwind theme and component classes (Fiery Ocean palette)
  utils/        money, dates, billing totals, number-to-words, CSV, export
```

## 12. Palette

Fiery Ocean: Deep Maroon `#7B0000`, Fiery Red `#C81020`, Warm Cream `#FFF1D6`, Ocean Navy `#00334A`, Steel Blue `#669DBA`. The values are defined once in `src/styles/index.css` (`@theme`) and `src/config/palette.ts`.
