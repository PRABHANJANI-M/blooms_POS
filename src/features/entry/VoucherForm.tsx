import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Save, Printer, MessageCircle, FileSpreadsheet, Trash2, XCircle, FilePlus, Settings2, Quote, ClipboardList, Lock, Link2, RefreshCw, ShoppingCart, Truck, Sparkles, Tag } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Field, SelectInput, TextInput } from '../../components/ui/Field';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { Panel } from '../../components/ui/Panel';
import { DemoNotice } from '../../components/ui/DemoNotice';
import { ItemGrid, blankLines, newLineId } from '../billing/ItemGrid';
import { InvoicePreview } from '../billing/InvoicePreview';
import { useHotkeys } from '../../hooks/useHotkeys';
import { useAppStore } from '../../store/appStore';
import { NO_ROWS, useDemoStore } from '../../store/demoStore';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../services/api';
import { stateList } from '../../mock-data/parties';
import { recentSalesBills, voucherHistory } from '../../mock-data/entry';
import { computeTotals, computeLine } from '../../utils/billing';
import { formatINR, formatMoneyPlain, parseNum, round2 } from '../../utils/money';
import { todayISO, addDays, toDisplayDate, financialYearLabel } from '../../utils/date';
import { cn } from '../../utils/cn';
import { actionLabels, type VoucherKindConfig, type ActionId } from './voucherConfig';
import { parseCodeQtyCsv } from '../../utils/csv';
import type { BillLine, Sundry, VoucherRow, Party } from '../../types';

const COMPANY_STATE = '33 - Tamil Nadu';
const sundryOptions = [
  { label: 'None', pct: 0 },
  { label: 'Freight', pct: 2 },
  { label: 'Packing', pct: 1 },
  { label: 'Other charges', pct: 5 },
];

interface Header {
  series: string; no: number; date: string; type: 'Cash' | 'Credit';
  partyName: string; state: string; gstin: string; address1: string; address2: string; address3: string;
  cell: string; through: string; priceMode: 'rate' | 'mrp' | 'wholesale'; validDays: number; narration: string;
  creditDays: number; cashDiscountDays: number; cashDiscountPct: number;
}

export interface QuotationTransfer {
  date: string;
  type: Header['type'];
  partyName: string;
  state: string;
  gstin: string;
  address1: string;
  address2: string;
  address3: string;
  cell: string;
  through: string;
  priceMode: Header['priceMode'];
  creditDays: number;
  cashDiscountDays: number;
  cashDiscountPct: number;
  lines: BillLine[];
}

/** Next number is one more than the highest number already in the register (demo register). */
const nextNumberFor = (kind: string): number => {
  const rows = kind === 'sales' ? recentSalesBills.map((r) => ({ no: String(r.no) })) : (voucherHistory[kind] ?? []);
  const nums = rows.map((r) => parseInt(String(r.no).replace(/\D/g, ''), 10)).filter((n) => !Number.isNaN(n));
  return (nums.length ? Math.max(...nums) : 0) + 1;
};

const freshHeader = (cfg: VoucherKindConfig, no: number): Header => ({
  series: cfg.kind === 'sales' ? 'SALES' : cfg.kind === 'quotation' ? 'QUOTATION' : cfg.kind === 'sales-order' ? 'Sales Order' : cfg.kind === 'purchase-order' ? 'Purchase Order' : cfg.kind === 'delivery-challan' ? 'Delivery Challan' : 'Default', no, date: todayISO(), type: 'Cash',
  partyName: '', state: COMPANY_STATE, gstin: '', address1: '', address2: '', address3: '', cell: '',
  through: '', priceMode: cfg.priceMode, validDays: 30, narration: '',
  creditDays: 0, cashDiscountDays: 0, cashDiscountPct: 0,
});

/**
 * One billing form for every voucher type in the Entry menu. Layout follows the reference video:
 * header block (series, number, date, cash/credit, party, state, GSTIN), item grid, totals panel
 * and a footer toolbar (Delete, Cancel, Print, WhatsApp, Excel Import, action buttons, New, Options, Save).
 */
