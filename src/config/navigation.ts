import {
  LayoutDashboard, FilePlus2, Database, BarChart3, Landmark, Settings2,
  Building2, LogOut, Receipt, Undo2, FileText, ClipboardList, Truck, ShoppingCart,
  PackageMinus, PackageCheck, ArrowLeftRight, Factory, FileMinus2, FilePlus, BookOpen,
  Wallet, CircleDollarSign, Scale, Coins, ListChecks, Hash, Users, MessageSquare,
  Repeat, DatabaseBackup, CalendarRange, Layers, ArrowRightLeft, Clock3, Percent,
  type LucideIcon,
} from 'lucide-react';

/**
 * Single source of truth for the sidebar, breadcrumbs and router.
 * A node with `children` is an expandable parent; a node with `path` is a page.
 * Nesting is supported to any depth by the reusable Sidebar component.
 */
export interface NavNode {
  id: string;
  label: string;
  icon: LucideIcon;
  path?: string;
  shortcut?: string;
  children?: NavNode[];
}

export const navigation: NavNode[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  {
    id: 'entry', label: 'Entry', icon: FilePlus2,
    children: [
      {
        id: 'entry-sales', label: 'Sales', icon: Receipt,
        children: [
          { id: 'sales-create', label: 'Create', icon: FilePlus, path: '/entry/sales/create', shortcut: 'F2' },
          { id: 'sales-pos', label: 'Sales Bill - POS', icon: ShoppingCart, path: '/entry/sales/pos' },
          { id: 'sales-display', label: 'Display', icon: ListChecks, path: '/entry/sales/display', shortcut: 'F3' },
          { id: 'sales-counter', label: 'Counter Closing', icon: Clock3, path: '/entry/sales/counter-closing' },
          { id: 'sales-settlement', label: 'Card / UPI Settlement', icon: Landmark, path: '/entry/sales/card-upi-settlement' },
        ],
      },
      {
        id: 'entry-sales-return', label: 'Sales Return', icon: Undo2,
        children: [
          { id: 'sr-create', label: 'Create', icon: FilePlus, path: '/entry/sales-return/create' },
          { id: 'sr-display', label: 'Display', icon: ListChecks, path: '/entry/sales-return/display' },
        ],
      },
      {
        id: 'entry-quotation', label: 'Quotation', icon: FileText,
        children: [
          { id: 'qt-create', label: 'Create', icon: FilePlus, path: '/entry/quotation/create', shortcut: 'F4' },
          { id: 'qt-display', label: 'Display', icon: ListChecks, path: '/entry/quotation/display', shortcut: 'F6' },
        ],
      },
      {
        id: 'entry-sales-order', label: 'Sales Order', icon: ClipboardList,
        children: [
          { id: 'so-create', label: 'Create', icon: FilePlus, path: '/entry/sales-order/create' },
          { id: 'so-display', label: 'Display', icon: ListChecks, path: '/entry/sales-order/display' },
          { id: 'so-pending', label: 'Pending Report', icon: Clock3, path: '/entry/sales-order/pending' },
        ],
      },
      {
        id: 'entry-challan', label: 'Delivery Challan', icon: Truck,
        children: [
          { id: 'dc-create', label: 'Create', icon: FilePlus, path: '/entry/delivery-challan/create' },
          { id: 'dc-display', label: 'Display', icon: ListChecks, path: '/entry/delivery-challan/display' },
          { id: 'dc-pending', label: 'Pending (not billed)', icon: Clock3, path: '/entry/delivery-challan/pending' },
        ],
      },
      {
        id: 'entry-purchase', label: 'Purchase Bill', icon: ShoppingCart,
        children: [
          { id: 'pb-create', label: 'Create', icon: FilePlus, path: '/entry/purchase-bill/create', shortcut: 'F10' },
          { id: 'pb-display', label: 'Display', icon: ListChecks, path: '/entry/purchase-bill/display' },
        ],
      },
      {
        id: 'entry-po', label: 'Purchase Order', icon: ClipboardList,
        children: [
          { id: 'po-create', label: 'Create', icon: FilePlus, path: '/entry/purchase-order/create' },
          { id: 'po-display', label: 'Display', icon: ListChecks, path: '/entry/purchase-order/display' },
          { id: 'po-pending', label: 'Pending Report', icon: Clock3, path: '/entry/purchase-order/pending' },
        ],
      },
      {
        id: 'entry-purchase-return', label: 'Purchase Return', icon: PackageMinus,
        children: [
          { id: 'pr-create', label: 'Create', icon: FilePlus, path: '/entry/purchase-return/create' },
          { id: 'pr-display', label: 'Display', icon: ListChecks, path: '/entry/purchase-return/display' },
        ],
      },
      {
        id: 'entry-stock-journal', label: 'Stock Journal', icon: Layers,
        children: [
          { id: 'sj-create', label: 'Create', icon: FilePlus, path: '/entry/stock-journal/create' },
          { id: 'sj-display', label: 'Display', icon: ListChecks, path: '/entry/stock-journal/display' },
        ],
      },
      {
        id: 'entry-stock-checking', label: 'Stock Checking', icon: PackageCheck,
        children: [
          { id: 'sc-create', label: 'Create', icon: FilePlus, path: '/entry/stock-checking/create' },
          { id: 'sc-display', label: 'Display', icon: ListChecks, path: '/entry/stock-checking/display' },
        ],
      },
      { id: 'entry-godown', label: 'Godown Transfer', icon: ArrowLeftRight, path: '/entry/godown-transfer' },
      {
        id: 'entry-production', label: 'Production', icon: Factory,
        children: [
          { id: 'pd-create', label: 'Create', icon: FilePlus, path: '/entry/production/create' },
          { id: 'pd-display', label: 'Display', icon: ListChecks, path: '/entry/production/display' },
        ],
      },
      {
        id: 'entry-credit-note', label: 'Credit Note', icon: FileMinus2,
        children: [
          { id: 'cn-create', label: 'Create', icon: FilePlus, path: '/entry/credit-note/create' },
          { id: 'cn-display', label: 'Display', icon: ListChecks, path: '/entry/credit-note/display' },
        ],
      },
      {
        id: 'entry-debit-note', label: 'Debit Note', icon: FilePlus2,
        children: [
          { id: 'dn-create', label: 'Create', icon: FilePlus, path: '/entry/debit-note/create' },
          { id: 'dn-display', label: 'Display', icon: ListChecks, path: '/entry/debit-note/display' },
        ],
      },
      {
        id: 'entry-voucher', label: 'Voucher', icon: BookOpen,
        children: [
          { id: 'vc-create', label: 'Create', icon: FilePlus, path: '/entry/voucher/create' },
          { id: 'vc-display', label: 'Display', icon: ListChecks, path: '/entry/voucher/display' },
          { id: 'vc-ledger', label: 'Ledger Statement', icon: BookOpen, path: '/entry/voucher/ledger-statement' },
        ],
      },
    ],
  },
  {
    id: 'master', label: 'Master', icon: Database,
    children: [
      { id: 'm-products', label: 'Product Master', icon: Layers, path: '/master/products' },
      { id: 'm-categories', label: 'Category Master', icon: ListChecks, path: '/master/categories' },
      { id: 'm-brands', label: 'Brand Master', icon: Hash, path: '/master/brands' },
      { id: 'm-units', label: 'Unit Master', icon: Scale, path: '/master/units' },
      { id: 'm-customers', label: 'Customer Master', icon: Users, path: '/master/customers' },
      { id: 'm-suppliers', label: 'Supplier Master', icon: Users, path: '/master/suppliers' },
      { id: 'm-agents', label: 'Agent / Salesman Master', icon: Users, path: '/master/agents' },
      { id: 'm-taxes', label: 'Tax Master', icon: Percent, path: '/master/taxes' },
      { id: 'm-godowns', label: 'Godown Master', icon: Building2, path: '/master/godowns' },
      { id: 'm-payment', label: 'Payment Modes', icon: CircleDollarSign, path: '/master/payment-modes' },
      { id: 'm-ledgers', label: 'Ledger Accounts', icon: BookOpen, path: '/master/ledgers' },
    ],
  },
  {
    id: 'reports', label: 'Reports', icon: BarChart3,
    children: [
      { id: 'r-all', label: 'All Reports', icon: Layers, path: '/reports/all' },
      { id: 'r-stock', label: 'Stock', icon: PackageCheck, path: '/reports/stock' },
      { id: 'r-gst', label: 'GST Reports', icon: Percent, path: '/reports/gst' },
      { id: 'r-pos', label: 'POS Report', icon: ShoppingCart, path: '/reports/pos' },
      { id: 'r-sales', label: 'Sales Summary', icon: Receipt, path: '/reports/sales-summary' },
      { id: 'r-purchase', label: 'Purchase Summary', icon: Truck, path: '/reports/purchase-summary' },
      { id: 'r-outstanding', label: 'Outstanding', icon: Wallet, path: '/reports/outstanding' },
      { id: 'r-profit', label: 'Sales Profit', icon: CircleDollarSign, path: '/reports/sales-profit' },
      { id: 'r-history', label: 'History', icon: Clock3, path: '/reports/history' },
      { id: 'r-jobcard', label: 'Job Card Report', icon: ClipboardList, path: '/reports/job-card' },
    ],
  },
  {
    id: 'accounts', label: 'Accounts', icon: Landmark,
    children: [
      { id: 'a-ledger', label: 'Ledger', icon: BookOpen, path: '/accounts/ledger' },
      { id: 'a-daybook', label: 'Day Book', icon: CalendarRange, path: '/accounts/day-book' },
      { id: 'a-cashbook', label: 'Cash Book', icon: Coins, path: '/accounts/cash-book' },
      { id: 'a-bankbook', label: 'Bank Book', icon: Landmark, path: '/accounts/bank-book' },
      { id: 'a-trial', label: 'Trial Balance', icon: Scale, path: '/accounts/trial-balance' },
      { id: 'a-pl', label: 'Profit & Loss', icon: CircleDollarSign, path: '/accounts/profit-loss' },
      { id: 'a-bs', label: 'Balance Sheet', icon: Scale, path: '/accounts/balance-sheet' },
      { id: 'a-outstanding', label: 'Outstanding', icon: Wallet, path: '/accounts/outstanding' },
      { id: 'a-tally', label: 'Export to Tally', icon: DatabaseBackup, path: '/accounts/export-tally' },
    ],
  },
  {
    id: 'features', label: 'Features', icon: Settings2,
    children: [
      { id: 'f-vch', label: 'Vch Numbering', icon: Hash, path: '/features/vch-numbering' },
      { id: 'f-user', label: 'User', icon: Users, path: '/features/users' },
      { id: 'f-settings', label: 'Settings', icon: Settings2, path: '/features/settings' },
      { id: 'f-wa', label: 'W/A - SMS', icon: MessageSquare, path: '/features/whatsapp-sms' },
    ],
  },
  {
    id: 'company', label: 'Company', icon: Building2,
    children: [
      { id: 'c-create', label: 'Company Create / Alter', icon: Building2, path: '/company/create-alter' },
      { id: 'c-registration', label: 'Registration', icon: FileText, path: '/company/registration' },
      { id: 'c-period', label: 'Change Period (Alt+F2)', icon: CalendarRange, path: '/company/change-period', shortcut: 'Alt+F2' },
      { id: 'c-fy', label: 'Financial Year Dates', icon: CalendarRange, path: '/company/financial-year' },
      { id: 'c-split', label: 'Split Financial Year', icon: Repeat, path: '/company/split-financial-year' },
      { id: 'c-backup', label: 'Backup / Restore', icon: DatabaseBackup, path: '/company/backup-restore' },
    ],
  },
  {
    id: 'quit', label: 'Quit', icon: LogOut,
    children: [
      { id: 'q-change', label: 'Change Company (Alt+F3)', icon: ArrowRightLeft, path: '/quit/change-company', shortcut: 'Alt+F3' },
      { id: 'q-logout', label: 'Logout', icon: LogOut, path: '/quit/logout' },
    ],
  },
];

/** Flattens the tree into every page path, for route generation and tests. */
export const flattenNav = (nodes: NavNode[] = navigation): NavNode[] =>
  nodes.flatMap((n) => (n.children ? flattenNav(n.children) : [n]));

/** Returns the ids of the parents that contain the given path, so the active branch stays open. */
export const ancestorIds = (path: string, nodes: NavNode[] = navigation): string[] => {
  const walk = (list: NavNode[], trail: string[]): string[] | null => {
    for (const n of list) {
      if (n.path === path) return trail;
      if (n.children) {
        const found = walk(n.children, [...trail, n.id]);
        if (found) return found;
      }
    }
    return null;
  };
  return walk(nodes, []) ?? [];
};

/** Breadcrumb trail for a page path, e.g. Entry > Sales > Create. */
export const breadcrumbFor = (path: string, nodes: NavNode[] = navigation, trail: NavNode[] = []): NavNode[] | null => {
  for (const n of nodes) {
    if (n.path === path) return [...trail, n];
    if (n.children) {
      const found = breadcrumbFor(path, n.children, [...trail, n]);
      if (found) return found;
    }
  }
  return null;
};
