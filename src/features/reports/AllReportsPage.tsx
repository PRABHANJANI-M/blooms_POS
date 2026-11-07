import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { navigation } from '../../config/navigation';
import { Panel } from '../../components/ui/Panel';

/** "All Reports": a directory of every report, grouped as the Reports menu is. */
export function AllReportsPage() {
  const navigate = useNavigate();
  const reports = navigation.find((n) => n.id === 'reports')?.children?.filter((c) => c.path && c.path !== '/reports/all') ?? [];
  return (
    <>
      <PageHeader title="All Reports" subtitle="Choose a report. Every report supports date filters, search, sorting, Excel and PDF export." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {reports.map((r) => (
          <div key={r.id} role="button" tabIndex={0} onClick={() => navigate(r.path!)} onKeyDown={(e) => e.key === 'Enter' && navigate(r.path!)} className="group cursor-pointer">
            <Panel bodyClassName="flex items-center gap-3 p-4 transition group-hover:-translate-y-0.5 group-hover:border-steel">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy text-cream"><r.icon className="h-5 w-5" /></span>
              <span className="min-w-0"><span className="block font-bold text-navy">{r.label}</span><span className="block text-xs text-slate-500">{r.path}</span></span>
            </Panel>
          </div>
        ))}
      </div>
    </>
  );
}
