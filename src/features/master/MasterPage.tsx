import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Power, Search, FileSpreadsheet } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, SelectInput, TextInput, TextArea } from '../../components/ui/Field';
import { Badge } from '../../components/ui/Badge';
import { Panel } from '../../components/ui/Panel';
import { DemoNotice } from '../../components/ui/DemoNotice';
import { DataTable, type Column } from '../../components/tables/DataTable';
import { downloadCsv } from '../../utils/export';
import { useDemoStore, NO_RECORDS } from '../../store/demoStore';
import { useAppStore } from '../../store/appStore';
import type { MasterRecord } from '../../types';
import { masterCollections, type MasterCollection, type MasterField } from './masterConfig';

type FormValues = Record<string, string | number | boolean>;

/** Builds the validation schema from the field definitions, so every master validates the same way. */
const buildSchema = (fields: MasterField[]) => {
  const shape: Record<string, z.ZodType> = {};
  for (const f of fields) {
    if (f.type === 'checkbox') shape[f.key] = z.boolean();
    else if (f.type === 'number') shape[f.key] = z.coerce.number({ message: `${f.label} must be a number` }).min(0, `${f.label} cannot be negative`);
    else if (f.type === 'email') shape[f.key] = z.string().trim().email('Enter a valid email').or(z.literal(''));
    else if (f.required) shape[f.key] = z.string().trim().min(1, `${f.label} is required`);
    else shape[f.key] = z.string().trim();
  }
  if (fields.some((f) => f.key === 'phone')) {
    shape.phone = z.string().trim().refine((v) => v === '' || /^\d{10}$/.test(v), 'Mobile must be 10 digits');
  }
  if (fields.some((f) => f.key === 'gstin')) {
    shape.gstin = z.string().trim().toUpperCase().refine((v) => v === '' || /^[0-9A-Z]{15}$/.test(v), 'GSTIN must be 15 characters');
  }
  return z.object(shape);
};

const blankValues = (cfg: MasterCollection): FormValues => {
  const v: FormValues = {};
  for (const f of cfg.fields) v[f.key] = f.type === 'checkbox' ? true : f.type === 'number' ? 0 : f.type === 'select' ? (f.options?.[0] ?? '') : '';
  return v;
};

/**
 * Generic master-data screen (list, search, create, edit, activate / deactivate, delete).
 * Every Master submenu uses this component with a different field configuration.
 */
