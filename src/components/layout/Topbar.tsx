import { useEffect, useState } from 'react';
import { Menu, Building2, Clock, UserCircle2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { useDemoStore } from '../../store/demoStore';
import { Button } from '../ui/Button';
import { breadcrumbFor } from '../../config/navigation';
import { displayTime, toDisplayDate } from '../../utils/date';

export function Topbar() {
  const setMobileOpen = useAppStore((s) => s.setMobileNavOpen);
  const companyId = useAppStore((s) => s.companyId);
  const periodFrom = useAppStore((s) => s.periodFrom);
  const periodTo = useAppStore((s) => s.periodTo);
  const user = useAppStore((s) => s.user);
  const companies = useDemoStore((s) => s.companies);
  const navigate = useNavigate();
  const location = useLocation();
  const [now, setNow] = useState(displayTime());
  const crumbs = breadcrumbFor(location.pathname) ?? [];
  const company = companies.find((c) => c.id === companyId);

  useEffect(() => {
    const t = setInterval(() => setNow(displayTime()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="no-print flex items-center gap-3 border-b border-[#e3d6bd] bg-white/80 px-3 py-2.5 backdrop-blur sm:px-5">
      <button type="button" className="btn btn-outline btn-icon md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
        <Menu className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-slate-500">
          {crumbs.length ? crumbs.map((c) => c.label).join(' › ') : 'Blooms AI'}
        </p>
        <p className="truncate text-sm font-bold text-navy">{company?.name ?? 'No company selected'}</p>
      </div>
      <div className="hidden items-center gap-1.5 rounded-full border border-steel-200 bg-steel-100 px-3 py-1 text-xs font-semibold text-navy lg:flex" title="Accounting period (Alt+F2)">
        <Clock className="h-3.5 w-3.5 text-steel" />
        {toDisplayDate(periodFrom)} – {toDisplayDate(periodTo)}
      </div>
      <Button size="sm" variant="outline" icon={<Building2 className="h-4 w-4" />} className="hidden sm:inline-flex" onClick={() => navigate('/quit/change-company')}>
        Change Company <span className="kbd ml-1">Alt+F3</span>
      </Button>
      <span className="hidden text-xs text-slate-500 xl:inline">{now}</span>
      <button type="button" onClick={() => navigate('/features/users')} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-steel-100" title="User profile">
        <UserCircle2 className="h-6 w-6 text-navy" />
        <span className="hidden text-sm font-semibold text-navy md:inline">{user?.name ?? 'Guest'}</span>
      </button>
    </header>
  );
}
