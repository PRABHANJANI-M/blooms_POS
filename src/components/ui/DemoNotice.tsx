import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

/** Shown on every screen that uses sample data so nothing is mistaken for real records. */
export function DemoNotice({ children }: { children?: ReactNode }) {
  return (
    <div className="no-print flex items-start gap-2 rounded-lg border border-steel-200 bg-steel-100 px-3 py-2 text-xs text-navy">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-steel" />
      <p>
        <span className="font-bold">Demo data.</span> {children ?? 'Values shown are sample figures, not your business records. Changes last for this browser session only.'}
      </p>
    </div>
  );
}