export function MasterPage({ slug }: { slug: string }) {
  const cfg = masterCollections[slug];
  const toast = useAppStore((s) => s.toast);
  const records = useDemoStore((s) => s.masters[slug] ?? NO_RECORDS);
  const upsert = useDemoStore((s) => s.upsertMaster);
  const remove = useDemoStore((s) => s.deleteMaster);
  const setActive = useDemoStore((s) => s.setMasterActive);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [editing, setEditing] = useState<MasterRecord | null | undefined>(undefined);
  const [toDelete, setToDelete] = useState<MasterRecord | null>(null);

  const schema = useMemo(() => (cfg ? buildSchema(cfg.fields) : z.object({})), [cfg]);
  const form = useForm<FormValues>({ resolver: zodResolver(schema) as never, defaultValues: cfg ? blankValues(cfg) : {} });

  if (!cfg) return <p className="text-fiery">Unknown master: {slug}</p>;

  const isActive = (r: MasterRecord) => r.active !== false;
  const filtered = records.filter((r) => {
    if (status === 'active' && !isActive(r)) return false;
    if (status === 'inactive' && isActive(r)) return false;
    if (!query) return true;
    return cfg.fields.some((f) => String(r[f.key] ?? '').toLowerCase().includes(query.toLowerCase()));
  });

  const tableFields = cfg.fields.filter((f) => f.inTable && f.type !== 'checkbox');
  const columns: Column<MasterRecord>[] = [
    ...tableFields.map((f) => ({
      key: f.key,
      header: f.label,
      align: f.type === 'number' ? ('right' as const) : undefined,
      sortValue: (r: MasterRecord) => (f.type === 'number' ? Number(r[f.key] ?? 0) : String(r[f.key] ?? '')),
      render: (r: MasterRecord) => (f.type === 'number' ? Number(r[f.key] ?? 0).toLocaleString('en-IN') : String(r[f.key] ?? '—') || '—'),
    })),
    {
      key: 'status',
      header: 'Status',
      render: (r) => <Badge tone={isActive(r) ? 'green' : 'gray'}>{isActive(r) ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" iconOnly aria-label={`Edit ${String(r[cfg.fields[0].key])}`} title="Edit" onClick={(e) => { e.stopPropagation(); openEdit(r); }}><Pencil className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" iconOnly aria-label={isActive(r) ? 'Deactivate' : 'Activate'} title={isActive(r) ? 'Deactivate' : 'Activate'} onClick={(e) => { e.stopPropagation(); setActive(slug, r.id, !isActive(r)); toast({ tone: 'success', title: isActive(r) ? 'Deactivated' : 'Activated', message: String(r[cfg.fields[0].key]) }); }}><Power className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" iconOnly aria-label="Delete" title="Delete" onClick={(e) => { e.stopPropagation(); setToDelete(r); }}><Trash2 className="h-4 w-4 text-fiery" /></Button>
        </div>
      ),
    },
  ];

  function openNew() {
    form.reset(blankValues(cfg));
    setEditing(null);
  }
  function openEdit(r: MasterRecord) {
    const values: FormValues = blankValues(cfg);
    for (const f of cfg.fields) {
      const raw = r[f.key];
      if (raw !== undefined) values[f.key] = raw as string | number | boolean;
    }
    form.reset(values);
    setEditing(r);
  }

  const onSave = form.handleSubmit((values) => {
    const id = editing?.id ?? `${slug}-${Date.now()}`;
    const record: MasterRecord = { ...values, id } as MasterRecord;
    upsert(slug, record);
    setEditing(undefined);
    toast({ tone: 'success', title: editing ? `${cfg.singular} updated` : `${cfg.singular} created`, message: `${String(values[cfg.fields[0].key])} saved for this session (demo).` });
  });

  const exportCols = cfg.fields.map((f) => ({ key: f.key, label: f.label }));

  return (
    <>
      <PageHeader
        title={cfg.title}
        subtitle={`${cfg.group} · create, change and switch off ${cfg.singular}s. Changes last for this session.`}
        actions={
          <>
            <Button variant="outline" icon={<FileSpreadsheet className="h-4 w-4" />} onClick={() => { downloadCsv(`${slug}.csv`, exportCols, filtered as unknown as Record<string, unknown>[]); toast({ tone: 'success', title: 'Exported to Excel (CSV)' }); }} disabled={!filtered.length}>Excel</Button>
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openNew}>New {cfg.singular}</Button>
          </>
        }
      />
      <div className="space-y-4">
        <DemoNotice />
        <Panel bodyClassName="p-3 sm:p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative min-w-[14rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${cfg.singular}s…`} className="pl-9" aria-label="Search" />
            </div>
            <Field label="Status" className="w-44">
              <SelectInput value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option>
              </SelectInput>
            </Field>
          </div>
        </Panel>
        <Panel flush title={`${cfg.title} (${filtered.length})`}>
          <DataTable<MasterRecord>
            columns={columns}
            rows={filtered}
            rowKey={(r) => r.id}
            onRowDoubleClick={openEdit}
            emptyTitle={`No ${cfg.singular}s found`}
            emptyMessage={query ? 'Try a different search.' : `Create your first ${cfg.singular} with the button above.`}
            caption={cfg.title}
          />
        </Panel>
      </div>

      <Modal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? `Edit ${cfg.singular}` : `New ${cfg.singular}`}
        width="max-w-xl"
        footer={<><Button variant="outline" onClick={() => setEditing(undefined)}>Cancel</Button><Button variant="primary" onClick={() => void onSave()}>Save</Button></>}
      >
        <form onSubmit={onSave} className="grid gap-3 sm:grid-cols-2" noValidate>
          {cfg.fields.map((f) => {
            const err = form.formState.errors[f.key]?.message as string | undefined;
            if (f.type === 'checkbox') {
              return (
                <Controller key={f.key} control={form.control} name={f.key} render={({ field }) => (
                  <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold text-navy">
                    <input type="checkbox" className="h-4 w-4 accent-fiery" checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} />
                    {f.label}
                  </label>
                )} />
              );
            }
            const wide = f.type === 'textarea' || f.key === 'address';
            return (
              <Field key={f.key} label={f.label + (f.required ? ' *' : '')} error={err} hint={err ? undefined : f.hint} className={wide ? 'sm:col-span-2' : ''} htmlFor={`m-${f.key}`}>
                {f.type === 'select' ? (
                  <SelectInput id={`m-${f.key}`} error={!!err} {...form.register(f.key)}>
                    {(f.options ?? []).map((o) => <option key={o}>{o}</option>)}
                  </SelectInput>
                ) : f.type === 'textarea' || f.key === 'address' ? (
                  <TextArea id={`m-${f.key}`} error={!!err} {...form.register(f.key)} />
                ) : (
                  <TextInput id={`m-${f.key}`} error={!!err} type={f.type === 'number' ? 'number' : f.type === 'email' ? 'email' : 'text'} step="any" min={f.type === 'number' ? 0 : undefined} numeric={f.type === 'number'} {...form.register(f.key)} />
                )}
              </Field>
            );
          })}
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        tone="danger"
        title={`Delete ${cfg.singular}?`}
        message={toDelete ? `"${String(toDelete[cfg.fields[0].key])}" will be removed from this session. Past vouchers that used it are not changed.` : ''}
        confirmLabel="Delete"
        onCancel={() => setToDelete(null)}
        onConfirm={() => { if (toDelete) { remove(slug, toDelete.id); toast({ tone: 'success', title: 'Deleted', message: `${cfg.singular} removed from this session.` }); } setToDelete(null); }}
      />
    </>
  );
}
