import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

/** Accessible modal: closes on Escape and on backdrop click, locks page scroll while open. */
export function Modal({ open, onClose, title, children, footer, width = 'max-w-lg' }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-navy/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={onClose} data-modal-open>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Dialog'}
        onMouseDown={(e) => e.stopPropagation()}
        className={cn('flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-pop sm:rounded-2xl', width)}
      >
        <header className="flex items-center justify-between gap-3 border-b border-cream-200 bg-navy px-4 py-3 text-white">
          <h2 className="text-sm font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-white/15" aria-label="Close dialog">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="scroll-thin overflow-y-auto px-4 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-cream-200 bg-cream-50 px-4 py-3">{footer}</footer>}
      </div>
    </div>
  );
}
