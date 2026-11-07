import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

const tones = {
  navy: 'bg-[#dff0f7] text-[#075276]',
  fiery: 'bg-[#fde7e9] text-[#8b1825]',
  steel: 'bg-[#dceef5] text-[#075276]',
  maroon: 'bg-[#f3e5e5] text-maroon',
  cream: 'bg-[#fff3cc] text-[#77520c]',
} as const;

export type StatTone = keyof typeof tones;

/** KPI tile used on dashboard, reports and billing summaries. */
export function StatCard({ label, value, hint, icon, tone = 'cream', className }: {
  label: string; value: string; hint?: string; icon?: ReactNode; tone?: StatTone; className?: string;
}) {
  return (
    <div className={cn('rounded-xl p-4 shadow-panel', tones[tone], className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[.72rem] font-semibold uppercase tracking-wider opacity-80">{label}</p>
          <p className="mt-1 truncate text-xl font-bold tabular-nums sm:text-2xl">{value}</p>
          {hint && <p className="mt-1 text-xs opacity-75">{hint}</p>}
        </div>
        {icon && <div className="rounded-lg bg-white/15 p-2">{icon}</div>}
      </div>
    </div>
  );
}
