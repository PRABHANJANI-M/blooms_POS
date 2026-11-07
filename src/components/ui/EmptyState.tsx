import type { ReactNode } from 'react';
import { FolderOpen } from 'lucide-react';

export function EmptyState({ title, message, action, icon }: { title: string; message?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="rounded-full bg-steel-100 p-3 text-steel">{icon ?? <FolderOpen className="h-7 w-7" />}</div>
      <p className="font-semibold text-navy">{title}</p>
      {message && <p className="max-w-sm text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-8 animate-pulse rounded-md bg-gradient-to-r from-cream-200 via-cream to-cream-200" />
      ))}
    </div>
  );
}
