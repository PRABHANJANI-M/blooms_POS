import type { BillLine, Sundry } from '../types';
import { round2, toPaise, fromPaise } from './money';

/** Billing arithmetic shared by voucher forms and POS. All money rounded to 2 decimals. */

export const emptyLine = (uid: string): BillLine => ({
  uid, code: '', name: '', detail: '', batchNo: '', unit: '', mrp: 0, rate: 0, qty: 0,
  discPct: 0, gstRate: 0, amount: 0, discAmt: 0, taxable: 0, taxAmt: 0, total: 0,
});

/** Recalculates one line from qty, rate, discount and tax rate. */
export const computeLine = (line: BillLine): BillLine => {
  const amount = round2((line.qty || 0) * (line.rate || 0));
  const discAmt = round2((amount * (line.discPct || 0)) / 100);
  const taxable = round2(amount - discAmt);
  const taxAmt = round2((taxable * (line.gstRate || 0)) / 100);
  const total = round2(taxable + taxAmt);
  return { ...line, amount, discAmt, taxable, taxAmt, total };
};

export interface BillTotals {
  lineCount: number;
  totalQty: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  sundryAmt: number;
  roundOff: number;
  netAmount: number;
  saved: number;
}

/**
 * Totals for a bill. Intra-state supply splits tax into CGST + SGST (SGST takes the paise remainder);
 * inter-state supply uses IGST. Round-off brings the net to the nearest rupee.
 */
export const computeTotals = (lines: BillLine[], sundry: Sundry | null, interState: boolean): BillTotals => {
  const active = lines.filter((l) => l.name && l.qty > 0);
  const taxablePaise = active.reduce((a, l) => a + toPaise(l.taxable), 0);
  const taxAmtPaise = active.reduce((a, l) => a + toPaise(l.taxAmt), 0);
  const savedPaise = active.reduce((a, l) => a + Math.max(0, toPaise((l.mrp - l.rate) * l.qty)) + toPaise(l.discAmt), 0);

  const cgstPaise = interState ? 0 : Math.floor(taxAmtPaise / 2);
  const sgstPaise = interState ? 0 : taxAmtPaise - cgstPaise;
  const igstPaise = interState ? taxAmtPaise : 0;

  const sundryBase = fromPaise(taxablePaise)
    + (sundry?.percentageBase === 'afterTax' ? fromPaise(taxAmtPaise) : 0);
  const sundryPaise = !sundry ? 0
    : sundry.amountMode === 'fixed' ? toPaise(sundry.amount)
      : toPaise((sundryBase * sundry.pct) / 100);
  const grossPaise = taxablePaise + taxAmtPaise + sundryPaise;
  const netRupees = Math.round(grossPaise / 100);
  const roundOffPaise = netRupees * 100 - grossPaise;

  return {
    lineCount: active.length,
    totalQty: round2(active.reduce((a, l) => a + l.qty, 0)),
    taxable: fromPaise(taxablePaise),
    cgst: fromPaise(cgstPaise),
    sgst: fromPaise(sgstPaise),
    igst: fromPaise(igstPaise),
    sundryAmt: fromPaise(sundryPaise),
    roundOff: fromPaise(roundOffPaise),
    netAmount: fromPaise(netRupees * 100),
    saved: fromPaise(savedPaise),
  };
};

/** Parses a qty/rate field and rejects negatives. */
export const clampNonNegative = (n: number): number => (Number.isFinite(n) && n > 0 ? n : 0);