export function VoucherForm({ cfg }: { cfg: VoucherKindConfig }) {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useAppStore((s) => s.toast);
  const addVoucher = useDemoStore((s) => s.addVoucher);
  const itemPriceUpdates = useDemoStore((s) => s.itemPriceUpdates);
  const updateItemPrices = useDemoStore((s) => s.updateItemPrices);
  const savedRows = useDemoStore((s) => s.vouchers[cfg.kind] ?? NO_ROWS);
  const savedCount = savedRows.length;
  const savedSalesBills = useDemoStore((s) => s.vouchers.sales ?? NO_ROWS);
  const { data: items } = useAsync(() => api.getItems(), []);
  const catalogItems = useMemo(
    () => (items ?? []).map((item) => ({ ...item, ...itemPriceUpdates[item.id] })),
    [items, itemPriceUpdates],
  );
  const { data: parties } = useAsync(() => api.getParties(cfg.partyKind), [cfg.partyKind]);
  const { data: agents } = useAsync(() => api.getParties('agent'), []);

  const [header, setHeader] = useState<Header>(() => freshHeader(cfg, nextNumberFor(cfg.kind) + savedCount));
  const [lines, setLines] = useState<BillLine[]>(() => blankLines(1));
  const [sundryIdx, setSundryIdx] = useState(0);
  const [customSundryPct, setCustomSundryPct] = useState('');
  const [customSundryAmount, setCustomSundryAmount] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<null | 'delete' | 'cancel'>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [againstBillNo, setAgainstBillNo] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState(todayISO());
  const [updateItemMasterPrices, setUpdateItemMasterPrices] = useState(true);
  const [stickerPreview, setStickerPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isSalesReturn = cfg.kind === 'sales-return';
  const isQuotation = cfg.kind === 'quotation';
  const isSalesOrder = cfg.kind === 'sales-order';
  const isPurchaseOrder = cfg.kind === 'purchase-order';
  const isPurchaseReturn = cfg.kind === 'purchase-return';
  const isDeliveryChallan = cfg.kind === 'delivery-challan';
  const isPurchaseBill = cfg.kind === 'purchase-bill';
  const isPurchaseGrid = isPurchaseBill || isPurchaseOrder;
  const isOrderLayout = isSalesOrder || isQuotation || isSalesReturn || isDeliveryChallan;
  const interState = header.state !== COMPANY_STATE;
  const sundryPct = cfg.showSundry
    ? Math.min(100, customSundryPct === '' ? sundryOptions[sundryIdx].pct : Math.max(0, parseNum(customSundryPct)))
    : 0;
  const discountPct = cfg.kind === 'sales' ? header.cashDiscountPct : 0;
  const baseTotals = useMemo(() => computeTotals(lines, null, interState), [lines, interState]);
  const sundryBase = baseTotals.taxable + baseTotals.cgst + baseTotals.sgst + baseTotals.igst;
  const sundryAmount = customSundryAmount === ''
    ? round2((sundryBase * sundryPct) / 100)
    : Math.max(0, parseNum(customSundryAmount));
  const sundry: Sundry | null = sundryIdx > 0 || customSundryPct !== '' || customSundryAmount !== ''
    ? {
      label: sundryOptions[sundryIdx].label === 'None' ? 'Other charges' : sundryOptions[sundryIdx].label,
      pct: sundryPct,
      amount: sundryAmount,
      amountMode: customSundryAmount === '' ? 'percent' : 'fixed',
      percentageBase: 'afterTax',
    }
    : null;
  const totals = useMemo(() => computeTotals(lines, sundry, interState), [lines, sundry, interState]);
  const cashDiscountAmount = useMemo(() => round2((totals.taxable * discountPct) / 100), [totals.taxable, discountPct]);
  const prefix = cfg.prefix;
  const billNo = `${prefix}-${header.no}`;
  const previousBill = cfg.kind === 'sales'
    ? recentSalesBills.filter((bill) => bill.no < header.no).sort((a, b) => b.no - a.no)[0]
    : isPurchaseBill
      ? [...(voucherHistory['purchase-bill'] ?? []), ...savedRows]
        .filter((bill) => Number(bill.no.replace(/\D/g, '')) < header.no)
        .sort((a, b) => Number(b.no.replace(/\D/g, '')) - Number(a.no.replace(/\D/g, '')))[0]
    : isPurchaseOrder
      ? [...(voucherHistory['purchase-order'] ?? []), ...savedRows]
        .filter((order) => Number(order.no.replace(/\D/g, '')) < header.no)
        .sort((a, b) => Number(b.no.replace(/\D/g, '')) - Number(a.no.replace(/\D/g, '')))[0]
    : isSalesOrder
      ? [...(voucherHistory['sales-order'] ?? []), ...savedRows]
        .filter((order) => Number(order.no.replace(/\D/g, '')) < header.no)
        .sort((a, b) => Number(b.no.replace(/\D/g, '')) - Number(a.no.replace(/\D/g, '')))[0]
      : isDeliveryChallan
        ? [...(voucherHistory['delivery-challan'] ?? []), ...savedRows]
          .filter((challan) => Number(challan.no.replace(/\D/g, '')) < header.no)
          .sort((a, b) => Number(b.no.replace(/\D/g, '')) - Number(a.no.replace(/\D/g, '')))[0]
      : undefined;

  const setH = <K extends keyof Header>(k: K, v: Header[K]) => setHeader((h) => ({ ...h, [k]: v }));
  const printStickers = () => {
    document.body.classList.add('print-selected-bill');
    window.addEventListener('afterprint', () => document.body.classList.remove('print-selected-bill'), { once: true });
    window.print();
    window.setTimeout(() => document.body.classList.remove('print-selected-bill'), 1500);
  };

  useEffect(() => {
    const transfer = (location.state as { quotation?: QuotationTransfer } | null)?.quotation;
    if (cfg.kind !== 'sales' || !transfer) return;

    setHeader((current) => ({
      ...current,
      date: transfer.date,
      type: transfer.type,
      partyName: transfer.partyName,
      state: transfer.state,
      gstin: transfer.gstin,
      address1: transfer.address1,
      address2: transfer.address2,
      address3: transfer.address3,
      cell: transfer.cell,
      through: transfer.through,
      priceMode: transfer.priceMode,
      creditDays: transfer.creditDays,
      cashDiscountDays: transfer.cashDiscountDays,
      cashDiscountPct: transfer.cashDiscountPct,
    }));
    setLines([...transfer.lines.map((line) => ({ ...line, uid: newLineId() })), blankLines(1)[0]]);
    navigate(location.pathname, { replace: true, state: null });
    toast({ tone: 'success', title: 'Quotation loaded into Sales Bill', message: 'Review the customer and items, then save the bill.' });
  }, [cfg.kind, location.key, location.pathname, location.state, navigate, toast]);

  const pickParty = (name: string) => {
    setH('partyName', name);
    const p = parties?.find((x: Party) => x.name === name);
    if (p) setHeader((h) => ({ ...h, partyName: name, state: p.state, gstin: p.gstin ?? '', address1: p.address1 ?? p.city ?? '', address2: p.address2 ?? '', address3: p.city ?? '', cell: p.phone ?? '' }));
  };

  const resetForm = (keepDate = true) => {
    const next = nextNumberFor(cfg.kind) + savedCount + 1;
    setHeader((h) => ({ ...freshHeader(cfg, next), date: keepDate ? h.date : todayISO() }));
    setLines(blankLines(1));
    setErrors([]);
    setSundryIdx(0);
    setCustomSundryPct('');
    setCustomSundryAmount('');
    setAgainstBillNo('');
    setReturnReason('');
    setSupplierInvoiceNo('');
    setSupplierInvoiceDate(todayISO());
    setStickerPreview(false);
  };

  const validate = (): string[] => {
    const errs: string[] = [];
    if (isPurchaseBill && !header.partyName.trim()) errs.push('Select a supplier for this purchase bill.');
    if (cfg.partyLabel && header.type === 'Credit' && !header.partyName.trim()) errs.push(`Select a ${cfg.partyLabel.toLowerCase()} for a credit ${cfg.title.toLowerCase()}.`);
    const active = lines.filter((l) => l.name);
    if (!active.length) errs.push('Add at least one item.');
    if (active.some((l) => !(l.qty > 0))) errs.push('Every item needs a quantity greater than zero.');
    if (!cfg.stockOnly && active.some((l) => !(l.rate > 0))) errs.push('Every item needs a rate greater than zero.');
    return errs;
  };

  const save = () => {
    const errs = validate();
    setErrors(errs);
    if (errs.length) {
      toast({ tone: 'error', title: 'Could not save', message: errs[0] });
      return;
    }
    const partyName = header.partyName.trim() || (cfg.partyLabel ? 'CASH CUSTOMER' : cfg.title);
    if (isPurchaseBill && updateItemMasterPrices) {
      const updates = Object.fromEntries(
        lines.filter((line) => line.name && line.itemId).map((line) => {
          const currentItem = catalogItems.find((item) => item.id === line.itemId);
          return [line.itemId!, {
            purchaseRate: line.rate,
            mrp: line.mrp,
            rate: line.salesRate ?? currentItem?.rate ?? line.rate,
          }];
        }),
      );
      updateItemPrices(updates);
    }
    addVoucher(cfg.kind, {
      id: `${cfg.kind}-${Date.now()}`, no: billNo, date: header.date, party: partyName,
      amount: cfg.stockOnly ? 0 : totals.netAmount, status: isSalesOrder || isPurchaseOrder ? 'Pending' : header.type === 'Credit' ? 'Credit' : 'Saved (demo)',
      ...(cfg.kind === 'sales' || isSalesReturn || isQuotation || isSalesOrder || isPurchaseOrder || isPurchaseReturn || isDeliveryChallan || isPurchaseBill ? { lines: lines.filter((line) => line.name) } : {}),
        ...(isPurchaseBill ? {
        extra: [
          supplierInvoiceNo.trim() && `Supplier invoice: ${supplierInvoiceNo.trim()}`,
          `Supplier invoice date: ${supplierInvoiceDate}`,
          header.through && `Through: ${header.through}`,
          header.creditDays > 0 && `Credit days: ${header.creditDays}`,
          header.cashDiscountDays > 0 && `CD days: ${header.cashDiscountDays}`,
          header.cashDiscountPct > 0 && `CD: ${header.cashDiscountPct}%`,
          updateItemMasterPrices && 'Item master rates updated for this session',
        ].filter(Boolean).join(' · '),
      } : {}),
      ...(isSalesOrder || isPurchaseOrder || isDeliveryChallan ? {
        extra: [
          header.through && `Through: ${header.through}`,
          (isSalesOrder || isPurchaseOrder) && `Valid days: ${header.validDays}`,
          header.creditDays > 0 && `Credit days: ${header.creditDays}`,
          header.cashDiscountDays > 0 && `CD days: ${header.cashDiscountDays}`,
          header.cashDiscountPct > 0 && `CD: ${header.cashDiscountPct}%`,
          sundryAmount > 0 && `Bill sundry: ${sundry?.label ?? 'Other charges'} ${formatMoneyPlain(sundryAmount)}`,
        ].filter(Boolean).join(' · '),
      } : {}),
      ...(isSalesReturn ? {
        extra: [
          againstBillNo.trim() && `Against bill ${againstBillNo.trim()}`,
          returnReason.trim() && `Reason: ${returnReason.trim()}`,
          header.through && `Through: ${header.through}`,
          header.creditDays > 0 && `Credit days: ${header.creditDays}`,
          header.cashDiscountDays > 0 && `CD days: ${header.cashDiscountDays}`,
          header.cashDiscountPct > 0 && `CD: ${header.cashDiscountPct}%`,
        ].filter(Boolean).join(' · '),
      } : {}),
      ...(isQuotation ? {
        extra: [
          header.through && `Through: ${header.through}`,
          header.creditDays > 0 && `Credit days: ${header.creditDays}`,
          header.cashDiscountDays > 0 && `CD days: ${header.cashDiscountDays}`,
          header.cashDiscountPct > 0 && `CD: ${header.cashDiscountPct}%`,
        ].filter(Boolean).join(' · '),
      } : {}),
      ...(isPurchaseReturn ? {
        extra: sundryAmount > 0 ? `Bill sundry: ${sundry?.label ?? 'Other charges'} ${formatMoneyPlain(sundryAmount)}` : '',
      } : {}),
    } as VoucherRow);
    toast({
      tone: 'success',
      title: `${cfg.title} ${billNo} saved`,
      message: isPurchaseBill && updateItemMasterPrices
        ? 'Saved for this browser session. Matching item purchase rates and MRP are updated for this session; no database is connected.'
        : 'Saved for this browser session only. No database is connected.',
    });
    resetForm(true);
  };

  const makeBill = () => {
    const errs = validate();
    setErrors(errs);
    if (errs.length) {
      toast({ tone: 'error', title: 'Could not make bill', message: errs[0] });
      return;
    }

    const partyName = header.partyName.trim() || 'CASH CUSTOMER';
    addVoucher('quotation', {
      id: `quotation-${Date.now()}`,
      no: billNo,
      date: header.date,
      party: partyName,
      amount: totals.netAmount,
      status: header.type,
      lines: lines.filter((line) => line.name),
    });
    const transfer: QuotationTransfer = {
      date: header.date,
      type: header.type,
      partyName,
      state: header.state,
      gstin: header.gstin,
      address1: header.address1,
      address2: header.address2,
      address3: header.address3,
      cell: header.cell,
      through: header.through,
      priceMode: header.priceMode,
      creditDays: header.creditDays,
      cashDiscountDays: header.cashDiscountDays,
      cashDiscountPct: header.cashDiscountPct,
      lines: lines.filter((line) => line.name),
    };
    navigate('/entry/sales/create', { state: { quotation: transfer } });
    toast({ tone: 'success', title: `Quotation ${billNo} saved`, message: 'Its customer and items are ready in a new Sales Bill.' });
  };

  const loadAgainstBill = () => {
    const enteredNo = againstBillNo.trim();
    const normalizedNo = enteredNo.replace(/\D/g, '');
    if (!normalizedNo) {
      toast({ tone: 'warning', title: 'Enter a sales bill number to load' });
      return;
    }

    const savedBill = savedSalesBills.find((bill) => bill.no.replace(/\D/g, '') === normalizedNo);
    if (savedBill) {
      pickParty(savedBill.party);
      setH('type', savedBill.status === 'Credit' ? 'Credit' : 'Cash');
      setLines(savedBill.lines?.length
        ? [...savedBill.lines.map((line) => ({ ...line, uid: newLineId() })), blankLines(1)[0]]
        : blankLines(1));
      toast({
        tone: savedBill.lines?.length ? 'success' : 'warning',
        title: savedBill.lines?.length ? `Sales bill ${savedBill.no} loaded` : `Sales bill ${savedBill.no} matched`,
        message: savedBill.lines?.length ? 'Customer and bill items are ready to return.' : 'This saved bill has no item details. Add the returned items manually.',
      });
      return;
    }

    const sampleBill = recentSalesBills.find((bill) => String(bill.no) === normalizedNo);
    if (!sampleBill) {
      toast({ tone: 'error', title: 'Sales bill not found', message: 'Enter a bill number from this demo session or a sample sales register entry.' });
      return;
    }

    pickParty(sampleBill.party);
    setH('type', sampleBill.type);
    setLines(blankLines(1));
    toast({
      tone: 'warning',
      title: `Sample bill ${sampleBill.no} matched`,
      message: 'The sample register has no item-level details. Add the returned items manually.',
    });
  };

  const runAction = (a: ActionId) => {
    const messages: Record<ActionId, string> = {
      quote: `A quotation copy was prepared from this ${cfg.label} (demo, not stored).`,
      order: `An order copy was prepared from this ${cfg.label} (demo, not stored).`,
      'delivery-challan': 'A delivery challan copy was prepared from this sales bill (demo, not stored).',
      purchase: 'A purchase entry was opened for this sale (demo only).',
      'close-order': `${cfg.title} marked as closed (demo, not stored).`,
      'from-orders': 'Pick pending sales orders in the pending report to load them here (demo).',
      'auto-order': 'Auto order would reorder items below reorder level. Demo only, nothing was ordered.',
      extend: 'Validity extended by 30 days (demo, not stored).',
    };
    if (a === 'extend' && (isSalesOrder || isPurchaseOrder)) {
      setH('validDays', header.validDays + 30);
      toast({ tone: 'success', title: 'Order validity extended', message: `Validity is now ${header.validDays + 30} days.` });
      return;
    }
    if (a === 'auto-order' && isPurchaseOrder) {
      const suggestions = catalogItems
        .filter((item) => item.reorderLevel > 0 && item.stock <= item.reorderLevel)
        .map((item) => computeLine({
          ...blankLines(1)[0],
          uid: newLineId(),
          itemId: item.id,
          code: item.code,
          name: item.name,
          unit: item.unit,
          mrp: item.mrp,
          rate: item.purchaseRate ?? item.rate,
          salesRate: item.rate,
          gstRate: item.gstRate,
          qty: Math.max(item.reorderLevel - item.stock, 1),
          detail: item.brand,
          batchNo: `B${item.code.slice(-3)}`,
        }));
      const currentLines = lines.filter((line) => line.name);
      const newSuggestions = suggestions.filter((suggestion) => !currentLines.some((line) => line.itemId === suggestion.itemId));
      if (!newSuggestions.length) {
        const allAlreadyAdded = suggestions.length > 0;
        toast({
          tone: 'info',
          title: allAlreadyAdded ? 'Reorder items already added' : 'No items to reorder',
          message: allAlreadyAdded ? 'Review or adjust the existing item quantities on this order.' : 'No items are at or below their reorder level.',
        });
        return;
      }
      setLines([...currentLines, ...newSuggestions, blankLines(1)[0]]);
      toast({ tone: 'success', title: `${newSuggestions.length} reorder item(s) added`, message: 'Review the quantities and supplier before saving the purchase order.' });
      return;
    }
    if (a === 'from-orders' && isPurchaseOrder) {
      navigate('/entry/sales-order/pending');
      toast({ tone: 'info', title: 'Sales orders opened', message: 'Review pending sales orders before preparing a purchase order.' });
      return;
    }
    if (a === 'purchase') {
      navigate('/entry/purchase-bill/create');
      toast({ tone: 'info', title: 'Purchase entry opened', message: messages[a] });
      return;
    }
    toast({ tone: 'info', title: actionLabels[a], message: messages[a] });
  };

  const importCsv = async (file: File) => {
    const { matches, skipped } = parseCodeQtyCsv(await file.text(), catalogItems);
    if (!matches.length) return toast({ tone: 'warning', title: 'No matching items', message: 'The CSV needs "item code, quantity" per line.' });
    const found: BillLine[] = matches.map(({ item, qty }) => computeLine({
      ...blankLines(1)[0], uid: newLineId(), name: item.name, code: item.code, unit: item.unit, mrp: item.mrp,
      rate: isPurchaseGrid ? item.purchaseRate ?? item.rate : cfg.priceMode === 'mrp' ? item.mrp : item.rate,
      gstRate: item.gstRate, qty, detail: item.brand,
    }));
    setLines((prev) => [...prev.filter((l) => l.name), ...found, blankLines(1)[0]]);
    toast({ tone: 'success', title: `${found.length} line(s) imported`, message: skipped ? `${skipped} row(s) skipped (unknown code or quantity).` : 'Imported from CSV.' });
  };

  useHotkeys({
    F2: () => resetForm(true),
    F7: () => setH('priceMode', header.priceMode === 'rate' ? 'mrp' : header.priceMode === 'mrp' ? 'wholesale' : 'rate'),
    F8: () => resetForm(true),
    'Alt+S': save,
    ...(isSalesOrder || isPurchaseOrder || isDeliveryChallan || isPurchaseBill ? {
      PageUp: () => setH('no', Math.max(1, header.no - 1)),
      PageDown: () => setH('no', header.no + 1),
      Escape: () => navigate('/'),
    } : {}),
  });

  const shortcuts = isQuotation
    ? 'PgUp / PgDn = previous / next quotation · F2 = new · Alt+S = save · Ctrl+Del = remove row · Esc = close'
    : isSalesOrder || isPurchaseOrder || isDeliveryChallan
    ? `PgUp / PgDn = previous / next ${isPurchaseOrder ? 'purchase order' : isSalesOrder ? 'order' : 'challan'} · F2 = new · Alt+S = save · Ctrl+Del = remove row · Esc = close`
    : isSalesReturn
    ? 'Enter = next · Space = item list · F2 = new · F7 = price list · Alt+S = save · Ctrl+Del = remove row'
    : isPurchaseBill
    ? 'PgUp / PgDn = previous / next purchase · F2 = new · Alt+S = save · Ctrl+Del = remove row · Esc = close'
    : 'Enter = next · Space = item list · F2 / F8 = new · F7 = price list · Alt+S = save · Ctrl+Del = remove row · Esc = dashboard';
  const numberNav = (delta: number) => setH('no', Math.max(1, header.no + delta));
  const requiresParty = Boolean(cfg.partyLabel);

  return (
    <>
      <PageHeader
        variant="bill"
        title={cfg.title}
        shortcuts={shortcuts}
        actions={
          <div className="flex items-center gap-2">
            {!isSalesReturn && !isQuotation && !isDeliveryChallan && <span className="badge badge-steel">New {billNo}</span>}
            <Button size="sm" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" icon={<FilePlus className="h-3.5 w-3.5" />} onClick={() => resetForm(true)}>{isSalesReturn || isQuotation || isSalesOrder || isDeliveryChallan || isPurchaseBill || isPurchaseOrder ? 'F2' : 'F8'}</Button>
          </div>
        }
      />

      <div className={cn('entry-create-form mt-3 space-y-3', cfg.kind === 'sales' && 'sales-create-form', isQuotation && 'quotation-create-form', isSalesOrder && 'sales-order-create-form', isDeliveryChallan && 'delivery-challan-create-form', isPurchaseBill && 'purchase-bill-create-form', isPurchaseOrder && 'purchase-order-create-form')}>
      <DemoNotice>{isSalesReturn ? 'Sales Return entries, linked bills, and item details stay in this browser session only. No stock or accounts are changed.' : isQuotation ? 'Quotations stay in this browser session. Making a bill saves the quotation and opens a Sales Bill with its customer and items.' : isSalesOrder ? 'Sales orders and item details stay in this browser session. Saving does not reserve stock or post to accounts.' : isPurchaseOrder ? 'Purchase orders and item details stay in this browser session. Saving does not reserve stock or post to accounts.' : isDeliveryChallan ? 'Delivery challans and item details stay in this browser session. Saving does not update stock or post to accounts.' : isPurchaseBill ? 'Purchase bills and item-master price updates stay in this browser session. No inventory or accounts are posted.' : 'Saving keeps this bill in the session only. Nothing is posted to accounts or sent to a customer.'}</DemoNotice>

        {errors.length > 0 && (
          <div role="alert" className="rounded-lg border border-fiery/40 bg-red-50 p-3 text-sm text-fiery">
            <p className="font-bold">Please fix the following:</p>
            <ul className="ml-5 list-disc">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        )}

        <Panel className={cn('entry-header-panel', cfg.kind === 'sales' && 'sales-header-panel border-steel-200', (isSalesOrder || isDeliveryChallan || isPurchaseBill || isPurchaseOrder) && 'sales-header-panel', (isSalesReturn || isQuotation || isSalesOrder || isDeliveryChallan || isPurchaseOrder) && 'border-blue-200 bg-blue-50/40')} bodyClassName="p-3 sm:p-4">
          <div className={cn('grid gap-3 md:grid-cols-2 xl:grid-cols-4', cfg.kind === 'sales' && 'xl:grid-cols-12', (isOrderLayout || isPurchaseBill || isPurchaseOrder) && 'lg:grid-cols-12 xl:grid-cols-12 lg:gap-x-4 lg:gap-y-2')}>
            <Field label="Series" htmlFor="series" className={cn(cfg.kind === 'sales' && 'xl:col-span-2', (isSalesReturn || isQuotation || isSalesOrder) && 'lg:col-span-3 lg:col-start-1 lg:row-start-1', isPurchaseBill && 'lg:col-span-4 lg:col-start-1 lg:row-start-1', isPurchaseOrder && 'lg:col-span-3 lg:col-start-1 lg:row-start-1')}>
              <SelectInput id="series" compact value={header.series} onChange={(e) => setH('series', e.target.value)}>
                {cfg.kind === 'sales' && <option>SALES</option>}
                {isQuotation && <option>QUOTATION</option>}
                {isSalesOrder && <option>Sales Order</option>}
                {isDeliveryChallan && <option>Delivery Challan</option>}
                {isPurchaseBill && <option>Purchase</option>}
                {isPurchaseOrder && <option>Purchase Order</option>}
                <option>Default</option><option>Main series</option><option>Online</option>
              </SelectInput>
            </Field>
            <Field label={isQuotation ? 'Quote No' : isSalesOrder || isPurchaseOrder ? 'Order No' : isDeliveryChallan ? 'DC No' : `${cfg.title} No`} className={cn(cfg.kind === 'sales' && 'xl:col-span-3', (isSalesReturn || isQuotation || isSalesOrder || isDeliveryChallan) && 'lg:col-span-3 lg:col-start-1 lg:row-start-2', isPurchaseBill && 'lg:col-span-4 lg:col-start-1 lg:row-start-2', isPurchaseOrder && 'lg:col-span-3 lg:col-start-1 lg:row-start-2')}>
              <div className="flex items-center gap-1">
                <button type="button" className="btn btn-outline btn-sm btn-icon" onClick={() => numberNav(-1)} aria-label="Previous number">‹</button>
                <TextInput compact numeric type="number" min={1} value={header.no} onChange={(e) => setH('no', Math.max(1, Math.floor(parseNum(e.target.value))))} aria-label="Voucher number" />
                <button type="button" className="btn btn-outline btn-sm btn-icon" onClick={() => numberNav(1)} aria-label="Next number">›</button>
                <span className="whitespace-nowrap text-xs text-slate-500">FY {financialYearLabel(header.date)}</span>
              </div>
            </Field>
            <Field label="Date" htmlFor="date" className={cn(cfg.kind === 'sales' && 'xl:col-span-3', (isSalesReturn || isQuotation) && 'lg:col-span-3 lg:col-start-1 lg:row-start-3', (isSalesOrder || isPurchaseOrder) && 'lg:col-span-3 lg:col-start-1 lg:row-start-3', isPurchaseBill && 'lg:col-span-4 lg:col-start-1 lg:row-start-3')}>
              <TextInput id="date" type="date" compact value={header.date} onChange={(e) => setH('date', e.target.value)} />
              {!isSalesReturn && !isQuotation && !isSalesOrder && !isDeliveryChallan && !isPurchaseBill && <p className="hint-text">{toDisplayDate(header.date)}</p>}
            </Field>
            {isSalesOrder && (
              <Field label="Valid days" hint={`Till ${toDisplayDate(addDays(header.date, header.validDays))}`} className="lg:col-span-3 lg:col-start-1 lg:row-start-4">
                <TextInput compact type="number" min={1} numeric value={header.validDays} onChange={(e) => setH('validDays', Math.max(1, parseNum(e.target.value)))} />
              </Field>
            )}
            <Field label="Type" className={cn(cfg.kind === 'sales' && 'xl:col-span-4', (isSalesReturn || isQuotation || isDeliveryChallan) && 'lg:col-span-3 lg:col-start-1 lg:row-start-4', isPurchaseBill && 'lg:col-span-4 lg:col-start-1 lg:row-start-4', (isSalesOrder || isPurchaseOrder) && 'lg:col-span-3 lg:col-start-1 lg:row-start-5')}>
              <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-cream-200" role="group" aria-label="Payment type">
                {(['Cash', 'Credit'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    disabled={t === 'Credit' && !cfg.creditAllowed}
                    onClick={() => setH('type', t)}
                    className={cn('h-9 text-sm font-semibold transition disabled:opacity-40',
                      header.type === t ? (t === 'Cash' ? 'bg-navy text-white' : 'bg-fiery text-white') : 'bg-white text-navy hover:bg-steel-100')}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>

            {cfg.partyLabel && (
              <Field label={isOrderLayout || isPurchaseOrder ? 'Name' : isPurchaseBill ? 'Name' : `${cfg.partyLabel} name`} className={cn('md:col-span-2', cfg.kind === 'sales' && 'xl:col-span-6', (isSalesReturn || isQuotation || isSalesOrder) && 'lg:col-span-4 lg:col-start-9 lg:row-start-1', isPurchaseBill && 'lg:col-span-4 lg:col-start-9 lg:row-start-1', isPurchaseOrder && 'lg:col-span-4 lg:col-start-9 lg:row-start-1')} error={requiresParty && header.type === 'Credit' && !header.partyName ? 'Required for credit' : undefined} hint={isSalesOrder && header.type === 'Cash' && !header.partyName ? 'Cash customer' : undefined} htmlFor="party">
                <TextInput id="party" compact={cfg.kind === 'sales' || isOrderLayout || isPurchaseBill || isPurchaseOrder} list={`party-${cfg.kind}`} value={header.partyName} placeholder={isPurchaseBill || isPurchaseOrder ? 'SEARCH SUPPLIER (SUNDRY CREDITORS)' : isOrderLayout ? 'Cash customer name, or search party (credit)' : `Search ${cfg.partyLabel.toLowerCase()} name`} onChange={(e) => pickParty(e.target.value)} />
                <datalist id={`party-${cfg.kind}`}>
                  {(parties ?? []).map((p: Party) => <option key={p.id} value={p.name}>{p.city}</option>)}
                </datalist>
              </Field>
            )}
            {cfg.partyLabel && (
              <Field label="State" htmlFor="state" className={cn(cfg.kind === 'sales' && 'xl:col-span-3', (isSalesReturn || isQuotation || isSalesOrder || isDeliveryChallan) && 'lg:col-span-5 lg:col-start-4 lg:row-start-1', isPurchaseBill && 'lg:col-span-4 lg:col-start-5 lg:row-start-1', isPurchaseOrder && 'lg:col-span-5 lg:col-start-4 lg:row-start-1')}>
                <div className="flex items-center gap-2">
                  <SelectInput id="state" compact value={header.state} onChange={(e) => setH('state', e.target.value)}>
                    {stateList.map((s) => <option key={s}>{s}</option>)}
                  </SelectInput>
                  {(isPurchaseBill || isPurchaseOrder) && <span className="whitespace-nowrap rounded bg-[#dff2e7] px-2 py-1 text-[10px] font-bold text-[#267146]">L/MultiTax&nbsp; CGST + SGST</span>}
                </div>
              </Field>
            )}
            {cfg.partyLabel && (
              <Field label="GSTIN" htmlFor="gstin" className={cn(cfg.kind === 'sales' && 'xl:col-span-3', (isSalesReturn || isQuotation || isSalesOrder || isDeliveryChallan) && 'lg:col-span-5 lg:col-start-4 lg:row-start-3', isPurchaseBill && 'lg:col-span-4 lg:col-start-5 lg:row-start-3', isPurchaseOrder && 'lg:col-span-5 lg:col-start-4 lg:row-start-3')} hint={interState ? 'Inter-state: IGST applies' : 'Intra-state: CGST + SGST applies'}>
                <TextInput id="gstin" compact value={header.gstin} placeholder={isPurchaseBill || isPurchaseOrder ? 'PARTY GSTIN (B2B)' : 'Party GSTIN'} onChange={(e) => setH('gstin', e.target.value.toUpperCase())} />
              </Field>
            )}
            {cfg.partyLabel && (
              <>
                {isSalesOrder || isDeliveryChallan ? (
                  <>
                    <Field label="Adr 1" className="lg:col-span-4 lg:col-start-9 lg:row-start-2">
                      <TextInput compact value={header.address1} placeholder="Door no, street" onChange={(e) => setH('address1', e.target.value)} />
                    </Field>
                    <Field label="Adr 2" className="lg:col-span-4 lg:col-start-9 lg:row-start-3">
                      <TextInput compact value={header.address2} placeholder="Area" onChange={(e) => setH('address2', e.target.value)} />
                    </Field>
                    <Field label="Adr 3" className="lg:col-span-4 lg:col-start-9 lg:row-start-4">
                      <TextInput compact value={header.address3} placeholder="City - PIN" onChange={(e) => setH('address3', e.target.value)} />
                    </Field>
                  </>
                ) : isPurchaseBill || isPurchaseOrder ? (
                  <>
                    <Field label="Adr 1" className="lg:col-span-4 lg:col-start-9 lg:row-start-2">
                      <TextInput compact value={header.address1} placeholder="DOOR NO, STREET" onChange={(e) => setH('address1', e.target.value)} aria-label="Address line 1" />
                    </Field>
                    <Field label="Adr 2" className="lg:col-span-4 lg:col-start-9 lg:row-start-3">
                      <TextInput compact value={header.address2} placeholder="AREA" onChange={(e) => setH('address2', e.target.value)} aria-label="Address line 2" />
                    </Field>
                    <Field label="Adr 3" className="lg:col-span-3 lg:col-start-9 lg:row-start-4">
                      <TextInput compact value={header.address3} placeholder="CITY - PIN" onChange={(e) => setH('address3', e.target.value)} aria-label="Address line 3" />
                    </Field>
                  </>
                ) : <Field label="Address" className={cn('md:col-span-2', !isSalesReturn && !isQuotation && 'xl:col-span-2', cfg.kind === 'sales' && 'xl:col-span-9', (isSalesReturn || isQuotation) && 'lg:col-span-4 lg:col-start-9 lg:row-start-2 lg:row-span-3')}>
                  <div className={cn('grid gap-2', isSalesReturn || isQuotation ? 'grid-cols-1' : 'sm:grid-cols-3')}>
                    <TextInput compact value={header.address1} placeholder="Door no, street" onChange={(e) => setH('address1', e.target.value)} aria-label="Address line 1" />
                    <TextInput compact value={header.address2} placeholder="Area" onChange={(e) => setH('address2', e.target.value)} aria-label="Address line 2" />
                    <TextInput compact value={header.address3} placeholder="City - PIN" onChange={(e) => setH('address3', e.target.value)} aria-label="Address line 3" />
                  </div>
                </Field>}
                <Field label="Cell" className={cn(cfg.kind === 'sales' && 'xl:col-span-3', (isSalesReturn || isQuotation || isSalesOrder || isDeliveryChallan) && 'lg:col-span-4 lg:col-start-9 lg:row-start-5', isPurchaseBill && 'lg:col-span-1 lg:col-start-12 lg:row-start-4', isPurchaseOrder && 'lg:col-span-1 lg:col-start-12 lg:row-start-4')}>
                  <TextInput compact value={header.cell} placeholder="10-digit mobile" maxLength={10} inputMode="numeric" onChange={(e) => setH('cell', e.target.value.replace(/\D/g, ''))} />
                </Field>
              </>
            )}
            {cfg.showThrough && (
              <Field label={isOrderLayout || isPurchaseOrder ? 'Through' : 'Through (agent)'} htmlFor="through" className={cn(cfg.kind === 'sales' && 'xl:col-span-4', (isSalesReturn || isQuotation || isSalesOrder || isDeliveryChallan) && 'lg:col-span-5 lg:col-start-4 lg:row-start-2', isPurchaseBill && 'lg:col-span-4 lg:col-start-5 lg:row-start-2', isPurchaseOrder && 'lg:col-span-5 lg:col-start-4 lg:row-start-2')}>
                <SelectInput id="through" compact value={header.through} onChange={(e) => setH('through', e.target.value)}>
                  <option value="">Direct</option>
                  {(agents ?? []).map((agent: Party) => <option key={agent.id} value={agent.name}>{agent.name}</option>)}
                </SelectInput>
              </Field>
            )}
            {(isPurchaseBill || isPurchaseOrder) && (
              <Field label="Cr / CD" className={cn('lg:col-span-4 lg:col-start-5 lg:row-start-4', isPurchaseOrder && 'lg:col-span-5')}>
                <div className="grid grid-cols-3 gap-2">
                  <TextInput compact numeric type="number" min={0} value={header.creditDays || ''} placeholder="Cr day" aria-label="Credit days" onChange={(e) => setH('creditDays', Math.max(0, Math.floor(parseNum(e.target.value))))} />
                  <TextInput compact numeric type="number" min={0} value={header.cashDiscountDays || ''} placeholder="CD day" aria-label="Cash discount days" onChange={(e) => setH('cashDiscountDays', Math.max(0, Math.floor(parseNum(e.target.value))))} />
                  <TextInput compact numeric type="number" min={0} max={100} step="0.01" value={header.cashDiscountPct || ''} placeholder="CD %" aria-label="Cash discount percent" onChange={(e) => setH('cashDiscountPct', Math.min(100, Math.max(0, parseNum(e.target.value))))} />
                </div>
              </Field>
            )}
            {cfg.kind === 'sales' && (
              <div className="sales-credit-fields contents">
                <Field label="Credit days" htmlFor="credit-days" className="xl:col-span-2">
                  <TextInput id="credit-days" compact numeric type="number" min={0} value={header.creditDays || ''} placeholder="0" onChange={(e) => setH('creditDays', Math.max(0, Math.floor(parseNum(e.target.value))))} />
                </Field>
                <Field label="Cash discount days" htmlFor="discount-days" className="xl:col-span-2">
                  <TextInput id="discount-days" compact numeric type="number" min={0} value={header.cashDiscountDays || ''} placeholder="0" onChange={(e) => setH('cashDiscountDays', Math.max(0, Math.floor(parseNum(e.target.value))))} />
                </Field>
                <Field label="Cash discount %" htmlFor="discount-percent" className="xl:col-span-2">
                  <TextInput id="discount-percent" compact numeric type="number" min={0} max={100} step="0.01" value={header.cashDiscountPct || ''} placeholder="0" onChange={(e) => setH('cashDiscountPct', Math.min(100, Math.max(0, parseNum(e.target.value))))} />
                </Field>
              </div>
            )}
            {isSalesReturn && (
              <Field label="Cr / CD" className="lg:col-span-5 lg:col-start-4 lg:row-start-4">
                <div className="grid grid-cols-3 gap-2">
                  <TextInput compact numeric type="number" min={0} value={header.creditDays || ''} placeholder="Cr day" aria-label="Credit days" onChange={(e) => setH('creditDays', Math.max(0, Math.floor(parseNum(e.target.value))))} />
                  <TextInput compact numeric type="number" min={0} value={header.cashDiscountDays || ''} placeholder="CD day" aria-label="Cash discount days" onChange={(e) => setH('cashDiscountDays', Math.max(0, Math.floor(parseNum(e.target.value))))} />
                  <TextInput compact numeric type="number" min={0} max={100} step="0.01" value={header.cashDiscountPct || ''} placeholder="CD %" aria-label="Cash discount percent" onChange={(e) => setH('cashDiscountPct', Math.min(100, Math.max(0, parseNum(e.target.value))))} />
                </div>
              </Field>
            )}
            {isQuotation && (
              <Field label="Cr / CD" className="lg:col-span-5 lg:col-start-4 lg:row-start-4">
                <div className="grid grid-cols-3 gap-2">
                  <TextInput compact numeric type="number" min={0} value={header.creditDays || ''} placeholder="Cr day" aria-label="Credit days" onChange={(e) => setH('creditDays', Math.max(0, Math.floor(parseNum(e.target.value))))} />
                  <TextInput compact numeric type="number" min={0} value={header.cashDiscountDays || ''} placeholder="CD day" aria-label="Cash discount days" onChange={(e) => setH('cashDiscountDays', Math.max(0, Math.floor(parseNum(e.target.value))))} />
                  <TextInput compact numeric type="number" min={0} max={100} step="0.01" value={header.cashDiscountPct || ''} placeholder="CD %" aria-label="Cash discount percent" onChange={(e) => setH('cashDiscountPct', Math.min(100, Math.max(0, parseNum(e.target.value))))} />
                </div>
              </Field>
            )}
            {(isSalesOrder || isDeliveryChallan) && (
              <Field label="Cr / CD" className="lg:col-span-5 lg:col-start-4 lg:row-start-4">
                <div className="grid grid-cols-3 gap-2">
                  <TextInput compact numeric type="number" min={0} value={header.creditDays || ''} placeholder="Cr day" aria-label="Credit days" onChange={(e) => setH('creditDays', Math.max(0, Math.floor(parseNum(e.target.value))))} />
                  <TextInput compact numeric type="number" min={0} value={header.cashDiscountDays || ''} placeholder="CD day" aria-label="Cash discount days" onChange={(e) => setH('cashDiscountDays', Math.max(0, Math.floor(parseNum(e.target.value))))} />
                  <TextInput compact numeric type="number" min={0} max={100} step="0.01" value={header.cashDiscountPct || ''} placeholder="CD %" aria-label="Cash discount percent" onChange={(e) => setH('cashDiscountPct', Math.min(100, Math.max(0, parseNum(e.target.value))))} />
                </div>
              </Field>
            )}
            {!isPurchaseGrid && <Field label={isQuotation || isSalesOrder || isDeliveryChallan ? 'Price' : 'Price list'} htmlFor="price" className={cn(cfg.kind === 'sales' && 'xl:col-span-2', isSalesReturn && 'lg:col-span-5 lg:col-start-4 lg:row-start-5', isQuotation && 'lg:col-span-5 lg:col-start-4 lg:row-start-5', (isSalesOrder || isDeliveryChallan) && 'lg:col-span-5 lg:col-start-4 lg:row-start-5')}>
              <SelectInput id="price" compact value={header.priceMode} onChange={(e) => setH('priceMode', e.target.value as Header['priceMode'])}>
                <option value="rate">Sale Rate (F2)</option>
                <option value="mrp">MRP</option>
                <option value="wholesale">Wholesale (−5%)</option>
              </SelectInput>
            </Field>}
            {cfg.showValidDays && !isSalesOrder && (
              <Field label="Valid days" hint={`Till ${toDisplayDate(addDays(header.date, header.validDays))}`} className={isPurchaseOrder ? 'lg:col-span-3 lg:col-start-1 lg:row-start-4' : undefined}>
                <TextInput compact type="number" min={1} numeric value={header.validDays} onChange={(e) => setH('validDays', Math.max(1, parseNum(e.target.value)))} />
              </Field>
            )}
            {!isSalesReturn && !isQuotation && !isSalesOrder && !isDeliveryChallan && !isPurchaseBill && !isPurchaseOrder && <Field label="Narration" className={cn(!cfg.showValidDays && !isPurchaseBill && 'xl:col-span-1', cfg.kind === 'sales' && 'xl:col-span-12')}>
              <TextInput compact value={header.narration} placeholder="Remarks" onChange={(e) => setH('narration', e.target.value)} />
            </Field>}
          </div>
        </Panel>

        {isPurchaseBill && (
          <div className="purchase-invoice-bar grid gap-2 rounded-lg border border-[#e7d18f] bg-[#fff4d8] p-2 sm:grid-cols-[minmax(12rem,1fr)_minmax(10rem,.8fr)_minmax(16rem,1.8fr)] sm:items-center">
            <Field label="Supplier Inv No">
              <TextInput compact value={supplierInvoiceNo} placeholder="AS ON SUPPLIER INVOICE" onChange={(e) => setSupplierInvoiceNo(e.target.value)} />
            </Field>
            <Field label="Inv Date">
              <TextInput compact type="date" value={supplierInvoiceDate} onChange={(e) => setSupplierInvoiceDate(e.target.value)} aria-label="Supplier invoice date" />
            </Field>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#267146] sm:justify-end">
              <input
                type="checkbox"
                checked={updateItemMasterPrices}
                onChange={(event) => setUpdateItemMasterPrices(event.target.checked)}
                className="h-4 w-4 accent-[#1d6b40]"
              />
              Update Purchase Rate / MRP / Sale Rate in Item master
            </label>
          </div>
        )}

        {isSalesReturn && (
          <div className="grid gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 md:grid-cols-[minmax(18rem,1fr)_minmax(16rem,1.4fr)] md:items-end">
            <div className="flex items-end gap-2">
              <Field label="Against Bill No" className="min-w-0 flex-1">
                <TextInput
                  compact
                  value={againstBillNo}
                  placeholder="e.g. 125 or INV-125"
                  aria-label="Against sales bill number"
                  onChange={(event) => setAgainstBillNo(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); loadAgainstBill(); } }}
                />
              </Field>
              <Button variant="steel" size="sm" icon={<Link2 className="h-4 w-4" />} onClick={loadAgainstBill}>Load</Button>
              <span className="hidden pb-2 text-xs text-slate-600 lg:inline">Enter = load items · blank = return without bill</span>
            </div>
            <Field label="Reason for return">
              <TextInput compact value={returnReason} placeholder="Damaged / wrong item / expired" onChange={(event) => setReturnReason(event.target.value)} />
            </Field>
          </div>
        )}

        <Panel title={isSalesOrder || isDeliveryChallan || isPurchaseBill || isPurchaseOrder ? undefined : 'Items'} icon={isSalesOrder || isDeliveryChallan || isPurchaseBill || isPurchaseOrder ? undefined : <ClipboardList className="h-4 w-4" />} flush bodyClassName={isPurchaseGrid ? 'p-0' : 'p-3'}>
          <ItemGrid
            lines={lines}
            onChange={setLines}
            items={catalogItems}
            priceMode={header.priceMode}
            showMrp={cfg.showMrp}
            showBatch={cfg.showBatch}
            showDiscount={isPurchaseBill || (!isSalesReturn && !isQuotation && !isSalesOrder && !isDeliveryChallan)}
            showTaxRate={!isSalesOrder && !isDeliveryChallan && !isPurchaseBill}
            showProfit={cfg.showProfit || isSalesReturn}
            purchaseMode={isPurchaseGrid}
            showPurchaseDetail={isPurchaseOrder}
            showNetRate={!isPurchaseOrder}
            stockOnly={cfg.stockOnly}
          />
        </Panel>

        {/* Totals + footer */}
        {!cfg.stockOnly && (
          <div className={cn('grid gap-3', isSalesOrder || isPurchaseOrder ? 'lg:grid-cols-12' : isPurchaseBill ? 'lg:grid-cols-12' : 'lg:grid-cols-5')}>
            <div className={cn(
              'h-fit self-start rounded-xl border p-4 text-navy shadow-panel lg:col-span-2',
              (isSalesOrder || isPurchaseOrder) && 'lg:col-span-4',
              isPurchaseBill && 'lg:col-span-5',
              cfg.kind === 'sales' ? 'border-steel-200 bg-gradient-to-br from-steel-100 to-white' : 'border-[#b9e5cb] bg-gradient-to-br from-[#d9f2e2] to-[#b9e5cb]',
            )}>
              <p className={cn('text-xs font-bold uppercase tracking-wider', cfg.kind === 'sales' ? 'text-steel' : 'text-[#1d6b40]')}>Net amount</p>
              <p className="mt-1 text-3xl font-black tabular-nums sm:text-4xl">{formatINR(totals.netAmount)}</p>
              <p className="mt-1 text-xs text-slate-600">{totals.lineCount} item(s) · qty {totals.totalQty}</p>
              {previousBill && (
                <p className="mt-2 border-t border-[#1d6b40]/15 pt-2 text-xs text-slate-600">
                  Previous {isSalesOrder || isPurchaseOrder ? 'order' : 'bill'} {previousBill.no} · Amt {formatINR(previousBill.amount)}
                  {'paid' in previousBill && ` · received ${formatINR(previousBill.paid ?? 0)}`}
                </p>
              )}
            </div>
            <Panel title="Summary" className={cn('lg:col-span-3', isSalesOrder && 'lg:col-span-8', isPurchaseOrder && 'lg:col-span-8', isPurchaseBill && 'lg:col-span-7')} bodyClassName="p-3">
              <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <Row label="Taxable value" value={formatMoneyPlain(totals.taxable)} />
                <Row label={interState ? 'IGST' : 'CGST'} value={formatMoneyPlain(interState ? totals.igst : totals.cgst)} />
                {!interState && <Row label="SGST" value={formatMoneyPlain(totals.sgst)} />}
                {cfg.showSundry && cfg.kind !== 'sales' && !isSalesReturn && !isQuotation && !isSalesOrder && !isDeliveryChallan && !isPurchaseBill && !isPurchaseOrder && !isPurchaseReturn ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">Bill sundry</span>
                    <span className="flex items-center gap-2">
                      <SelectInput compact className="w-36" value={sundryIdx} onChange={(e) => setSundryIdx(Number(e.target.value))} aria-label="Bill sundry">
                        {sundryOptions.map((s, i) => <option key={s.label} value={i}>{s.label}{s.pct ? ` (${s.pct}%)` : ''}</option>)}
                      </SelectInput>
                      <span className="w-20 text-right font-semibold tabular-nums">{formatMoneyPlain(sundryAmount)}</span>
                    </span>
                  </div>
                ) : <Row label="Bill sundry" value={isSalesOrder || isDeliveryChallan || isPurchaseBill || isPurchaseOrder || isPurchaseReturn ? formatMoneyPlain(sundryAmount) : '0.00'} />}
                {(cfg.kind === 'sales' || isSalesReturn || isQuotation || isSalesOrder || isDeliveryChallan || isPurchaseBill || isPurchaseOrder || isPurchaseReturn) && cfg.showSundry && (
                  <section className="sales-after-tax rounded-lg border border-steel-200 bg-steel-100/70 p-3 sm:col-span-2">
                    <h3 className="text-xs font-bold text-navy">{isSalesReturn || isQuotation || isSalesOrder || isPurchaseOrder || isDeliveryChallan || isPurchaseBill || isPurchaseReturn ? 'After tax (Bill Sundry)' : 'After-tax charges'}</h3>
                    <p className="mb-2 text-[.7rem] text-slate-600">Add a bill sundry by percentage or enter a fixed amount.</p>
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_8rem]">
                      <Field label="Bill sundry" htmlFor="sales-sundry">
                        <SelectInput
                          id="sales-sundry"
                          compact
                          value={sundryIdx}
                          onChange={(e) => {
                            setSundryIdx(Number(e.target.value));
                            setCustomSundryPct('');
                            setCustomSundryAmount('');
                          }}
                        >
                          {sundryOptions.map((option, index) => (
                            <option key={option.label} value={index}>
                              {option.label}{option.pct ? ` (${option.pct}%)` : ''}
                            </option>
                          ))}
                        </SelectInput>
                      </Field>
                      <Field label="Percent" htmlFor="sales-sundry-percent">
                        <div className="relative">
                          <TextInput
                            id="sales-sundry-percent"
                            compact
                            numeric
                            type="number"
                            min={0}
                            max={100}
                            step="0.01"
                            className="pr-7"
                            value={customSundryAmount !== ''
                              ? (sundryBase > 0 ? round2((sundryAmount / sundryBase) * 100) : '')
                              : customSundryPct === '' ? sundryPct || '' : customSundryPct}
                            onChange={(e) => {
                              setCustomSundryPct(e.target.value);
                              setCustomSundryAmount('');
                            }}
                          />
                          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">%</span>
                        </div>
                      </Field>
                      <Field label="Amount" htmlFor="sales-sundry-amount">
                        <TextInput
                          id="sales-sundry-amount"
                          compact
                          numeric
                          type="number"
                          min={0}
                          step="0.01"
                          value={customSundryAmount === '' ? formatMoneyPlain(sundryAmount) : customSundryAmount}
                          onChange={(e) => setCustomSundryAmount(e.target.value)}
                        />
                      </Field>
                    </div>
                  </section>
                )}
                {cfg.kind === 'sales' && discountPct > 0 && (
                  <Row label={`Cash discount available (${discountPct}% within ${header.cashDiscountDays} days)`} value={formatMoneyPlain(cashDiscountAmount)} />
                )}
                <Row label="Round off" value={formatMoneyPlain(totals.roundOff)} />
                <div className="flex items-center justify-between border-t border-cream-200 pt-2 font-bold text-navy sm:col-span-2">
                  <span>Net amount</span><span className="tabular-nums">{formatMoneyPlain(totals.netAmount)}</span>
                </div>
              </div>
            </Panel>
          </div>
        )}

        {/* Footer toolbar */}
        <div className="no-print sticky bottom-0 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-[#e3d6bd] bg-white/95 p-2.5 shadow-pop backdrop-blur">
          <Button variant="danger" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm('delete')}>Delete</Button>
          <Button variant="outline" size="sm" icon={<XCircle className="h-4 w-4" />} onClick={() => setConfirm('cancel')}>Cancel</Button>
          <Button variant="navy" size="sm" icon={<Printer className="h-4 w-4" />} onClick={() => setShowPreview(true)}>Print</Button>
          <Button variant={cfg.kind === 'sales' ? 'navy' : 'success'} size="sm" icon={<MessageCircle className="h-4 w-4" />} onClick={() => toast({ tone: 'warning', title: 'WhatsApp not connected', message: 'Connect a provider under Features → W/A - SMS to share this bill.' })}>WhatsApp</Button>
          {isQuotation && <Button variant="steel" size="sm" icon={<FilePlus className="h-4 w-4" />} onClick={makeBill}>Make Bill</Button>}
          <Button variant="outline" size="sm" icon={<FileSpreadsheet className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>Excel Import</Button>
          {isPurchaseBill && <>
            <Button variant="outline" size="sm" icon={<Sparkles className="h-4 w-4" />} onClick={() => toast({ tone: 'warning', title: 'AI Import is not connected', message: 'Use Excel Import with an item-code and quantity CSV in this demo.' })}>AI Import</Button>
            <Button variant="outline" size="sm" icon={<Tag className="h-4 w-4" />} onClick={() => setStickerPreview(true)}>Sticker</Button>
          </>}
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" aria-label="Import CSV file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); e.target.value = ''; }} />
          {cfg.actions.map((a) => (
            <Button key={a} variant="steel" size="sm" icon={a === 'quote' ? <Quote className="h-4 w-4" /> : a === 'close-order' ? <Lock className="h-4 w-4" /> : a === 'extend' ? <RefreshCw className="h-4 w-4" /> : a === 'delivery-challan' ? <Truck className="h-4 w-4" /> : a === 'purchase' ? <ShoppingCart className="h-4 w-4" /> : a === 'order' ? <ClipboardList className="h-4 w-4" /> : <Link2 className="h-4 w-4" />} onClick={() => runAction(a)}>
              {isSalesOrder && a === 'quote' ? 'Quot' : actionLabels[a]}
            </Button>
          ))}
          {cfg.pendingPath && !isSalesOrder && !isDeliveryChallan && <Button variant="ghost" size="sm" onClick={() => navigate(cfg.pendingPath!)}>Pending report</Button>}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" icon={<FilePlus className="h-4 w-4" />} onClick={() => resetForm(true)}>New (F2)</Button>
            <Button variant="ghost" size="sm" icon={<Settings2 className="h-4 w-4" />} onClick={() => navigate('/features/settings')}>Options</Button>
            <Button variant="primary" size="lg" icon={<Save className="h-4 w-4" />} onClick={save}>Save (Alt+S)</Button>
          </div>
        </div>
        {cfg.kind !== 'sales' && <p className="text-xs text-slate-500">Open register: <button type="button" className="font-semibold text-navy underline-offset-2 hover:underline" onClick={() => navigate(cfg.displayPath)}>{cfg.title} display</button></p>}
      </div>

      <Modal open={showPreview} onClose={() => setShowPreview(false)} title={`${cfg.title} ${billNo} — print preview`} width="max-w-4xl"
        footer={<><Button variant="outline" onClick={() => setShowPreview(false)}>Close</Button><Button variant="navy" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Print / Save as PDF</Button></>}>
        <InvoicePreview data={{
          companyName: 'Blooms Retail Pvt Ltd', companyAddress: '12, Anna Salai, Chennai - 600002', companyGstin: '33AAACB1234F1Z5',
          billTitle: cfg.title, billNo, date: header.date, partyName: header.partyName || (cfg.partyLabel ? 'CASH CUSTOMER' : ''),
          partyAddress: [header.address1, header.address2, header.address3].filter(Boolean).join(', '), partyGstin: header.gstin,
          note: isSalesReturn
            ? [againstBillNo.trim() && `Against bill ${againstBillNo.trim()}`, returnReason.trim() && `Reason: ${returnReason.trim()}`].filter(Boolean).join(' · ')
            : isSalesOrder || isPurchaseOrder || isDeliveryChallan
              ? [`Through: ${header.through || 'Direct'}`, (isSalesOrder || isPurchaseOrder) && `Valid for ${header.validDays} days`, header.creditDays > 0 && `Credit days: ${header.creditDays}`, header.cashDiscountDays > 0 && `CD days: ${header.cashDiscountDays}`, header.cashDiscountPct > 0 && `CD: ${header.cashDiscountPct}%`, sundryAmount > 0 && `Bill sundry: ${sundry?.label ?? 'Other charges'} ${formatMoneyPlain(sundryAmount)}`].filter(Boolean).join(' · ')
              : isPurchaseBill
                ? [`Supplier invoice: ${supplierInvoiceNo || '—'}`, `Invoice date: ${toDisplayDate(supplierInvoiceDate)}`].join(' · ')
              : undefined,
          lines, totals, payMode: header.type === 'Cash' ? 'Cash' : 'Credit',
        }} />
      </Modal>

      <Modal open={stickerPreview} onClose={() => setStickerPreview(false)} title={`Item stickers — ${billNo}`} width="max-w-3xl"
        footer={<><Button variant="outline" onClick={() => setStickerPreview(false)}>Close</Button><Button variant="navy" icon={<Printer className="h-4 w-4" />} onClick={printStickers}>Print stickers</Button></>}>
        {lines.filter((line) => line.name).length ? (
          <div className="bill-print-content grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lines.filter((line) => line.name).map((line) => (
              <div key={line.uid} className="rounded-lg border border-dashed border-slate-400 p-3 text-center">
                <p className="font-bold text-navy">{line.name}</p>
                <p className="mt-1 text-xs text-slate-600">{line.code}{line.batchNo ? ` · Batch ${line.batchNo}` : ''}</p>
                <p className="mt-2 text-sm font-semibold">MRP {formatINR(line.mrp)} · Qty {line.qty}</p>
              </div>
            ))}
          </div>
        ) : <p className="bill-print-content text-sm text-slate-600">Add items to create their sticker preview.</p>}
      </Modal>

      <ConfirmDialog
        open={confirm === 'delete'}
        title="Delete this entry?"
        message="All lines typed on this screen will be cleared. Saved records are not affected."
        confirmLabel="Clear form"
        tone="danger"
        onCancel={() => setConfirm(null)}
        onConfirm={() => { resetForm(true); setConfirm(null); toast({ tone: 'info', title: 'Form cleared' }); }}
      />
      <ConfirmDialog
        open={confirm === 'cancel'}
        title="Cancel and start again?"
        message="Unsaved changes on this bill will be discarded."
        confirmLabel="Discard changes"
        tone="danger"
        onCancel={() => setConfirm(null)}
        onConfirm={() => { resetForm(true); setConfirm(null); }}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold tabular-nums text-navy">{value}</span>
    </div>
  );
}
