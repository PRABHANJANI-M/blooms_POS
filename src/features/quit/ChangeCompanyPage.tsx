import { useNavigate } from 'react-router-dom';
import { Building2, Check, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Panel';
import { Badge } from '../../components/ui/Badge';
import { DemoNotice } from '../../components/ui/DemoNotice';
import { useDemoStore } from '../../store/demoStore';
import { useAppStore } from '../../store/appStore';
import { toDisplayDate } from '../../utils/date';
import { cn } from '../../utils/cn';

/** Switch between authorised companies. Alt+F3 opens this screen from anywhere. */
export function ChangeCompanyPage() {
  const companies = useDemoStore((s) => s.companies);
  const companyId = useAppStore((s) => s.companyId);
  const switchCompany = useAppStore((s) => s.switchCompany);
  const toast = useAppStore((s) => s.toast);
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Change Company" subtitle="Choose the company to work in. Its screens and reports reload with that company's data." actions={<span className="badge badge-steel">Shortcut: Alt+F3</span>} />
      <div className="space-y-4">
        <DemoNotice />
        <p className="text-sm text-slate-600">Currently selected: <b className="text-navy">{companies.find((c) => c.id === companyId)?.name}</b></p>
        <div className="grid gap-4 md:grid-cols-2">
          {companies.map((c) => {
            const active = c.id === companyId;
            return (
              <Panel key={c.id} className={cn(active && 'ring-2 ring-fiery')} bodyClassName="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy text-cream"><Building2 className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-navy">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.businessType} · {c.city}</p>
                  </div>
                  {active && <Badge tone="maroon">Current</Badge>}
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div><dt className="font-semibold">GSTIN</dt><dd>{c.gstin || 'Not set'}</dd></div>
                  <div><dt className="font-semibold">Financial year</dt><dd>{toDisplayDate(c.fyStart)} – {toDisplayDate(c.fyEnd)}</dd></div>
                </dl>
                <div className="flex gap-2">
                  <Button variant={active ? 'outline' : 'primary'} disabled={active} icon={<Check className="h-4 w-4" />}
                    onClick={() => { switchCompany(c.id); navigate('/'); }}>
                    {active ? 'Selected' : 'Switch to this company'}
                  </Button>
                  {active && <Button variant="ghost" icon={<RefreshCw className="h-4 w-4" />} onClick={() => toast({ tone: 'info', title: 'Company data refreshed (demo)' })}>Refresh</Button>}
                </div>
              </Panel>
            );
          })}
        </div>
      </div>
    </>
  );
}
