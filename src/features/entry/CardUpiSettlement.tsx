import { useMemo, useState } from 'react';
import { Building2, Check, Clock3, Plus, Trash2, X } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Field, SelectInput, TextInput } from '../../components/ui/Field';
import { Panel } from '../../components/ui/Panel';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DataTable, type Column } from '../../components/tables/DataTable';
import { useAppStore } from '../../store/appStore';
import { formatINR, parseNum, round2 } from '../../utils/money';
import { toDisplayDate, todayISO } from '../../utils/date';

type PaymentMode = 'UPI' | 'Card';

interface Receipt {
  id: string;
  date: string;
  bill: string;
  mode: PaymentMode;
  amount: number;
}

interface Settlement {
  id: string;
  journalNo: string;
  date: string;
  mode: PaymentMode;
  bank: string;
  settled: number;
  credited: number;
  charges: number;
  utr: string;
  remarks: string;
}

const receipts: Receipt[] = [
  { id: 'r1', date: '2026-11-02', bill: 'POS-214', mode: 'UPI', amount: 480 },
  { id: 'r2', date: '2026-11-02', bill: 'POS-215', mode: 'Card', amount: 2400 },
  { id: 'r3', date: '2026-11-03', bill: 'POS-216', mode: 'UPI', amount: 1250 },
  { id: 'r4', date: '2026-11-03', bill: 'POS-217', mode: 'Card', amount: 3150 },
];

const initialSettlements: Settlement[] = [
  { id: 's1', journalNo: '1', date: '2026-11-03', mode: 'UPI', bank: 'KVB A/C', settled: 420, credited: 420, charges: 0, utr: '1256588989', remarks: '' },
];

const bankAccounts = ['KVB A/C', 'HDFC Bank', 'SBI A/C'];
const initialDate = todayISO();

