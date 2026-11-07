import type { ReactNode } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { breadcrumbFor } from '../../config/navigation';
import { Button } from '../ui/Button';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** "bill" renders the compact billing bar with a Dashboard back button, like the Entry screens in the video. */
  variant?: 'default' | 'bill';
  shortcuts?: ReactNode;
}

export function PageHeader({ title, subtitle, actions, variant = 'default', shortcuts }: PageHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  // The dashboard is already the root link, so never repeat it as a trailing crumb.
  const crumbs = (breadcrumbFor(location.pathname) ?? []).filter((c) => c.path !== '/');
  const onDashboard = location.pathname === '/';

  if (variant === 'bill') {
    return (
      <div className="no-print billbar flex flex-wrap items-center gap-3 px-3 py-2 sm:px-4">
        <button type="button" onClick={() => navigate('/')} className="btn btn-sm border-white/25 bg-white/10 text-white hover:bg-white/20">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </button>
        <h1 className="min-w-0 truncate text-base font-bold text-white">{title}</h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {shortcuts && <span className="shortcut-text hidden lg:inline">{shortcuts}</span>}
          {actions}
        </div>
      </div>
    );
  }

  return (
    <div className="no-print mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <nav aria-label="Breadcrumb" className="mb-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
          {onDashboard ? (
            <span className="font-semibold text-maroon">Dashboard</span>
          ) : (
            <Link to="/" className="hover:text-navy">Dashboard</Link>
          )}
          {crumbs.map((c, i) => (
            <span key={c.id} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" />
              {i === crumbs.length - 1 ? <span className="font-semibold text-maroon">{c.label}</span> : <span>{c.label}</span>}
            </span>
          ))}
        </nav>
        <h1 className="text-xl font-extrabold tracking-tight text-navy sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export const BackButton = ({ to = '/', label = 'Back' }: { to?: string; label?: string }) => {
  const navigate = useNavigate();
  return (
    <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate(to)}>
      {label}
    </Button>
  );
};
