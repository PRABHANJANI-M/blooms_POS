import type { Party } from '../types';

/** DEMO parties. Names are invented sample data. */
export const parties: Party[] = [
  { id: 'c1', name: 'Anand Stores', kind: 'customer', state: '33 - Tamil Nadu', city: 'Chennai', phone: '9800000001', gstin: '33AAAAA0001A1Z5', balance: 4200, active: true },
  { id: 'c2', name: 'Lakshmi Textiles', kind: 'customer', state: '33 - Tamil Nadu', city: 'Coimbatore', phone: '9800000002', gstin: '33BBBBB0002B1Z6', balance: 18750.5, active: true },
  { id: 'c3', name: 'Sri Murugan Traders', kind: 'customer', state: '33 - Tamil Nadu', city: 'Madurai', phone: '9800000003', balance: 0, active: true },
  { id: 'c4', name: 'Green Valley Mart', kind: 'customer', state: '33 - Tamil Nadu', city: 'Salem', phone: '9800000004', gstin: '33CCCCC0003C1Z7', balance: 9360, active: true },
  { id: 'c5', name: 'Kerala Spice House', kind: 'customer', state: '32 - Kerala', city: 'Kochi', phone: '9800000005', gstin: '32DDDDD0004D1Z8', balance: 2400, active: true },
  { id: 'c6', name: 'Bangalore Gift Hub', kind: 'customer', state: '29 - Karnataka', city: 'Bengaluru', phone: '9800000006', gstin: '29EEEEE0005E1Z9', balance: 12500, active: true },
  { id: 'c7', name: 'City Cash Customer', kind: 'customer', state: '33 - Tamil Nadu', city: 'Chennai', phone: '', balance: 0, active: true },
  { id: 'c8', name: 'Vinayaga Hardware', kind: 'customer', state: '33 - Tamil Nadu', city: 'Tiruchirappalli', phone: '9800000008', balance: 6780, active: true },
  { id: 'c9', name: 'Nadha Electricals', kind: 'customer', state: '33 - Tamil Nadu', city: 'Erode', phone: '9800000009', balance: 1700, active: false },
  { id: 'c10', name: 'Sedhu Provision Store', kind: 'customer', state: '33 - Tamil Nadu', city: 'Chennai', phone: '9800000010', balance: 300, active: true },
  { id: 's1', name: 'Bharat Wholesale Agencies', kind: 'supplier', state: '33 - Tamil Nadu', city: 'Chennai', phone: '9811000001', gstin: '33SSSSS1001S1Z1', balance: -85000, active: true },
  { id: 's2', name: 'Rajdhani Distributors', kind: 'supplier', state: '07 - Delhi', city: 'New Delhi', phone: '9811000002', gstin: '07RRRRR2002R1Z2', balance: -42300, active: true },
  { id: 's3', name: 'Coastal Brands Pvt Ltd', kind: 'supplier', state: '32 - Kerala', city: 'Kochi', phone: '9811000003', gstin: '32CCCCC3003C1Z3', balance: -12000, active: true },
  { id: 's4', name: 'Surya Industries', kind: 'supplier', state: '24 - Gujarat', city: 'Ahmedabad', phone: '9811000004', gstin: '24SSSSS4004S1Z4', balance: -6500, active: true },
  { id: 's5', name: 'Metro Packaging Co', kind: 'supplier', state: '33 - Tamil Nadu', city: 'Coimbatore', phone: '9811000005', balance: -2750, active: true },
  { id: 'a1', name: 'Ravi (Field Agent)', kind: 'agent', state: '33 - Tamil Nadu', city: 'Chennai', phone: '9822000001', balance: 0, active: true },
  { id: 'a2', name: 'Meena (Salesman)', kind: 'agent', state: '33 - Tamil Nadu', city: 'Madurai', phone: '9822000002', balance: 0, active: true },
];

export const stateList = [
  '33 - Tamil Nadu', '32 - Kerala', '29 - Karnataka', '07 - Delhi', '24 - Gujarat',
  '27 - Maharashtra', '36 - Telangana', '37 - Andhra Pradesh', '19 - West Bengal',
];
