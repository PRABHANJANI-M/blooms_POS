import { useState } from 'react';
import { Save, BadgeCheck } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Field, TextInput } from '../../components/ui/Field';
import { Panel } from '../../components/ui/Panel';
import { DemoNotice } from '../../components/ui/DemoNotice';
import { Badge } from '../../components/ui/Badge';
import { useDemoStore } from '../../store/demoStore';
import { useAppStore } from '../../store/appStore';
import { toDisplayDate } from '../../utils/date';

/** Business and GST registration details (demo). Registration numbers are shown exactly as entered. */
export function RegistrationPage() {
  const companyId = useAppStore((s) => s.companyId);
  const company = useDemoStore((s) => s.companies.find((c) => c.id === companyId));
  const toast = useAppStore((s) => s.toast);
  const [reg, setReg] = useState({
    gstRegDate: '2024-07-01', compositionScheme: false, eInvoice: false, eWayBill: false,
    udyam: '', rocNumber: '', shopLicence: '', iec: '',
  });
  const set = <K extends keyof typeof reg>(k: K, v: (typeof reg)[K]) => setReg((r) => ({ ...r, [k]: v }));

  return (
    <>
      <PageHeader title="Registration" subtitle="Business registration and GST configuration for this company." />
      <div className="space-y-4">
        <DemoNotice>Registration numbers are stored only in this session. Verify them with the official portals.</DemoNotice>
        <div className="grid gap-4 xl:grid-cols-3">
          <Panel title="GST registration" icon={<BadgeCheck className="h-4 w-4" />} className="xl:col-span-2" bodyClassName="grid gap-3 sm:grid-cols-2">
            <Field label="GSTIN"><TextInput value={company?.gstin || ''} readOnly placeholder="Not registered" /></Field>
            <Field label="GST registration date" htmlFor="gst-date"><TextInput id="gst-date" type="date" value={reg.gstRegDate} onChange={(e) => set('gstRegDate', e.target.value)} /></Field>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-cream-200 bg-cream-50 px-3 py-2.5 text-sm font-semibold text-navy sm:col-span-2">Composition scheme
              <input type="checkbox" className="h-5 w-5 accent-fiery" checked={reg.compositionScheme} onChange={(e) => set('compositionScheme', e.target.checked)} /></label>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-cream-200 bg-cream-50 px-3 py-2.5 text-sm font-semibold text-navy">e-Invoice enabled
              <input type="checkbox" className="h-5 w-5 accent-fiery" checked={reg.eInvoice} onChange={(e) => set('eInvoice', e.target.checked)} /></label>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-cream-200 bg-cream-50 px-3 py-2.5 text-sm font-semibold text-navy">e-Way Bill enabled
              <input type="checkbox" className="h-5 w-5 accent-fiery" checked={reg.eWayBill} onChange={(e) => set('eWayBill', e.target.checked)} /></label>
            <div className="sm:col-span-2"><Button variant="primary" icon={<Save className="h-4 w-4" />} onClick={() => toast({ tone: 'success', title: 'Registration saved (demo)' })}>Save registration</Button></div>
          </Panel>

          <Panel title="Registration information" bodyClassName="space-y-3">
            <Field label="Udyam number"><TextInput value={reg.udyam} onChange={(e) => set('udyam', e.target.value.toUpperCase())} placeholder="UDYAM-XX-00-0000000" /></Field>
            <Field label="ROC / CIN number"><TextInput value={reg.rocNumber} onChange={(e) => set('rocNumber', e.target.value.toUpperCase())} /></Field>
            <Field label="Shop & Establishment licence"><TextInput value={reg.shopLicence} onChange={(e) => set('shopLicence', e.target.value)} /></Field>
            <Field label="IEC code"><TextInput value={reg.iec} onChange={(e) => set('iec', e.target.value)} /></Field>
            <p className="text-xs text-slate-500">Company: {company?.name} · Registered GST: {company?.gstRegistered ? <Badge tone="green">Yes</Badge> : <Badge tone="gray">No</Badge>} · Since {toDisplayDate(reg.gstRegDate)}</p>
          </Panel>
        </div>
      </div>
    </>
  );
}
