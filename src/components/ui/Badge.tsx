import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type BadgeTone = 'green' | 'red' | 'amber' | 'steel' | 'maroon' | 'gray';

/** Maps common status words to a tone so tables stay consistent. */
export const statusTone = (status: string): BadgeTone => {
  const s = status.toLowerCase();
  if (/(paid|active|valid|completed|converted|posted|delivered|exported|adjusted|receipt)/.test(s)) return 'green';
  if (/(unpaid|overdue|inactive|cancel|short|error|not configured)/.test(s)) return 'red';
  if (/(partly|partial|pending|open|in progress|credit|part billed|not billed|draft)/.test(s)) return 'amber';
  if (/(cash|payment|upi|card)/.test(s)) return 'steel';
  return 'gray';
};

export function Badge({ tone = 'gray', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return <span className={cn('badge', `badge-${tone}`, className)}>{children}</span>;
}
