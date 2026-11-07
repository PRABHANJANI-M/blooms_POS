import { useMemo, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Field, TextInput } from '../../components/ui/Field';
import type { PayMode } from '../../types';
import { formatINR, parseNum, round2 } from '../../utils/money';
import { cn } from '../../utils/cn';

const modes: PayMode[] = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Credit', 'Other'];

/** Payment selection for POS. Demo only: confirming records the payment in the session, nothing is charged. */
export function PaymentModal({ open, net, onClose, onConfirm }: {
  open: boolean; net: number; onClose: () => void; onConfirm: (mode: PayMode, paid: number) => void;
}) {
  const [mode, setMode] = useState<PayMode>('Cash');
  const [paidText, setPaidText] = useState<string>('');
  const paid = paidText === '' ? net : parseNum(paidText);
  const balance = useMemo(() => round2(net - paid), [net, paid]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Payment"
      width="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Back to bill</Button>
          <Button variant="primary" disabled={paid < 0} onClick={() => { onConfirm(mode, paid); setPaidText(''); }}>
            Confirm payment (demo)
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="label">Payment method</p>
          <div className="grid grid-cols-3 gap-2">
            {modes.map((m) => (
              <button key={m} type="button" onClick={() => { setMode(m); setPaidText(m === 'Credit' ? '0' : ''); }}
                className={cn('rounded-lg border px-2 py-2.5 text-sm font-semibold transition', mode === m ? 'border-fiery bg-fiery text-white' : 'border-cream-200 bg-cream-50 text-navy hover:border-steel')}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-navy p-3 text-white">
            <p className="text-[.7rem] uppercase tracking-wider text-steel-200">Net amount</p>
            <p className="text-lg font-bold tabular-nums">{formatINR(net)}</p>
          </div>
          <Field label="Paid amount" htmlFor="paid">
            <TextInput id="paid" type="number" step="0.01" min={0} numeric value={paidText} placeholder={String(net)} onChange={(e) => setPaidText(e.target.value)} />
          </Field>
        </div>
        <div className={cn('rounded-lg p-3 text-sm font-semibold', balance > 0 ? 'bg-red-50 text-fiery' : 'bg-green-50 text-[#1d6b40]')}>
          Balance due: {formatINR(Math.max(0, balance))}{balance < 0 ? ` (change ${formatINR(-balance)})` : ''}
        </div>
        <p className="text-xs text-slate-500">Card and UPI are recorded only. No payment gateway is connected in this demo.</p>
      </div>
    </Modal>
  );
}
