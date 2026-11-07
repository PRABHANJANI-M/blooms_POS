import { ChevronsLeft, ChevronsRight, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { navigation } from '../../config/navigation';
import { useAppStore } from '../../store/appStore';
import { useDemoStore } from '../../store/demoStore';
import { cn } from '../../utils/cn';
import { initials } from '../../utils/format';
import { NavTree } from './NavTree';

/**
 * The one sidebar used everywhere.
 * Desktop: full width. Tablet: collapsible rail (toggle). Mobile: slide-in drawer.
 */
export function Sidebar() {
  const rail = useAppStore((s) => s.railCollapsed);
  const toggleRail = useAppStore((s) => s.toggleRail);
  const mobileOpen = useAppStore((s) => s.mobileNavOpen);
  const setMobileOpen = useAppStore((s) => s.setMobileNavOpen);
  const user = useAppStore((s) => s.user);
  const companyId = useAppStore((s) => s.companyId);
  const companies = useDemoStore((s) => s.companies);
  const company = companies.find((c) => c.id === companyId);
  const navigate = useNavigate();

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-navy/50 md:hidden" onClick={closeMobile} aria-hidden />}
      <aside
        aria-label="Main navigation"
        className={cn(
          'no-print fixed inset-y-0 left-0 z-50 flex h-dvh flex-col bg-navy text-white shadow-pop transition-[width,transform] duration-200',
          'w-[17.5rem] md:static md:z-auto md:shrink-0 md:translate-x-0 md:shadow-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          rail && 'md:w-[4.75rem]',
          !rail && 'xl:w-[17.5rem]',
        )}
      >
        <div className={cn('flex items-center gap-3 border-b border-white/10 px-4 py-4', rail && 'md:justify-center md:px-2')}>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-fiery font-black text-cream">B</div>
          <div className={cn('min-w-0', rail && 'md:hidden')}>
            <p className="truncate text-base font-extrabold tracking-tight">Blooms AI</p>
            <p className="truncate text-[.7rem] text-steel-200">{company?.name ?? 'Select company'}</p>
          </div>
        </div>

        <nav className="scroll-thin flex-1 space-y-1.5 overflow-y-auto p-2.5" aria-label="Sections">
          <NavTree nodes={navigation} depth={0} collapsedRail={rail} onNavigate={closeMobile} />
        </nav>

        <div className={cn('border-t border-white/10 p-3', rail && 'md:p-2')}>
          <div className={cn('flex items-center gap-3', rail && 'md:justify-center')}>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-steel text-sm font-bold text-navy">{initials(user?.name ?? 'Guest')}</div>
            <div className={cn('min-w-0 flex-1', rail && 'md:hidden')}>
              <p className="truncate text-sm font-semibold">{user?.name ?? 'Guest'}</p>
              <p className="truncate text-[.7rem] text-steel-200">{user?.role ?? 'Demo session'}</p>
            </div>
            <button
              type="button"
              className={cn('btn btn-steel btn-sm btn-icon hidden md:inline-flex', rail && 'md:hidden')}
              onClick={() => navigate('/quit/logout')}
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={toggleRail}
            className="mt-3 hidden w-full items-center justify-center gap-2 rounded-md border border-white/15 py-1.5 text-xs font-semibold text-steel-200 hover:bg-white/10 md:flex"
            aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {rail ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Collapse menu</>}
          </button>
        </div>
      </aside>
    </>
  );
}
