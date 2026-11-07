import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export function Panel({ title, icon, actions, children, className, bodyClassName, flush = false }: {
  title?: ReactNode; icon?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string; flush?: boolean;
}) {
  return (
    <section className={cn('panel print-area', className)}>
      {(title || actions) && (
        <header className="panel-header">
          <div className="flex min-w-0 items-center gap-2">
            {icon && <span className="text-steel">{icon}</span>}
            <h2 className="truncate text-sm font-bold text-navy">{title}</h2>
          </div>
          {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(!flush && 'panel-body', bodyClassName)}>{children}</div>
    </section>
  );
}
