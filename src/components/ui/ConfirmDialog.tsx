import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'primary', onConfirm, onCancel, loading = false }: {
  open: boolean; title: string; message: string; confirmLabel?: string; cancelLabel?: string;
  tone?: 'primary' | 'danger'; onConfirm: () => void; onCancel: () => void; loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      width="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="flex gap-3">
        <AlertTriangle className={tone === 'danger' ? 'mt-0.5 h-5 w-5 shrink-0 text-fiery' : 'mt-0.5 h-5 w-5 shrink-0 text-steel'} />
        <p className="text-sm leading-relaxed text-slate-700">{message}</p>
      </div>
    </Modal>
  );
}
