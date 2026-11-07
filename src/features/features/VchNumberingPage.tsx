import { useState } from 'react';
import { Pencil, Hash } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Field, SelectInput, TextInput } from '../../components/ui/Field';
import { Panel } from '../../components/ui/Panel';
import { DemoNotice } from '../../components/ui/DemoNotice';
import { DataTable, type Column } from '../../components/tables/DataTable';
import { useDemoStore } from '../../store/demoStore';
import { useAppStore } from '../../store/appStore';
import { financialYearLabel } from '../../utils/date';
import { parseNum } from '../../utils/money';
import type { VchType } from '../../mock-data/features';

/** Builds the voucher number shown to users from the numbering rule. */
export const formatVoucherNo = (v: VchType, n: number, fy = '2026-27'): string => {
  const num = v.padWidth > 0 ? String(n).padStart(v.padWidth, '0') : String(n);
  const parts = [v.prefix, v.includeFY ? fy : '', num, v.suffix].filter((p) => p !== '');
  return parts.join(v.separator || '');
};

/** Voucher numbering: prefix, suffix, starting number, padding and financial-year reset. Preview updates live. */
export function VchNumberingPage() {
  const vchTypes = useDemoStore((s) => s.vchTypes);
  const save = useDemoStore((s) => s.saveVchType);
  const toast = useAppStore((s) => s.toast);
  const fy = financialYearLabel('2026-11-04');
  const [editing, setEditing] = useState<VchType | null>(null);
  const [draft, setDraft] = useState<VchType | null>(null);

  const open = (v: VchType) => { setEditing(v); setDraft({ ...v }); };
  const patch = (p: Partial<VchType>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const columns: Column<VchType>[] = [
    { key: 'name', header: 'Voucher type', sortValue: (v) => v.name, render: (v) => <span className="font-semibold text-navy">{v.name}</span> },
    { key: 'rule', header: 'Numbering format', render: (v) => <span className="font-mono text-xs">{formatVoucherNo(v, v.currentNo + 1, fy)}</span> },
    { key: 'start', header: 'Starting no', align: 'right', render: (v) => v.startNo },
    { key: 'current', header: 'Last used', align: 'right', render: (v) => v.currentNo },
    { key: 'fy', header: 'FY reset', render: (v) => (v.resetEachFY ? 'Yes' : 'No') },
    { key: 'edit', header: '', render: (v) => <Button size="sm" variant="ghost" icon={<Pencil className="h-4 w-4" />} onClick={() => open(v)}>Edit</Button> },
  ];

  const preview = draft ? [1, 2, 3].map((k) => formatVoucherNo(draft, draft.startNo + k - 1, fy)) : [];

  return (
    <>
      <PageHeader title="Vch Numbering" subtitle="Set prefix, suffix, starting number and format for each voucher type." />
      <div className="space-y-4">
        <DemoNotice>Numbering changes apply to new vouchers in this session. Existing numbers are not renumbered.</DemoNotice>
        <Panel flush title="Voucher types" icon={<Hash className="h-4 w-4" />}>
          <DataTable columns={columns} rows={vchTypes} rowKey={(v) => v.id} emptyTitle="No voucher types" />
        </Panel>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Numbering — ${editing?.name ?? ''}`} width="max-w-xl"
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" onClick={() => {
          if (!draft) return;
          if (draft.startNo < 1) return toast({ tone: 'error', title: 'Starting number must be 1 or more' });
          save(draft); setEditing(null); toast({ tone: 'success', title: 'Numbering saved (demo)' });
        }}>Save</Button></>}>
        {draft && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Prefix"><TextInput value={draft.prefix} onChange={(e) => patch({ prefix: e.target.value.toUpperCase() })} /></Field>
            <Field label="Suffix"><TextInput value={draft.suffix} onChange={(e) => patch({ suffix: e.target.value.toUpperCase() })} /></Field>
            <Field label="Starting number"><TextInput type="number" min={1} numeric value={draft.startNo} onChange={(e) => patch({ startNo: Math.max(1, Math.floor(parseNum(e.target.value))) })} /></Field>
            <Field label="Digits (zero padding)" hint="0 = no padding"><TextInput type="number" min={0} max={8} numeric value={draft.padWidth} onChange={(e) => patch({ padWidth: Math.min(8, Math.max(0, Math.floor(parseNum(e.target.value)))) })} /></Field>
            <Field label="Separator"><SelectInput value={draft.separator} onChange={(e) => patch({ separator: e.target.value })}>
              <option value="/">/ slash</option><option value="-">- dash</option><option value="">none</option>
            </SelectInput></Field>
            <Field label="Financial year in number"><SelectInput value={draft.includeFY ? 'yes' : 'no'} onChange={(e) => patch({ includeFY: e.target.value === 'yes' })}>
              <option value="yes">Include (e.g. {fy})</option><option value="no">Exclude</option>
            </SelectInput></Field>
            <label className="flex items-center gap-2 text-sm font-semibold text-navy sm:col-span-2">
              <input type="checkbox" className="h-4 w-4 accent-fiery" checked={draft.resetEachFY} onChange={(e) => patch({ resetEachFY: e.target.checked })} />
              Restart numbering at the start of each financial year
            </label>
            <div className="rounded-lg bg-cream-50 p-3 sm:col-span-2">
              <p className="section-title mb-2">Preview</p>
              <div className="flex flex-wrap gap-2">{preview.map((p) => <span key={p} className="badge badge-steel font-mono">{p}</span>)}</div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
