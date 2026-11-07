import { useState, type ReactNode } from 'react';
import { Building, FileText, Percent, CreditCard, SlidersHorizontal, Cog, Save, RotateCcw } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Panel';
import { Tabs } from '../../components/ui/Tabs';
import { DemoNotice } from '../../components/ui/DemoNotice';
import { TextInput, SelectInput } from '../../components/ui/Field';
import { settingsDefaults } from '../../mock-data/features';
import { useAppStore } from '../../store/appStore';
import { parseNum } from '../../utils/money';

type Section = keyof typeof settingsDefaults;
type Value = string | number | boolean;

const sectionMeta: { id: Section; label: string; icon: ReactNode; hint: string }[] = [
  { id: 'company', label: 'Company', icon: <Building className="h-4 w-4" />, hint: 'How your company name appears on screens and bills.' },
  { id: 'invoice', label: 'Invoice', icon: <FileText className="h-4 w-4" />, hint: 'Paper size and what prints on invoices.' },
  { id: 'gst', label: 'GST & Tax', icon: <Percent className="h-4 w-4" />, hint: 'Default GST and how prices include tax.' },
  { id: 'payment', label: 'Payment', icon: <CreditCard className="h-4 w-4" />, hint: 'Payment methods offered at the counter.' },
  { id: 'preferences', label: 'Preferences', icon: <SlidersHorizontal className="h-4 w-4" />, hint: 'Display and formatting preferences.' },
  { id: 'general', label: 'General', icon: <Cog className="h-4 w-4" />, hint: 'Time zone, language and automatic backups.' },
];

const humanize = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

/** Company, invoice, GST, payment, preferences and general settings. Demo: changes stay on this screen. */
export function SettingsPage() {
  const toast = useAppStore((s) => s.toast);
  const [tab, setTab] = useState<Section>('company');
  const [values, setValues] = useState(() => structuredClone(settingsDefaults));
  const meta = sectionMeta.find((m) => m.id === tab) ?? sectionMeta[0];
  const current = values[tab] as Record<string, Value>;
  const setField = (key: string, v: Value) => setValues((s) => ({ ...s, [tab]: { ...s[tab], [key]: v } }));

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Preferences that control how this company's screens and documents behave."
        actions={
          <>
            <Button variant="outline" icon={<RotateCcw className="h-4 w-4" />} onClick={() => { setValues(structuredClone(settingsDefaults)); toast({ tone: 'info', title: 'Defaults restored' }); }}>Reset to defaults</Button>
            <Button variant="primary" icon={<Save className="h-4 w-4" />} onClick={() => toast({ tone: 'success', title: `${meta.label} settings saved (demo)`, message: 'Not stored permanently in demo mode.' })}>Save {meta.label}</Button>
          </>
        }
      />
      <div className="space-y-4">
        <DemoNotice />
        <Panel bodyClassName="p-0">
          <div className="px-3 pt-2">
            <Tabs active={tab} onChange={(id) => setTab(id as Section)} tabs={sectionMeta.map((m) => ({ id: m.id, label: m.label, icon: m.icon }))} />
          </div>
          <div className="p-4 sm:p-5">
            <p className="mb-4 text-sm text-slate-600">{meta.hint}</p>
            <div className="grid max-w-4xl gap-4 sm:grid-cols-2">
              {Object.entries(current).map(([key, v]) =>
                typeof v === 'boolean' ? (
                  <label key={key} className="flex items-center justify-between gap-3 rounded-lg border border-cream-200 bg-cream-50 px-3 py-2.5 sm:col-span-2">
                    <span className="text-sm font-semibold text-navy">{humanize(key)}</span>
                    <input type="checkbox" className="h-5 w-5 accent-fiery" checked={v} onChange={(e) => setField(key, e.target.checked)} />
                  </label>
                ) : (
                  <label key={key} className="block">
                    <span className="label">{humanize(key)}</span>
                    {typeof v === 'number' ? (
                      <TextInput type="number" min={0} numeric value={v} onChange={(e) => setField(key, Math.max(0, parseNum(e.target.value)))} />
                    ) : (
                      <TextInput value={v} onChange={(e) => setField(key, e.target.value)} />
                    )}
                  </label>
                ),
              )}
            </div>
            {tab === 'invoice' && (
              <div className="mt-4 max-w-xs">
                <span className="label">Paper size</span>
                <SelectInput value={String(current.paperSize)} onChange={(e) => setField('paperSize', e.target.value)}>
                  <option>A4</option><option>A5</option><option>Thermal 80mm</option>
                </SelectInput>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
