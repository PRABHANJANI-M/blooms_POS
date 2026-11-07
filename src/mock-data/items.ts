import type { Item } from '../types';

/** DEMO product master. Codes, prices and stock are invented for demonstration. */
export const items: Item[] = [
  { id: 'i1', code: 'GRC-001', name: 'Basmati Rice 5kg', category: 'Grocery', brand: 'Royal Harvest', unit: 'Bag', hsn: '1006', rate: 480, purchaseRate: 384, mrp: 520, gstRate: 5, stock: 64, reorderLevel: 20, barcode: '8900000000011' },
  { id: 'i2', code: 'GRC-002', name: 'Toor Dal 1kg', category: 'Grocery', brand: 'Golden Pulse', unit: 'Kg', hsn: '0713', rate: 150, purchaseRate: 120, mrp: 165, gstRate: 0, stock: 120, reorderLevel: 30, barcode: '8900000000028' },
  { id: 'i3', code: 'GRC-003', name: 'Sunflower Oil 1L', category: 'Grocery', brand: 'Sun Gold', unit: 'Ltr', hsn: '1512', rate: 135, purchaseRate: 108, mrp: 150, gstRate: 5, stock: 8, reorderLevel: 15, barcode: '8900000000035' },
  { id: 'i4', code: 'GRC-004', name: 'Sugar 1kg', category: 'Grocery', brand: 'Sweet Crest', unit: 'Kg', hsn: '1701', rate: 44, purchaseRate: 35.2, mrp: 48, gstRate: 5, stock: 210, reorderLevel: 50, barcode: '8900000000042' },
  { id: 'i5', code: 'SPC-001', name: 'Turmeric Powder 200g', category: 'Spices', brand: 'Kerala Gold', unit: 'Pkt', hsn: '0910', rate: 62, purchaseRate: 49.6, mrp: 70, gstRate: 5, stock: 45, reorderLevel: 20, barcode: '8900000000059' },
  { id: 'i6', code: 'SPC-002', name: 'Garam Masala 100g', category: 'Spices', brand: 'Kerala Gold', unit: 'Pkt', hsn: '0910', rate: 88, purchaseRate: 70.4, mrp: 99, gstRate: 5, stock: 3, reorderLevel: 10, barcode: '8900000000066' },
  { id: 'i7', code: 'HDW-001', name: 'LED Bulb 9W', category: 'Hardware', brand: 'BrightOne', unit: 'Nos', hsn: '8539', rate: 95, purchaseRate: 76, mrp: 120, gstRate: 18, stock: 90, reorderLevel: 25, barcode: '8900000000073' },
  { id: 'i8', code: 'HDW-002', name: 'Extension Cord 5m', category: 'Hardware', brand: 'VoltSafe', unit: 'Nos', hsn: '8544', rate: 260, purchaseRate: 208, mrp: 320, gstRate: 18, stock: 17, reorderLevel: 10, barcode: '8900000000080' },
  { id: 'i9', code: 'HDW-003', name: 'Copper Wire 1.5mm 90m', category: 'Hardware', brand: 'VoltSafe', unit: 'Roll', hsn: '7413', rate: 1450, purchaseRate: 1160, mrp: 1650, gstRate: 18, stock: 6, reorderLevel: 5, barcode: '8900000000097' },
  { id: 'i10', code: 'GFT-001', name: 'Brass Diya Set', category: 'Gifts', brand: 'Festiva', unit: 'Set', hsn: '7418', rate: 340, purchaseRate: 272, mrp: 399, gstRate: 12, stock: 32, reorderLevel: 8, barcode: '8900000000103' },
  { id: 'i11', code: 'GFT-002', name: 'Gift Wrap Roll', category: 'Gifts', brand: 'Festiva', unit: 'Roll', hsn: '4819', rate: 55, purchaseRate: 44, mrp: 65, gstRate: 12, stock: 74, reorderLevel: 20, barcode: '8900000000110' },
  { id: 'i12', code: 'TXT-001', name: 'Cotton Towel', category: 'Textiles', brand: 'SoftLoom', unit: 'Nos', hsn: '6302', rate: 185, purchaseRate: 148, mrp: 225, gstRate: 5, stock: 58, reorderLevel: 15, barcode: '8900000000127' },
  { id: 'i13', code: 'TXT-002', name: 'Cotton Bedsheet Double', category: 'Textiles', brand: 'SoftLoom', unit: 'Nos', hsn: '6302', rate: 640, purchaseRate: 512, mrp: 799, gstRate: 12, stock: 22, reorderLevel: 6, barcode: '8900000000134' },
  { id: 'i14', code: 'BKY-001', name: 'Whole Wheat Bread', category: 'Bakery', brand: 'Daily Fresh', unit: 'Nos', hsn: '1905', rate: 45, purchaseRate: 36, mrp: 50, gstRate: 0, stock: 25, reorderLevel: 12, barcode: '8900000000141' },
  { id: 'i15', code: 'BEV-001', name: 'Mango Juice 1L', category: 'Beverages', brand: 'Fruit Bliss', unit: 'Ltr', hsn: '2009', rate: 92, purchaseRate: 73.6, mrp: 110, gstRate: 12, stock: 40, reorderLevel: 12, barcode: '8900000000158' },
  { id: 'i16', code: 'BEV-002', name: 'Green Tea 100g', category: 'Beverages', brand: 'Hill Leaf', unit: 'Pkt', hsn: '0902', rate: 210, purchaseRate: 168, mrp: 245, gstRate: 5, stock: 11, reorderLevel: 10, barcode: '8900000000165' },
  { id: 'i17', code: 'STN-001', name: 'Ball Pen Blue (Pack 10)', category: 'Stationery', brand: 'WriteWell', unit: 'Pack', hsn: '9608', rate: 60, purchaseRate: 48, mrp: 70, gstRate: 18, stock: 150, reorderLevel: 30, barcode: '8900000000172' },
  { id: 'i18', code: 'STN-002', name: 'A4 Copier Paper 500 Sheets', category: 'Stationery', brand: 'PaperPro', unit: 'Ream', hsn: '4802', rate: 230, purchaseRate: 184, mrp: 260, gstRate: 12, stock: 36, reorderLevel: 10, barcode: '8900000000189' },
  { id: 'i19', code: 'PKG-001', name: 'Carry Bag Medium', category: 'Packaging', brand: 'EcoPack', unit: 'Pkt', hsn: '3923', rate: 120, purchaseRate: 96, mrp: 140, gstRate: 18, stock: 4, reorderLevel: 8, barcode: '8900000000196' },
  { id: 'i20', code: 'PKG-002', name: 'Corrugated Box Small', category: 'Packaging', brand: 'EcoPack', unit: 'Nos', hsn: '4819', rate: 18, purchaseRate: 14.4, mrp: 22, gstRate: 18, stock: 300, reorderLevel: 100, barcode: '8900000000202' },
];

export const categories = ['Grocery', 'Spices', 'Hardware', 'Gifts', 'Textiles', 'Bakery', 'Beverages', 'Stationery', 'Packaging'];
export const brands = ['Royal Harvest', 'Golden Pulse', 'Sun Gold', 'Sweet Crest', 'Kerala Gold', 'BrightOne', 'VoltSafe', 'Festiva', 'SoftLoom', 'Daily Fresh', 'Fruit Bliss', 'Hill Leaf', 'WriteWell', 'PaperPro', 'EcoPack'];
export const units = ['Nos', 'Kg', 'Gram', 'Ltr', 'Bag', 'Pkt', 'Set', 'Roll', 'Pack', 'Ream'];
