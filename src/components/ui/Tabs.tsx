import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface TabDef { id: string; label: string; icon?: ReactNode }

export function Tabs({ tabs, active, onChange, className }: { tabs: TabDef[]; active: string; onChange: (id: string) => void; className?: string }) {
  return (
    <div role="tablist" className={cn('scroll-thin flex gap-1 overflow-x-auto border-b border-cream-200', className)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            'flex shrink-0 items-center gap-2 rounded-t-lg border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors',
            active === t.id ? 'border-fiery bg-white text-navy' : 'border-transparent text-slate-500 hover:bg-steel-100 hover:text-navy',
          )}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}
