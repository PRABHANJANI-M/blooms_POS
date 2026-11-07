import { useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Panel } from '../../components/ui/Panel';
import { DemoNotice } from '../../components/ui/DemoNotice';
import { SelectInput, Field } from '../../components/ui/Field';
import { DataTable, type Column } from '../../components/tables/DataTable';
import { DateRange, type RangeOption } from '../../components/common/DateRange';
import { ExportBar } from '../../components/common/ExportBar';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../services/api';
import { useDemoStore, NO_RECORDS } from '../../store/demoStore';
import { formatINR, formatMoneyPlain } from '../../utils/money';
import { todayISO } from '../../utils/date';
import type { ReportRow } from '../../types';

/** Ledger statement for one account, with running balance. Uses demo ledger rows for the sample account. */
export function LedgerStatement() {
  const ledgers = useDemoStore((s) => s.masters.ledgers ?? NO_RECORDS);
  const [ledger, setLedger] = useState(String(ledgers[0]?.name ?? ''));
  const [from, setFrom] = useState('2026-04-01');
  const [to, setTo] = useState(todayISO());
  const { data, loading } = useAsync(() => api.getAccount('ledger'), []);
  const rows = (data?.rows ?? []) as ReportRow[];
  const closing = rows.length ? Number(rows[rows.length - 1].balance) : 0;

  const columns: Column<ReportRow>[] = [
    { key: 'date', header: 'Date', render: (r) => String(r.date) },
    { key: 'voucher', header: 'Voucher', render: (r) => <span className="font-semibold text-navy">{String(r.voucher)}</span> },
    { key: 'particulars', header: 'Particulars', render: (r) => String(r.particulars) },
    { key: 'debit', header: 'Debit', align: 'right', render: (r) => (Number(r.debit) ? formatMoneyPlain(Number(r.debit)) : '') },
    { key: 'credit', header: 'Credit', align: 'right', render: (r) => (Number(r.credit) ? formatMoneyPlain(Number(r.credit)) : '') },
    { key: 'balance', header: 'Balance', align: 'right', render: (r) => `${formatMoneyPlain(Number(r.balance))} ${String(r.side)}` },
  ];

  return (
    <>
      <PageHeader variant="bill" title="Ledger Statement" shortcuts="Esc = dashboard" />
      <div className="mt-3 space-y-3">
        <DemoNotice>Sample ledger rows. The account is for display only.</DemoNotice>
        <Panel bodyClassName="p-3 sm:p-4">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Ledger / account" className="min-w-[14rem] flex-1">
              <SelectInput compact value={ledger} onChange={(e) => setLedger(e.target.value)} aria-label="Ledger">
                {ledgers.map((l) => <option key={String(l.id)}>{String(l.name)}</option>)}
              </SelectInput>
            </Field>
            <DateRange from={from} to={to} onChange={(f, t, _o: RangeOption) => { setFrom(f); setTo(t); }} showQuick={false} />
            <div className="ml-auto rounded-lg bg-navy px-4 py-2 text-white">
              <p className="text-[.65rem] uppercase opacity-70">Closing — {ledger}</p>
              <p className="font-bold tabular-nums">{formatINR(closing)}</p>
            </div>
          </div>
        </Panel>
        <Panel flush title="Statement" actions={<ExportBar filename={`Ledger_${ledger}`} columns={[{ key: 'date', label: 'Date' }, { key: 'voucher', label: 'Voucher' }, { key: 'particulars', label: 'Particulars' }, { key: 'debit', label: 'Debit' }, { key: 'credit', label: 'Credit' }, { key: 'balance', label: 'Balance' }]} rows={rows} />}>
          <DataTable<ReportRow> columns={columns} rows={rows} rowKey={(r) => `${r.voucher}-${r.date}`} loading={loading} emptyTitle="No ledger movements" />
        </Panel>
      </div>
    </>
  );
}
