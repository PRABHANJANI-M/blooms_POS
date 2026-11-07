import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, MessageCircle, FileSpreadsheet, Trash2, XCircle, Plus, Settings2, Save, UserRoundPlus, PackagePlus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DemoNotice } from '../../components/ui/DemoNotice';
import { ItemGrid, blankLines, newLineId, type PriceMode } from './ItemGrid';
import { PaymentModal } from './PaymentModal';
import { InvoicePreview, type InvoiceData } from './InvoicePreview';
import { useAsync } from '../../hooks/useAsync';
import { useHotkeys } from '../../hooks/useHotkeys';
import { api } from '../../services/api';
import { useAppStore } from '../../store/appStore';
import { useDemoStore } from '../../store/demoStore';
import { recentSalesBills } from '../../mock-data/entry';
import { parties } from '../../mock-data/parties';
import { computeLine, computeTotals } from '../../utils/billing';
import { formatINR, formatQty } from '../../utils/money';
import { todayISO, toDisplayDate } from '../../utils/date';
import { parseCodeQtyCsv } from '../../utils/csv';
import type { BillLine, Item, Party, PayMode } from '../../types';

const nextBillNo = () => Math.max(...recentSalesBills.map((b) => b.no)) + 1;

/**
 * Sales Bill - POS. Mirrors the counter screen in the reference video:
 * cell number and customer header, item grid, four summary tiles (Items, Total Qty, You Save, Net Amount),
 * and a footer toolbar. Save opens payment selection, then a print-friendly invoice.
 */
