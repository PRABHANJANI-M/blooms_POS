import type { CompanyProfile, UserAccount } from '../types';

/** DEMO company profile. The company list is what "Change Company" switches between. */
export const companies: CompanyProfile[] = [
  {
    id: 'co1', name: 'Blooms Retail Pvt Ltd', businessType: 'Retail & Wholesale',
    address1: '12, Anna Salai', address2: 'Near Central Bus Stand', city: 'Chennai', state: '33 - Tamil Nadu', pincode: '600002',
    phone: '044-40000001', email: 'accounts@blooms-demo.example', gstin: '33AAACB1234F1Z5', pan: 'AAACB1234F',
    gstRegistered: true, fyStart: '2026-04-01', fyEnd: '2027-03-31',
  },
  {
    id: 'co2', name: 'Blooms Foods & Spices', businessType: 'Food Processing',
    address1: '45, Market Road', address2: '', city: 'Coimbatore', state: '33 - Tamil Nadu', pincode: '641001',
    phone: '0422-4000002', email: 'hello@foods-demo.example', gstin: '33AAFCB5678G1Z2', pan: 'AAFCB5678G',
    gstRegistered: true, fyStart: '2026-04-01', fyEnd: '2027-03-31',
  },
];

export const users: UserAccount[] = [
  { id: 'u1', name: 'Admin User', username: 'admin', email: 'admin@blooms-demo.example', phone: '9800099001', role: 'Owner', active: true, lastLogin: '04-11-2026 02:01 PM' },
  { id: 'u2', name: 'Priya Counter', username: 'priya', email: 'priya@blooms-demo.example', phone: '9800099002', role: 'Cashier', active: true, lastLogin: '04-11-2026 09:12 AM' },
  { id: 'u3', name: 'Karthik Accounts', username: 'karthik', email: 'karthik@blooms-demo.example', phone: '9800099003', role: 'Accountant', active: true, lastLogin: '03-11-2026 06:40 PM' },
  { id: 'u4', name: 'Divya Stores', username: 'divya', email: 'divya@blooms-demo.example', phone: '9800099004', role: 'Staff', active: false, lastLogin: '20-10-2026 11:03 AM' },
];

export const permissionModules = ['Sales', 'Purchase', 'Stock', 'Reports', 'Accounts', 'Masters', 'Settings', 'Backup'] as const;

export const backupHistory = [
  { id: 'b1', file: 'blooms_backup_2026-11-03_2200.bak', size: '14.2 MB', createdAt: '03-11-2026 10:00 PM', kind: 'Scheduled', status: 'Valid' },
  { id: 'b2', file: 'blooms_backup_2026-10-31_2200.bak', size: '13.9 MB', createdAt: '31-10-2026 10:00 PM', kind: 'Scheduled', status: 'Valid' },
  { id: 'b3', file: 'manual_before_fy_close.bak', size: '13.4 MB', createdAt: '31-03-2026 06:15 PM', kind: 'Manual', status: 'Valid' },
];
