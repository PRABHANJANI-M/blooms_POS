import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { useAppStore, type ToastTone } from '../../store/appStore';
import { cn } from '../../utils/cn';

const icons: Record<ToastTone, typeof Info> = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertTriangle };
const styles: Record<ToastTone, string> = {
  success: 'border-[#2e7d4f] text-[#1d6b40]',
  error: 'border-fiery text-fiery',
  info: 'border-steel text-navy',
  warning: 'border-[#c98a00] text-[#8a5a00]',
};

export function Toaster() {
  const toasts = useAppStore((s) => s.toasts);
  const dismiss = useAppStore((s) => s.dismissToast);
  return (
    <div className="no-print pointer-events-none fixed right-3 top-3 z-[70] flex w-[min(92vw,380px)] flex-col gap-2" aria-live="polite">
      {toasts.map((t) => {
        const Icon = icons[t.tone];
        return (
          <div key={t.id} className={cn('pointer-events-auto flex items-start gap-3 rounded-xl border-l-4 bg-white p-3 shadow-pop', styles[t.tone])}>
            <Icon className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{t.title}</p>
              {t.message && <p className="mt-0.5 text-xs leading-snug text-slate-600">{t.message}</p>}
            </div>
            <button type="button" onClick={() => dismiss(t.id)} className="rounded p-0.5 text-slate-400 hover:text-navy" aria-label="Dismiss notification">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
