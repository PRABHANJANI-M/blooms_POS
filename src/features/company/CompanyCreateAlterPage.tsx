import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Save, Building2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Field, SelectInput, TextInput } from '../../components/ui/Field';
import { Panel } from '../../components/ui/Panel';
import { DemoNotice } from '../../components/ui/DemoNotice';
import { Badge } from '../../components/ui/Badge';
import { stateList } from '../../mock-data/parties';
import { useDemoStore } from '../../store/demoStore';
import { useAppStore } from '../../store/appStore';
import type { CompanyProfile } from '../../types';

const businessTypes = ['Retail & Wholesale', 'Food Processing', 'Manufacturing', 'Services', 'Trading', 'Other'];

const schema = z.object({
  name: z.string().trim().min(3, 'Enter the business name'),
  businessType: z.string().min(1, 'Choose a business type'),
  address1: z.string().trim().min(3, 'Enter the address'),
  address2: z.string().trim(),
  city: z.string().trim().min(2, 'Enter the city'),
  state: z.string().min(1),
  pincode: z.string().regex(/^\d{6}$/, 'PIN code must be 6 digits'),
  phone: z.string().regex(/^[0-9+\-\s]{6,15}$/, 'Enter a valid phone number'),
  email: z.string().trim().email('Enter a valid email'),
  gstin: z.string().trim().toUpperCase().refine((v) => v === '' || /^[0-9A-Z]{15}$/.test(v), 'GSTIN must be 15 characters'),
  pan: z.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'PAN format: AAAAA9999A'),
  gstRegistered: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

const NEW = '__new__';

/** Create / alter company: business name, address, contact, GSTIN, PAN and business type. */
export function CompanyCreateAlterPage() {
  const companies = useDemoStore((s) => s.companies);
  const saveCompany = useDemoStore((s) => s.saveCompany);
  const addCompany = useDemoStore((s) => s.addCompany);
  const activeId = useAppStore((s) => s.companyId);
  const toast = useAppStore((s) => s.toast);
  const [selected, setSelected] = useState<string>(activeId);
  const current = companies.find((c) => c.id === selected);

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (selected === NEW) {
      reset({ name: '', businessType: businessTypes[0], address1: '', address2: '', city: '', state: stateList[0], pincode: '', phone: '', email: '', gstin: '', pan: '', gstRegistered: false });
    } else if (current) {
      reset({ name: current.name, businessType: current.businessType, address1: current.address1, address2: current.address2, city: current.city, state: current.state, pincode: current.pincode, phone: current.phone, email: current.email, gstin: current.gstin, pan: current.pan, gstRegistered: current.gstRegistered });
    }
  }, [selected, current, reset]);

  const onSave = handleSubmit((v) => {
    if (selected === NEW) {
      const c: CompanyProfile = { ...v, id: `co-${Date.now()}`, fyStart: '2026-04-01', fyEnd: '2027-03-31' };
      addCompany(c);
      setSelected(c.id);
      toast({ tone: 'success', title: 'Company created (demo)', message: `${c.name} is available under Quit → Change Company.` });
    } else if (current) {
      saveCompany({ ...current, ...v });
      toast({ tone: 'success', title: 'Company updated (demo)', message: 'Saved for this session.' });
    }
  });

  return (
    <>
      <PageHeader title="Company Create / Alter" subtitle="Create a company or change its details." />
      <div className="space-y-4">
        <DemoNotice />
        <Panel bodyClassName="p-3 sm:p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <Field label="Company" htmlFor="company-select">
              <SelectInput id="company-select" value={selected} onChange={(e) => setSelected(e.target.value)}>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}{c.id === activeId ? ' (current)' : ''}</option>)}
                <option value={NEW}>+ Create new company</option>
              </SelectInput>
            </Field>
            {current && selected !== NEW && (
              <div className="flex items-center gap-2 text-sm"><Badge tone="steel">GSTIN {current.gstin || 'not set'}</Badge><Badge tone="maroon">PAN {current.pan || '—'}</Badge></div>
            )}
          </div>
        </Panel>

        <form onSubmit={onSave} noValidate className="grid gap-4 xl:grid-cols-3">
          <Panel title={selected === NEW ? 'New company details' : 'Company information'} icon={<Building2 className="h-4 w-4" />} className="xl:col-span-2" bodyClassName="grid gap-3 sm:grid-cols-2">
            <Field label="Business name" error={errors.name?.message} className="sm:col-span-2"><TextInput error={!!errors.name} {...register('name')} /></Field>
            <Field label="Business type" error={errors.businessType?.message}><SelectInput error={!!errors.businessType} {...register('businessType')}>{businessTypes.map((b) => <option key={b}>{b}</option>)}</SelectInput></Field>
            <Field label="PIN code" error={errors.pincode?.message}><TextInput inputMode="numeric" maxLength={6} error={!!errors.pincode} {...register('pincode')} /></Field>
            <Field label="Address line 1" error={errors.address1?.message} className="sm:col-span-2"><TextInput error={!!errors.address1} {...register('address1')} /></Field>
            <Field label="Address line 2" className="sm:col-span-2"><TextInput {...register('address2')} /></Field>
            <Field label="City" error={errors.city?.message}><TextInput error={!!errors.city} {...register('city')} /></Field>
            <Field label="State" error={errors.state?.message}><SelectInput {...register('state')}>{stateList.map((s) => <option key={s}>{s}</option>)}</SelectInput></Field>
            <Field label="Phone" error={errors.phone?.message}><TextInput error={!!errors.phone} {...register('phone')} /></Field>
            <Field label="Email" error={errors.email?.message}><TextInput type="email" error={!!errors.email} {...register('email')} /></Field>
            <Field label="GSTIN" error={errors.gstin?.message} hint="15 characters, leave blank if not registered"><TextInput error={!!errors.gstin} {...register('gstin')} /></Field>
            <Field label="PAN" error={errors.pan?.message}><TextInput error={!!errors.pan} {...register('pan')} /></Field>
            <label className="flex items-center gap-2 text-sm font-semibold text-navy sm:col-span-2"><input type="checkbox" className="h-4 w-4 accent-fiery" {...register('gstRegistered')} /> Registered under GST</label>
          </Panel>

          <Panel title="Summary" bodyClassName="space-y-3 text-sm">
            <p className="text-slate-600">Changes apply to this company's invoices, reports and GST returns from the next save.</p>
            <p className="text-slate-600">{isDirty ? 'You have unsaved changes.' : 'No unsaved changes.'}</p>
            <div className="flex flex-col gap-2 pt-2">
              <Button type="submit" variant="primary" icon={<Save className="h-4 w-4" />}>{selected === NEW ? 'Create company' : 'Save changes'}</Button>
              <Button variant="outline" icon={<Plus className="h-4 w-4" />} onClick={() => setSelected(NEW)}>New company</Button>
            </div>
          </Panel>
        </form>
      </div>
    </>
  );
}
