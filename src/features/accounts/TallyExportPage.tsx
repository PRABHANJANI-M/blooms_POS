import { useState } from 'react';
import { DownloadCloud, Send } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Panel } from '../../components/ui/Panel';
import { Button } from '../../components/ui/Button';
import { DemoNotice } from '../../components/ui/DemoNotice';
import { DateRange, type RangeOption } from '../../components/common/DateRange';
import { DataTable, type Column } from '../../components/tables/DataTable';
import { Badge } from '../../components/ui/Badge';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../services/api';
import { useAppStore } from '../../store/appStore';
import { todayISO } from '../../utils/date';
import type { ReportRow } from '../../types';

/** Builds a small Tally-style XML preview from the export rows. Demo: the file is never sent to Tally. */
const buildXml = (rows: ReportRow[], from: string, to: string) => {
  const items = rows.map((r) => `    <TALLYMESSAGE>\n      <VOUCHER><DATE>${from}</DATE><VOUCHERNUMBER>${r.batch}</VOUCHERNUMBER><NARRATION>Demo batch ${r.from} to ${r.to}</NARRATION></VOUCHER>\n    </TALLYMESSAGE>`).join('\n');
  return `<ENVELOPE>\n  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>\n  <BODY>\n    <IMPORTDATA>\n${items}\n    </IMPORTDATA>\n  </BODY>\n</ENVELOPE>\n<!-- Period ${from} to ${to}. Demo XML generated in the browser. -->`;
};

export function TallyExportPage() {
  const toast = useAppStore((s) => s.toast);
  const { data, loading } = useAsync(() => api.getAccount('export-tally'), []);
  const [from, setFrom] = useState('2026-11-01');
  const [to, setTo] = useState(todayISO());
  const [preview, setPreview] = useState('');
  const rows = (data?.rows ?? []) as ReportRow[];

  const columns: Column<ReportRow>[] = [
    { key: 'batch', header: 'Batch', render: (r) => <span className="font-semibold text-navy">{String(r.batch)}</span> },
    { key: 'from', header: 'From', render: (r) => String(r.from) },
    { key: 'to', header: 'To', render: (r) => String(r.to) },
    { key: 'vouchers', header: 'Vouchers', align: 'right', render: (r) => String(r.vouchers) },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={String(r.status).includes('ready') ? 'amber' : 'green'}>{String(r.status)}</Badge> },
  ];

  const generate = () => {
    const xml = buildXml(rows, from, to);
    setPreview(xml);
    toast({ tone: 'success', title: 'Demo Tally XML generated', message: 'Preview below. Nothing was sent to Tally.' });
  };
  const download = () => {
    const blob = new Blob([preview], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `tally_demo_${from}_${to}.xml`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <PageHeader title="Export to Tally" subtitle="Prepare vouchers as Tally XML. The file is created here and never sent to Tally." />
      <div className="space-y-4">
        <DemoNotice>Export is a preview. Connecting Tally needs a licensed Tally gateway, which is not part of this frontend.</DemoNotice>
        <Panel bodyClassName="p-3 sm:p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <DateRange from={from} to={to} onChange={(f, t, _o: RangeOption) => { setFrom(f); setTo(t); }} showQuick={false} />
            <div className="flex gap-2">
              <Button variant="navy" icon={<Send className="h-4 w-4" />} onClick={generate}>Generate XML (demo)</Button>
              <Button variant="outline" icon={<DownloadCloud className="h-4 w-4" />} onClick={download} disabled={!preview}>Download</Button>
              <Button variant="steel" disabled title="Needs a connected Tally gateway" onClick={() => api.exportTally().catch((e: Error) => toast({ tone: 'warning', title: 'Not connected', message: e.message }))}>Send to Tally</Button>
            </div>
          </div>
        </Panel>
        <Panel flush title="Export batches">
          <DataTable columns={columns} rows={rows} rowKey={(r) => String(r.batch)} loading={loading} emptyTitle="No batches yet" />
        </Panel>
        {preview && (
          <Panel title="XML preview">
            <pre className="scroll-thin max-h-80 overflow-auto rounded-lg bg-navy p-4 text-xs text-cream">{preview}</pre>
          </Panel>
        )}
      </div>
    </>
  );
}