/** Reconcile demo Card and UPI receipts with manually recorded bank credits. */
export function CardUpiSettlement() {
  const toast = useAppStore((s) => s.toast);
  const [mode, setMode] = useState<PaymentMode>('UPI');
  const [from, setFrom] = useState(`${initialDate.slice(0, 8)}01`);
  const [to, setTo] = useState(initialDate);
  const [settlements, setSettlements] = useState(initialSettlements);
  const [nextJournalNo, setNextJournalNo] = useState(2);
  const [formOpen, setFormOpen] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Settlement | null>(null);

  const [settlementDate, setSettlementDate] = useState(initialDate);
  const [bank, setBank] = useState(bankAccounts[0]);
  const [settledAmount, setSettledAmount] = useState('');
  const [creditedAmount, setCreditedAmount] = useState('');
  const [utr, setUtr] = useState('');
  const [remarks, setRemarks] = useState('');

  const visibleReceipts = useMemo(
    () => receipts.filter((receipt) => receipt.mode === mode && receipt.date >= from && receipt.date <= to),
    [mode, from, to],
  );
  const visibleSettlements = useMemo(
    () => settlements.filter((settlement) => settlement.mode === mode && settlement.date >= from && settlement.date <= to),
    [mode, settlements, from, to],
  );
  const pendingByMode = useMemo(() => {
    const calculate = (paymentMode: PaymentMode) => {
      const received = receipts
        .filter((receipt) => receipt.mode === paymentMode && receipt.date >= from && receipt.date <= to)
        .reduce((sum, receipt) => sum + receipt.amount, 0);
      const bankCredits = settlements
        .filter((settlement) => settlement.mode === paymentMode && settlement.date >= from && settlement.date <= to)
        .reduce((sum, settlement) => sum + settlement.credited, 0);
      return round2(received - bankCredits);
    };
    return { UPI: calculate('UPI'), Card: calculate('Card') };
  }, [settlements, from, to]);

  const bankCharges = round2(parseNum(settledAmount) - parseNum(creditedAmount));
  const dayWiseBills = useMemo(() => {
    const grouped = new Map<string, { date: string; bills: string[]; amount: number }>();
    visibleReceipts.forEach((receipt) => {
      const group = grouped.get(receipt.date) ?? { date: receipt.date, bills: [], amount: 0 };
      group.bills.push(receipt.bill);
      group.amount = round2(group.amount + receipt.amount);
      grouped.set(receipt.date, group);
    });
    return [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [visibleReceipts]);

  const resetForm = () => {
    setSettlementDate(initialDate);
    setBank(bankAccounts[0]);
    setSettledAmount('');
    setCreditedAmount('');
    setUtr('');
    setRemarks('');
  };

  const saveSettlement = () => {
    const settled = parseNum(settledAmount);
    const credited = parseNum(creditedAmount);
    if (!settlementDate || !bank) {
      toast({ tone: 'warning', title: 'Enter the settlement date and bank account' });
      return;
    }
    if (settled <= 0) {
      toast({ tone: 'warning', title: 'Enter an amount settled greater than zero' });
      return;
    }
    if (!creditedAmount.trim()) {
      toast({ tone: 'warning', title: 'Enter the amount credited in the bank' });
      return;
    }
    if (credited < 0 || credited > settled) {
      toast({ tone: 'warning', title: 'Bank credit must be between zero and the settled amount' });
      return;
    }

    const journalNo = String(nextJournalNo);
    setSettlements((current) => [
      ...current,
      {
        id: `s${Date.now()}`,
        journalNo,
        date: settlementDate,
        mode,
        bank,
        settled: round2(settled),
        credited: round2(credited),
        charges: round2(settled - credited),
        utr: utr.trim(),
        remarks: remarks.trim(),
      },
    ]);
    setNextJournalNo((number) => number + 1);
    toast({
      tone: 'success',
      title: `${mode} settlement saved`,
      message: `Journal No. ${journalNo} recorded in this demo session only.`,
    });
    resetForm();
  };

  const removeSettlement = () => {
    if (!deleteTarget) return;
    setSettlements((current) => current.filter((settlement) => settlement.id !== deleteTarget.id));
    toast({ tone: 'success', title: `Journal No. ${deleteTarget.journalNo} deleted` });
    setDeleteTarget(null);
  };

  const dayColumns: Column<(typeof dayWiseBills)[number]>[] = [
    { key: 'date', header: 'Date', render: (row) => toDisplayDate(row.date), sortValue: (row) => row.date },
    { key: 'bills', header: 'Bills', render: (row) => row.bills.join(', ') },
    { key: 'amount', header: 'Amount', align: 'right', render: (row) => formatINR(row.amount), sortValue: (row) => row.amount },
  ];

  const settlementColumns: Column<Settlement>[] = [
    { key: 'date', header: 'Date', render: (row) => toDisplayDate(row.date), sortValue: (row) => row.date },
    { key: 'journalNo', header: 'Jrnl No', render: (row) => <span className="font-semibold text-blue-700">{row.journalNo}</span>, sortValue: (row) => Number(row.journalNo) },
    { key: 'bank', header: 'Bank', render: (row) => row.bank },
    { key: 'settled', header: 'Settled', align: 'right', render: (row) => formatINR(row.settled), sortValue: (row) => row.settled },
    { key: 'credited', header: 'Credited', align: 'right', render: (row) => formatINR(row.credited), sortValue: (row) => row.credited },
    { key: 'charges', header: 'Charges', align: 'right', render: (row) => formatINR(row.charges), sortValue: (row) => row.charges },
    { key: 'utr', header: 'UTR / Ref', render: (row) => row.utr || '—' },
    { key: 'delete', header: '', render: (row) => (
      <button
        type="button"
        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
        aria-label={`Delete journal ${row.journalNo}`}
        onClick={() => setDeleteTarget(row)}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    ) },
  ];

  return (
    <>
      <PageHeader
        variant="bill"
        title="Card / UPI Settlement"
        actions={
          <div className="flex items-center rounded-full bg-white/15 p-0.5" aria-label="Settlement mode">
            {(['UPI', 'Card'] as const).map((paymentMode) => (
              <button
                type="button"
                key={paymentMode}
                aria-pressed={mode === paymentMode}
                onClick={() => setMode(paymentMode)}
                className={`rounded-full px-4 py-1 text-xs font-bold transition ${mode === paymentMode ? 'bg-white text-blue-700 shadow' : 'text-white hover:bg-white/10'}`}
              >
                {paymentMode}
              </button>
            ))}
          </div>
        }
      />

      <div className="mt-3 grid items-start gap-3 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(['UPI', 'Card'] as const).map((paymentMode) => (
              <button
                key={paymentMode}
                type="button"
                onClick={() => setMode(paymentMode)}
                className={`rounded-xl border p-3 text-left transition ${mode === paymentMode ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-300'}`}
                aria-pressed={mode === paymentMode}
              >
                <span className="block text-xs font-semibold text-slate-500">{paymentMode} pending</span>
                <span className={`mt-0.5 block text-base font-bold tabular-nums ${pendingByMode[paymentMode] < 0 ? 'text-red-700' : 'text-slate-800'}`}>
                  {formatINR(pendingByMode[paymentMode])}
                </span>
              </button>
            ))}
          </div>

          {!formOpen ? (
            <Button variant="primary" className="w-full" icon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>
              New {mode} Settlement
            </Button>
          ) : (
            <Panel
              title={`New ${mode} Settlement`}
              icon={<Plus className="h-4 w-4" />}
              className="overflow-hidden"
              bodyClassName="space-y-2.5"
              actions={
                <button type="button" className="text-slate-500 hover:text-navy" aria-label="Close settlement form" onClick={() => setFormOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              }
            >
              <Field label="Settlement Date">
                <TextInput type="date" compact value={settlementDate} onChange={(event) => setSettlementDate(event.target.value)} />
              </Field>
              <Field label="Bank Account">
                <SelectInput compact value={bank} onChange={(event) => setBank(event.target.value)}>
                  {bankAccounts.map((account) => <option key={account}>{account}</option>)}
                </SelectInput>
              </Field>
              <Field label="Amount Settled">
                <TextInput type="number" min="0" step="0.01" required compact numeric value={settledAmount} onChange={(event) => setSettledAmount(event.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Credited in Bank">
                <TextInput type="number" min="0" step="0.01" required compact numeric value={creditedAmount} onChange={(event) => setCreditedAmount(event.target.value)} placeholder="0.00" />
              </Field>
              <Field label="UTR / Batch No">
                <TextInput compact value={utr} onChange={(event) => setUtr(event.target.value)} placeholder="Reference number" />
              </Field>
              <Field label="Remarks">
                <TextInput compact value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Optional" />
              </Field>
              <div className="flex items-center justify-between rounded-lg bg-amber-100 px-2.5 py-2 text-xs font-bold text-amber-900">
                <span>Bank Charges (MDR)</span>
                <span className="tabular-nums">{formatINR(bankCharges)}</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="success" size="sm" icon={<Check className="h-4 w-4" />} onClick={saveSettlement}>Save Settlement</Button>
                <Button variant="outline" size="sm" icon={<X className="h-4 w-4" />} onClick={() => setFormOpen(false)}>Close</Button>
              </div>
              <p className="text-[.68rem] leading-relaxed text-slate-500">
                Saves a demo journal: Dr Bank and Bank Charges / Cr {mode} Collection. No data is sent to a bank.
              </p>
            </Panel>
          )}
        </div>

        <div className="min-w-0 space-y-3">
          <Panel title={`${mode} received in bills (day wise)`} icon={<Building2 className="h-4 w-4" />} flush>
            <div className="flex flex-wrap items-end gap-2 border-b border-slate-100 px-3 py-2">
              <Field label="From" className="w-36">
                <TextInput type="date" compact value={from} onChange={(event) => setFrom(event.target.value)} />
              </Field>
              <Field label="To" className="w-36">
                <TextInput type="date" compact value={to} onChange={(event) => setTo(event.target.value)} />
              </Field>
            </div>
            <DataTable
              columns={dayColumns}
              rows={dayWiseBills}
              rowKey={(row) => row.date}
              emptyTitle={`No ${mode} received in this period`}
              emptyMessage="Choose a wider date range to view bill receipts."
              caption={`${mode} receipts by day`}
            />
          </Panel>

          <Panel title={`${mode} Settlements`} icon={<Clock3 className="h-4 w-4" />} flush>
            <DataTable
              columns={settlementColumns}
              rows={visibleSettlements}
              rowKey={(row) => row.id}
              emptyTitle={`No ${mode} settlements in this period`}
              emptyMessage="Save a settlement using the form to record a bank credit."
              caption={`${mode} settlement journals`}
            />
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        tone="danger"
        title="Delete settlement?"
        message={deleteTarget ? `Journal No. ${deleteTarget.journalNo} will be removed from this demo session.` : ''}
        confirmLabel="Delete"
        onConfirm={removeSettlement}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
