/** DEMO dashboard figures. Not real business data. */
export const dashboardKpis = {
  totalSales: 1284650,
  totalPurchases: 934200,
  todayRevenue: 7965,
  monthlyRevenue: 412380,
  totalCustomers: 128,
  totalSuppliers: 24,
  totalProducts: 20,
  outstandingPayments: 152340,
  lowStockCount: 7,
};

export const monthlySalesPurchase = [
  { month: 'Jun', sales: 92000, purchases: 61000 },
  { month: 'Jul', sales: 105000, purchases: 70500 },
  { month: 'Aug', sales: 98400, purchases: 66200 },
  { month: 'Sep', sales: 121300, purchases: 80100 },
  { month: 'Oct', sales: 136700, purchases: 91500 },
  { month: 'Nov', sales: 118950, purchases: 78400 },
];

export const topSellingProducts = [
  { name: 'Basmati Rice 5kg', units: 184, revenue: 88320 },
  { name: 'Sugar 1kg', units: 420, revenue: 18480 },
  { name: 'Toor Dal 1kg', units: 160, revenue: 24000 },
  { name: 'LED Bulb 9W', units: 96, revenue: 9120 },
  { name: 'Cotton Towel', units: 54, revenue: 9990 },
];

export const recentActivities = [
  { id: 1, text: 'Sales bill #30 created for Sedhu Provision Store', time: '02:01 PM' },
  { id: 2, text: 'Counter closing drafted for 04-11-2026', time: '01:48 PM' },
  { id: 3, text: 'Purchase bill P-213 saved (demo)', time: '11:20 AM' },
  { id: 4, text: 'Stock low alert: Garam Masala 100g', time: '09:05 AM' },
  { id: 5, text: 'Receipt RCPT-101 recorded from Anand Stores', time: '09:00 AM' },
];

export const dashboardTransactions = [
  { no: 'INV-30', date: '04-11-2026', party: 'Sedhu Provision Store', type: 'Sales', amount: 300 },
  { no: 'INV-29', date: '03-11-2026', party: 'Riverside Retail', type: 'Sales', amount: 2100 },
  { no: 'P-213', date: '03-11-2026', party: 'Surya Industries', type: 'Purchase', amount: 6500 },
  { no: 'RCPT-101', date: '03-11-2026', party: 'Anand Stores', type: 'Receipt', amount: 1500 },
  { no: 'INV-26', date: '02-11-2026', party: 'Sedhu Provision Store', type: 'Sales', amount: 2200 },
];
