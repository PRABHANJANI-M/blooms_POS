import { useState } from 'react';
import { DatabaseBackup, Upload, RotateCcw, ShieldAlert, FileCheck2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Panel';
import { DemoNotice } from '../../components/ui/DemoNotice';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TextInput } from '../../components/ui/Field';
import { StatCard } from '../../components/ui/StatCard';
import { DataTable, type Column } from '../../components/tables/DataTable';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../services/api';
import { useAppStore } from '../../store/appStore';
import { backupHistory } from '../../mock-data/company';

type Backup = (typeof backupHistory)[number];

const MAX_MB = 500;

/** Backup management: history, create, upload (validated only, not read) and a guarded restore. Nothing is backed up or restored in demo mode. */
export function BackupRestorePage() {
  const toast = useAppStore((s) => s.toast);
  const { data: backups, loading, reload } = useAsync(() => api.getBackups(), []);
  const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null);
  const [typed, setTyped] = useState('');
  const [upload, setUpload] = useState<{ name: string; sizeMb: number; ok: boolean; note: string } | null>(null);

  const tryBackend = async (fn: () => Promise<unknown>, title: string) => {
    try { await fn(); toast({ tone: 'success', title }); }
    catch (e) { toast({ tone: 'warning', title: 'Not available in demo mode', message: (e as Error).message }); }
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const sizeMb = Math.round((file.size / 1048576) * 10) / 10;
    const extOk = /\.(bak|zip)$/i.test(file.name);
    const ok = extOk && sizeMb > 0 && sizeMb <= MAX_MB;
    const note = !extOk ? 'Only .bak or .zip backup files are accepted.' : sizeMb > MAX_MB ? `File is larger than ${MAX_MB} MB.` : sizeMb === 0 ? 'The file is empty.' : 'Accepted for upload. Integrity and content checks run on the server once connected.';
    setUpload({ name: file.name, sizeMb, ok, note });
    toast({ tone: ok ? 'success' : 'error', title: ok ? 'Backup file accepted' : 'Backup file rejected', message: note });
  };

  const columns: Column<Backup>[] = [
    { key: 'file', header: 'File', render: (b) => <span className="font-semibold text-navy">{b.file}</span> },
    { key: 'createdAt', header: 'Created', render: (b) => b.createdAt },
    { key: 'kind', header: 'Type', render: (b) => <Badge tone={b.kind === 'Manual' ? 'maroon' : 'steel'}>{b.kind}</Badge> },
    { key: 'size', header: 'Size', align: 'right', render: (b) => b.size },
    { key: 'status', header: 'Validation', render: (b) => <Badge tone="green">{b.status}</Badge> },
    { key: 'act', header: 'Actions', render: (b) => (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" disabled title="Downloads need server storage" onClick={() => undefined}>Download</Button>
        <Button size="sm" variant="danger" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => { setRestoreTarget(b); setTyped(''); }}>Restore</Button>
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader title="Backup / Restore" subtitle="Keep a copy of your company data and restore it when needed." actions={
        <Button variant="primary" icon={<DatabaseBackup className="h-4 w-4" />} onClick={() => void tryBackend(() => api.createBackup(), 'Backup created')}>Create backup</Button>
      } />
      <div className="space-y-4">
        <DemoNotice>No real backup is created, uploaded or restored here. The list below is sample history.</DemoNotice>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard tone="navy" label="Backups listed" value={String(backups?.length ?? 0)} />
          <StatCard tone="steel" label="Last backup" value={backups?.[0]?.createdAt.split(' ')[0] ?? '—'} />
          <StatCard tone="cream" label="Schedule" value="Daily 10 PM" hint="Demo setting" />
          <StatCard tone="fiery" label="Restore" value="Guarded" hint="Needs typed confirmation" />
        </div>

        <Panel flush title="Backup history" actions={<Button size="sm" variant="ghost" onClick={reload}>Refresh</Button>}>
          <DataTable columns={columns} rows={backups ?? []} rowKey={(b) => b.id} loading={loading} emptyTitle="No backups yet" emptyMessage="Create a backup to see it here." />
        </Panel>

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Upload backup file" icon={<Upload className="h-4 w-4" />} bodyClassName="space-y-3">
            <p className="text-sm text-slate-600">Choose a .bak or .zip file to validate. Maximum {MAX_MB} MB.</p>
            <input type="file" accept=".bak,.zip,application/zip" aria-label="Choose backup file" className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-navy-700"
              onChange={(e) => onFile(e.target.files?.[0])} />
            {upload && (
              <div className={`flex gap-2 rounded-lg p-3 text-sm ${upload.ok ? 'bg-green-50 text-[#1d6b40]' : 'bg-red-50 text-fiery'}`}>
                <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0" />
                <div><p className="font-semibold">{upload.name} · {upload.sizeMb} MB</p><p>{upload.note}</p></div>
              </div>
            )}
          </Panel>
          <Panel title="Restore safety" icon={<ShieldAlert className="h-4 w-4" />} bodyClassName="space-y-2 text-sm text-slate-700">
            <p>Before restoring, a fresh backup is taken automatically.</p>
            <p>Restoring replaces all company data with the chosen backup. Use it only when you are sure.</p>
            <p>Restore needs a connected backend. In this demo it always stops with a clear message.</p>
          </Panel>
        </div>
      </div>

      <Modal
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        title="Restore backup?"
        width="max-w-md"
        footer={<>
          <Button variant="outline" onClick={() => setRestoreTarget(null)}>Cancel</Button>
          <Button variant="danger" disabled={typed !== 'RESTORE'} onClick={() => { setRestoreTarget(null); void tryBackend(() => api.restoreBackup(), 'Restore started'); }}>Restore backup</Button>
        </>}
      >
        <div className="space-y-3 text-sm text-slate-700">
          <p>This replaces current data with <b>{restoreTarget?.file}</b> ({restoreTarget?.createdAt}). Type <b>RESTORE</b> to confirm.</p>
          <TextInput value={typed} onChange={(e) => setTyped(e.target.value.toUpperCase())} placeholder="Type RESTORE" aria-label="Type RESTORE to confirm" />
        </div>
      </Modal>
    </>
  );
}