export function PosBilling() {
  const navigate = useNavigate();
  const toast = useAppStore((s) => s.toast);
  const addVoucher = useDemoStore((s) => s.addVoucher);
  const savedCount = useDemoStore((s) => (s.vouchers.sales ?? []).length);
  const { data: baseItems } = useAsync(() => api.getItems(), []);
  const fileRef = useRef<HTMLInputElement>(null);

  const [createdItems, setCreatedItems] = useState<Item[]>([]);
  const [createdParties, setCreatedParties] = useState<Party[]>([]);
  const [priceMode, setPriceMode] = useState<PriceMode>('rate');
  const [activeRow, setActiveRow] = useState(0);
  const [focusTarget, setFocusTarget] = useState<{ row: number; field: string; token: number }>();
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateType, setQuickCreateType] = useState<'customer' | 'item'>('customer');
  const [quickName, setQuickName] = useState('');
  const [quickCode, setQuickCode] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickArea, setQuickArea] = useState('');
  const [quickRate, setQuickRate] = useState('');
  const [quickMrp, setQuickMrp] = useState('');
  const [quickTax, setQuickTax] = useState('0');
  const allItems = useMemo(() => [...(baseItems ?? []), ...createdItems], [baseItems, createdItems]);
  const allParties = useMemo(() => [...parties, ...createdParties], [createdParties]);

  const [billNo, setBillNo] = useState(() => nextBillNo() + savedCount);
  const [cell, setCell] = useState('');
  const [customer, setCustomer] = useState('');
  const [area, setArea] = useState('');
  const [lines, setLines] = useState<BillLine[]>(() => blankLines(1));
  const [payOpen, setPayOpen] = useState(false);
  const [receipt, setReceipt] = useState<InvoiceData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [browsedBill, setBrowsedBill] = useState<InvoiceData | null>(null);
  const [savedBills, setSavedBills] = useState<InvoiceData[]>([]);
  const [browseIndex, setBrowseIndex] = useState(-1);
  const [confirmClear, setConfirmClear] = useState(false);

  const totals = useMemo(() => computeTotals(lines, null, false), [lines]);
  const hasItems = totals.lineCount > 0;

  const onCell = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    setCell(digits);
    if (digits.length === 10) {
      const p = allParties.find((x) => x.phone === digits);
      if (p) { setCustomer(p.name); setArea(p.city ?? ''); toast({ tone: 'success', title: 'Customer found', message: p.name }); }
      else { setCustomer(`New customer ${digits.slice(-4)}`); toast({ tone: 'info', title: 'New customer', message: 'Add full details under Master → Customer Master.' }); }
    }
  };

  const resetBill = () => {
    setLines(blankLines(1));
    setCell(''); setCustomer(''); setArea('');
    setBillNo((n) => n + 1);
  };

  const changePriceMode = (mode: PriceMode) => {
    setPriceMode(mode);
    toast({
      tone: 'info',
      title: 'Price list changed',
      message: `${mode === 'rate' ? 'Sale rate' : mode === 'mrp' ? 'MRP' : 'Wholesale'} will be used for newly selected items.`,
    });
  };

  const openQuickCreate = () => {
    const active = document.activeElement;
    setQuickCreateType(active instanceof HTMLElement && active.closest('[data-grid-field="item"]') ? 'item' : 'customer');
    setQuickName('');
    setQuickCode('');
    setQuickPhone('');
    setQuickArea('');
    setQuickRate('');
    setQuickMrp('');
    setQuickTax('0');
    setQuickCreateOpen(true);
  };

  const saveQuickCreate = () => {
    const name = quickName.trim();
    if (!name) return toast({ tone: 'error', title: 'Name is required' });

    if (quickCreateType === 'customer') {
      const phone = quickPhone.replace(/\D/g, '');
      if (phone && phone.length !== 10) return toast({ tone: 'error', title: 'Enter a 10-digit mobile number' });
      if (phone && allParties.some((party) => party.phone === phone)) return toast({ tone: 'error', title: 'Mobile number already exists' });
      const party: Party = {
        id: `pos-customer-${Date.now()}`, name, kind: 'customer', state: '33 - Tamil Nadu',
        city: quickArea.trim(), phone, balance: 0, active: true,
      };
      setCreatedParties((previous) => [...previous, party]);
      setCustomer(name);
      setArea(party.city ?? '');
      setCell(phone);
      toast({ tone: 'success', title: 'Customer added for this session', message: name });
    } else {
      const code = quickCode.trim();
      const rate = Math.max(0, Number(quickRate) || 0);
      const mrp = Math.max(rate, Number(quickMrp) || rate);
      if (!code) return toast({ tone: 'error', title: 'Item code is required' });
      if (allItems.some((item) => item.code.toLowerCase() === code.toLowerCase())) return toast({ tone: 'error', title: 'Item code already exists' });
      const gstRate = Math.max(0, Number(quickTax) || 0);
      const item: Item = {
        id: `pos-item-${Date.now()}`, code, name, category: 'Other', brand: 'Local',
        unit: 'Nos', hsn: '', rate, mrp, gstRate, stock: 0, reorderLevel: 0, barcode: '',
      };
      setCreatedItems((previous) => [...previous, item]);
      const selectedRate = priceMode === 'mrp' ? mrp : priceMode === 'wholesale' ? Math.round(rate * 0.95 * 100) / 100 : rate;
      const line = computeLine({
        ...blankLines(1)[0], uid: newLineId(), itemId: item.id, code: item.code, name: item.name,
        unit: item.unit, mrp: item.mrp, rate: selectedRate, qty: 1, gstRate: item.gstRate,
        detail: item.brand,
      });
      setLines((previous) => [...previous.filter((row) => row.name), line, blankLines(1)[0]]);
      toast({ tone: 'success', title: 'Item added for this session', message: name });
    }

    setQuickCreateOpen(false);
  };

  const browseBill = (direction: -1 | 1) => {
    if (hasItems) {
      toast({ tone: 'warning', title: 'Save or clear this bill first', message: 'Bill browsing is disabled while the current bill has unsaved items.' });
      return;
    }
    if (!savedBills.length) {
      toast({ tone: 'info', title: 'No saved bills in this session yet' });
      return;
    }
    const index = browseIndex + direction;
    if (index < 0) {
      setBrowseIndex(-1);
      setBrowsedBill(null);
      setPreviewOpen(false);
      return;
    }
    if (index >= savedBills.length) {
      toast({ tone: 'info', title: 'No more saved bills in this direction' });
      return;
    }
    setBrowseIndex(index);
    setBrowsedBill(savedBills[index]);
    setPreviewOpen(true);
  };

  const confirmPayment = (mode: PayMode, paid: number) => {
    const no = `POS-${billNo}`;
    const data: InvoiceData = {
      companyName: 'Blooms Retail Pvt Ltd', companyAddress: '12, Anna Salai, Chennai - 600002', companyGstin: '33AAACB1234F1Z5',
      billTitle: 'Sales Bill (POS)', billNo: no, date: todayISO(), partyName: customer || 'CASH CUSTOMER', partyAddress: area,
      lines, totals, payMode: mode, paid,
    };
    addVoucher('sales', { id: `pos-${Date.now()}`, no: String(billNo), date: todayISO(), party: customer || 'CASH CUSTOMER', amount: totals.netAmount, status: paid <= 0 ? 'Unpaid' : paid >= totals.netAmount ? 'Paid' : 'Partly Paid', mode, paid, lines });
    setSavedBills((previous) => [data, ...previous]);
    setBrowseIndex(-1);
    setPayOpen(false);
    setReceipt(data);
    toast({ tone: 'success', title: `Bill ${no} recorded (demo)`, message: `${mode} ${formatINR(paid)}. No payment was processed.` });
  };

  const importCsv = async (file: File) => {
    const { matches, skipped } = parseCodeQtyCsv(await file.text(), allItems);
    if (!matches.length) return toast({ tone: 'warning', title: 'No matching items', message: 'Use "item code, quantity" per line.' });
    const found = matches.map(({ item, qty }) => computeLine({
      ...blankLines(1)[0], uid: newLineId(), name: item.name, code: item.code, unit: item.unit, mrp: item.mrp, rate: item.rate,
      gstRate: item.gstRate, qty, detail: item.brand,
    }));
    setLines((prev) => [...prev.filter((l) => l.name), ...found, blankLines(1)[0]]);
    toast({ tone: 'success', title: `${found.length} item(s) imported`, message: skipped ? `${skipped} row(s) skipped.` : undefined });
  };

  useHotkeys({
    F2: resetBill,
    F8: resetBill,
    F7: () => changePriceMode(priceMode === 'rate' ? 'mrp' : priceMode === 'mrp' ? 'wholesale' : 'rate'),
    PageUp: () => browseBill(1),
    PageDown: () => browseBill(-1),
    'Alt+C': openQuickCreate,
    'Alt+A': () => setFocusTarget({ row: activeRow, field: 'rate', token: Date.now() }),
    'Alt+S': () => (hasItems ? setPayOpen(true) : toast({ tone: 'error', title: 'Add an item first' })),
  });

  return (
    <>
      <PageHeader
        variant="bill"
        title="Sales Bill - POS"
        shortcuts="PgUp / PgDn = previous / next saved bill · F2 / F8 = new · F7 = price list · Alt+C = new item / customer · Alt+A = edit selected · Alt+S = save · Ctrl+Del = remove row"
        actions={
          <div className="flex items-center gap-1.5">
            <span className="rounded-md bg-fiery px-2.5 py-1 text-xs font-bold">1. New</span>
            <Button size="sm" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" icon={<Plus className="h-3.5 w-3.5" />} onClick={resetBill}>F8</Button>
          </div>
        }
      />

      <div className="mt-3 space-y-3">
        <DemoNotice>Recording a POS bill does not charge a card, UPI or bank account.</DemoNotice>

        <div className="grid gap-3 rounded-xl border border-[#e3d6bd] bg-white p-3 shadow-panel md:grid-cols-[1.1fr_1.4fr_1fr_auto]">
          <label className="min-w-0">
            <span className="label">Cell No <span className="font-normal text-slate-400">(10 digits, blank = walk-in)</span></span>
            <input className="input" inputMode="numeric" placeholder="10 digit cell - Enter" value={cell} onChange={(e) => onCell(e.target.value)} aria-label="Cell number" onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('pos-customer')?.focus(); }} />
          </label>
          <label className="min-w-0">
            <span className="label">Customer</span>
            <input id="pos-customer" list="pos-customers" className="input" placeholder="CUSTOMER NAME (NEW CUSTOMER)" value={customer} onChange={(e) => {
              setCustomer(e.target.value);
              const found = allParties.find((party) => party.name.toLowerCase() === e.target.value.trim().toLowerCase());
              if (found) { setArea(found.city ?? ''); setCell(found.phone ?? ''); }
            }} aria-label="Customer name" />
            <datalist id="pos-customers">{allParties.filter((party) => party.kind === 'customer' && party.active).map((party) => <option key={party.id} value={party.name} />)}</datalist>
          </label>
          <label className="min-w-0">
            <span className="label">Area / Street</span>
            <input className="input" placeholder="AREA / STREET" value={area} onChange={(e) => setArea(e.target.value)} aria-label="Area" />
          </label>
          <div className="flex items-end gap-2 text-right">
            <div>
              <p className="text-[.7rem] font-semibold uppercase text-slate-500">Bill No</p>
              <p className="text-xl font-black text-navy">{billNo}</p>
              <p className="text-xs text-slate-500">{toDisplayDate(todayISO())}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#fff9ee] px-3 py-2 text-xs text-slate-600">
          <span>Cell + Enter moves to customer · Choose a customer or leave blank for walk-in · Enter on the final blank item row opens payment</span>
          <label className="flex items-center gap-2 font-semibold text-navy">
            Price list <span className="kbd">F7</span>
            <select className="select input-sm w-36" value={priceMode} onChange={(event) => changePriceMode(event.target.value as PriceMode)} aria-label="Price list">
              <option value="rate">Sale rate</option><option value="mrp">MRP</option><option value="wholesale">Wholesale</option>
            </select>
          </label>
        </div>

        <ItemGrid lines={lines} onChange={setLines} items={allItems} priceMode={priceMode} onPriceModeChange={setPriceMode}
          onEmptyRowEnter={() => hasItems ? setPayOpen(true) : toast({ tone: 'error', title: 'Add an item first' })}
          onActiveRowChange={setActiveRow} focusTarget={focusTarget} showMrp showTax showBatch showDiscount={false} />

        {/* Summary tiles — same four tiles as the video */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label="Items" value={String(totals.lineCount)} tone="from-[#d9ecf6] to-[#bcdcec]" />
          <Tile label="Total Qty" value={formatQty(totals.totalQty)} tone="from-[#ebe1ff] to-[#d6c6fb]" />
          <Tile label="You Save" value={formatINR(totals.saved)} tone="from-[#fff1b8] to-[#ffdc7a]" />
          <Tile label="Net Amount" value={formatINR(totals.netAmount)} tone="from-[#d5f5e0] to-[#a7e6c0]" big />
        </div>

        <div className="no-print sticky bottom-0 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-[#e3d6bd] bg-white/95 p-2.5 shadow-pop backdrop-blur">
          <Button variant="danger" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmClear(true)}>Delete</Button>
          <Button variant="outline" size="sm" icon={<XCircle className="h-4 w-4" />} onClick={resetBill}>Cancel</Button>
          <Button variant="navy" size="sm" icon={<Printer className="h-4 w-4" />} disabled={!hasItems} onClick={() => { setBrowsedBill(null); setPreviewOpen(true); }}>Print</Button>
          <Button variant="success" size="sm" icon={<MessageCircle className="h-4 w-4" />} onClick={() => toast({ tone: 'warning', title: 'WhatsApp not connected', message: 'Connect a provider under Features → W/A - SMS.' })}>WhatsApp</Button>
          <Button variant="outline" size="sm" icon={<FileSpreadsheet className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>Excel Import</Button>
          <Button variant="outline" size="sm" icon={<UserRoundPlus className="h-4 w-4" />} onClick={() => { setQuickCreateType('customer'); openQuickCreate(); }}>New customer</Button>
          <Button variant="outline" size="sm" icon={<PackagePlus className="h-4 w-4" />} onClick={() => { setQuickCreateType('item'); setQuickCreateOpen(true); setQuickName(''); setQuickCode(''); setQuickRate(''); setQuickMrp(''); setQuickTax('0'); }}>New item</Button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" aria-label="Import CSV file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); e.target.value = ''; }} />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" icon={<Plus className="h-4 w-4" />} onClick={resetBill}>New (F2)</Button>
            <Button variant="ghost" size="sm" icon={<Settings2 className="h-4 w-4" />} onClick={() => navigate('/features/settings')}>Options</Button>
            <Button variant="primary" size="lg" icon={<Save className="h-4 w-4" />} disabled={!hasItems} onClick={() => setPayOpen(true)}>Save (Alt+S)</Button>
          </div>
        </div>
      </div>

      <PaymentModal open={payOpen} net={totals.netAmount} onClose={() => setPayOpen(false)} onConfirm={confirmPayment} />

      <Modal open={quickCreateOpen} onClose={() => setQuickCreateOpen(false)} title={quickCreateType === 'customer' ? 'Quick add customer' : 'Quick add item'} width="max-w-xl"
        footer={<><Button variant="outline" onClick={() => setQuickCreateOpen(false)}>Cancel</Button><Button variant="primary" onClick={saveQuickCreate}>Add to this session</Button></>}>
        <div className="mb-4 flex gap-2">
          <Button size="sm" variant={quickCreateType === 'customer' ? 'primary' : 'outline'} icon={<UserRoundPlus className="h-4 w-4" />} onClick={() => setQuickCreateType('customer')}>Customer</Button>
          <Button size="sm" variant={quickCreateType === 'item' ? 'primary' : 'outline'} icon={<PackagePlus className="h-4 w-4" />} onClick={() => setQuickCreateType('item')}>Item</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="label">{quickCreateType === 'customer' ? 'Customer name' : 'Item name'}</span><input autoFocus className="input" value={quickName} onChange={(event) => setQuickName(event.target.value)} placeholder="Enter a name" /></label>
          {quickCreateType === 'customer' ? (
            <>
              <label><span className="label">Mobile number</span><input className="input" inputMode="numeric" maxLength={10} value={quickPhone} onChange={(event) => setQuickPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10 digits (optional)" /></label>
              <label><span className="label">Area / Street</span><input className="input" value={quickArea} onChange={(event) => setQuickArea(event.target.value)} placeholder="Area or city" /></label>
            </>
          ) : (
            <>
              <label><span className="label">Item code</span><input className="input" value={quickCode} onChange={(event) => setQuickCode(event.target.value)} placeholder="Unique code" /></label>
              <label><span className="label">Unit price (₹)</span><input className="input" type="number" min={0} step="0.01" value={quickRate} onChange={(event) => setQuickRate(event.target.value)} placeholder="0.00" /></label>
              <label><span className="label">MRP (₹)</span><input className="input" type="number" min={0} step="0.01" value={quickMrp} onChange={(event) => setQuickMrp(event.target.value)} placeholder="Same as unit price" /></label>
              <label><span className="label">GST (%)</span><input className="input" type="number" min={0} max={100} value={quickTax} onChange={(event) => setQuickTax(event.target.value)} /></label>
            </>
          )}
        </div>
        <p className="hint-text mt-3">Quick entries are demo-only and remain available on this POS bill until you leave the page.</p>
      </Modal>

      <Modal open={previewOpen} onClose={() => { setPreviewOpen(false); setBrowsedBill(null); }} title={`Invoice preview — ${browsedBill?.billNo ?? `POS-${billNo}`}`} width="max-w-4xl"
        footer={<><Button variant="outline" onClick={() => { setPreviewOpen(false); setBrowsedBill(null); }}>Close</Button><Button variant="navy" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Print / Save as PDF</Button></>}>
        <InvoicePreview data={browsedBill ?? {
          companyName: 'Blooms Retail Pvt Ltd', companyAddress: '12, Anna Salai, Chennai - 600002', companyGstin: '33AAACB1234F1Z5',
          billTitle: 'Sales Bill (POS)', billNo: `POS-${billNo}`, date: todayISO(), partyName: customer || 'CASH CUSTOMER', partyAddress: area, lines, totals,
        }} />
      </Modal>

      <Modal open={!!receipt} onClose={() => { setReceipt(null); resetBill(); }} title="Bill saved (demo)" width="max-w-4xl"
        footer={<><Button variant="outline" onClick={() => { setReceipt(null); resetBill(); }}>No — New bill</Button><Button variant="navy" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Yes — Print / Save as PDF</Button></>}>
        {receipt && <InvoicePreview data={receipt} />}
      </Modal>

      <ConfirmDialog open={confirmClear} tone="danger" title="Clear this bill?" message="All items on the counter will be removed. Recorded bills are not affected."
        confirmLabel="Clear bill" onCancel={() => setConfirmClear(false)} onConfirm={() => { resetBill(); setConfirmClear(false); }} />
    </>
  );
}

function Tile({ label, value, tone, big }: { label: string; value: string; tone: string; big?: boolean }) {
  return (
    <div className={`rounded-xl bg-gradient-to-br ${tone} p-4 text-navy shadow-panel`}>
      <p className="text-[.72rem] font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className={`mt-1 font-black tabular-nums ${big ? 'text-3xl' : 'text-2xl'}`}>{value}</p>
    </div>
  );
}
