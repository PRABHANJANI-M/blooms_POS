import { X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { cn } from '../../utils/cn';

/** Bottom strip of recently opened screens, like the open-window bar in the Entry video. */
export function TaskStrip() {
  const tabs = useAppStore((s) => s.openTabs);
  const closeTab = useAppStore((s) => s.closeTab);
  const location = useLocation();
  const navigate = useNavigate();
  if (!tabs.length) return null;
  return (
    <div className="no-print scroll-thin flex items-center gap-1.5 overflow-x-auto border-t border-navy/30 bg-navy px-2 py-1.5">
      <span className="shrink-0 px-1 text-[.7rem] font-semibold uppercase tracking-wider text-steel-200">Open</span>
      {tabs.map((t) => (
        <div key={t.path} className={cn('flex shrink-0 items-center rounded-md text-xs', location.pathname === t.path ? 'bg-fiery text-white' : 'bg-white/10 text-steel-100')}>
          <button type="button" className="max-w-[12rem] truncate px-2.5 py-1" onClick={() => navigate(t.path)}>{t.label}</button>
          <button type="button" className="px-1.5 py-1 opacity-70 hover:opacity-100" aria-label={`Close ${t.label}`} onClick={() => closeTab(t.path)}>
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
