import type { BillLine } from '../../types';
import type { BillTotals } from '../../utils/billing';
import { formatINR, formatMoneyPlain, formatQty } from '../../utils/money';
import { toDisplayDate } from '../../utils/date';
import { numberToWords } from '../../utils/words';

export interface InvoiceData {
  companyName: string;
  companyAddress: string;
  companyGstin: string;
  billTitle: string;
  billNo: string;
  date: string;
  partyName: string;
  partyAddress?: string;
  partyGstin?: string;
  lines: BillLine[];
  totals: BillTotals;
  payMode?: string;
  paid?: number;
  note?: string;
}

/** Print-friendly invoice layout. Uses the `print-area` class so only this block prints. */
export function InvoicePreview({ data }: { data: InvoiceData }) {
  const active = data.lines.filter((l) => l.name && l.qty > 0);
  const { totals } = data;
  return (
    <div className="print-area mx-auto max-w-[780px] bg-white p-6 text-[13px] text-slate-800">
      <div className="flex items-start justify-between gap-4 border-b-2 border-navy pb-3">
        <div>
          <h2 className="text-xl font-extrabold text-navy">{data.companyName}</h2>
          <p className="text-xs text-slate-600">{data.companyAddress}</p>
          {data.companyGstin && <p className="text-xs text-slate-600">GSTIN: {data.companyGstin}</p>}
        </div>
        <div className="text-right">
          <p className="text-sm font-bold uppercase tracking-wide text-maroon">{data.billTitle}</p>
          <p className="text-xs">No: <b>{data.billNo}</b></p>
          <p className="text-xs">Date: <b>{toDisplayDate(data.date)}</b></p>
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-cream-50 p-3 text-xs">
        <p className="font-bold text-navy">Bill to</p>
        <p>{data.partyName || 'CASH CUSTOMER'}</p>
        {data.partyAddress && <p className="text-slate-600">{data.partyAddress}</p>}
        {data.partyGstin && <p className="text-slate-600">GSTIN: {data.partyGstin}</p>}
        {data.note && <p className="mt-1 text-slate-600">{data.note}</p>}
      </div>

      <table className="mt-3 w-full border-collapse text-xs">
        <thead>
          <tr className="bg-navy text-white">
            <th className="p-1.5 text-left">#</th>
            <th className="p-1.5 text-left">Item</th>
            <th className="p-1.5 text-left">HSN</th>
            <th className="p-1.5 text-right">Qty</th>
            <th className="p-1.5 text-right">Rate</th>
            <th className="p-1.5 text-right">Disc</th>
            <th className="p-1.5 text-right">Taxable</th>
            <th className="p-1.5 text-right">GST%</th>
            <th className="p-1.5 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {active.map((l, i) => (
            <tr key={l.uid} className="border-b border-cream-200">
              <td className="p-1.5">{i + 1}</td>
              <td className="p-1.5">{l.name}{l.detail ? <span className="text-slate-500"> · {l.detail}</span> : null}</td>
              <td className="p-1.5">{l.code}</td>
              <td className="p-1.5 text-right">{formatQty(l.qty)} {l.unit}</td>
              <td className="p-1.5 text-right">{formatMoneyPlain(l.rate)}</td>
              <td className="p-1.5 text-right">{l.discPct ? `${l.discPct}%` : '—'}</td>
              <td className="p-1.5 text-right">{formatMoneyPlain(l.taxable)}</td>
              <td className="p-1.5 text-right">{l.gstRate}%</td>
              <td className="p-1.5 text-right font-semibold">{formatMoneyPlain(l.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
        <div>
          <p className="text-slate-600">Amount in words</p>
          <p className="font-semibold">{numberToWords(totals.netAmount)}</p>
          {data.payMode && <p className="mt-2">Payment: <b>{data.payMode}</b>{data.paid !== undefined ? ` · Paid ${formatINR(data.paid)}` : ''}</p>}
        </div>
        <dl className="space-y-1">
          <div className="flex justify-between"><dt>Taxable value</dt><dd>{formatMoneyPlain(totals.taxable)}</dd></div>
          {totals.cgst > 0 && <div className="flex justify-between"><dt>CGST</dt><dd>{formatMoneyPlain(totals.cgst)}</dd></div>}
          {totals.sgst > 0 && <div className="flex justify-between"><dt>SGST</dt><dd>{formatMoneyPlain(totals.sgst)}</dd></div>}
          {totals.igst > 0 && <div className="flex justify-between"><dt>IGST</dt><dd>{formatMoneyPlain(totals.igst)}</dd></div>}
          {totals.sundryAmt !== 0 && <div className="flex justify-between"><dt>Bill sundry</dt><dd>{formatMoneyPlain(totals.sundryAmt)}</dd></div>}
          <div className="flex justify-between"><dt>Round off</dt><dd>{formatMoneyPlain(totals.roundOff)}</dd></div>
          <div className="flex justify-between border-t border-navy pt-1 text-sm font-extrabold text-navy"><dt>Net amount</dt><dd>{formatINR(totals.netAmount)}</dd></div>
        </dl>
      </div>
      <p className="mt-6 text-center text-[11px] text-slate-500">Demo invoice preview. Not a tax invoice. Thank you for your business.</p>
    </div>
  );
}
