import { useState, type ReactNode } from 'react';
import { MessageCircle, MessageSquare, Save, Send, Bell, Share2, CalendarClock, Plug } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Panel';
import { Tabs } from '../../components/ui/Tabs';
import { DemoNotice } from '../../components/ui/DemoNotice';
import { Badge } from '../../components/ui/Badge';
import { Field, SelectInput, TextArea, TextInput } from '../../components/ui/Field';
import { DataTable, type Column } from '../../components/tables/DataTable';
import { api } from '../../services/api';
import { useAppStore } from '../../store/appStore';
import { providerConfig, waTemplates, reminderLog } from '../../mock-data/features';

const sample: Record<string, string> = {
  customer: 'Lakshmi Textiles', invoice_no: 'INV-27', amount: '2,450.00', balance: '18,750.50',
  due_date: '30-11-2026', company: 'Blooms Retail', order_no: 'SO-90', challan_no: 'DC-42',
};
const fill = (body: string) => body.replace(/\{\{(\w+)\}\}/g, (m, k: string) => sample[k] ?? m);

const tabs = [
  { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="h-4 w-4" /> },
  { id: 'sms', label: 'SMS', icon: <MessageSquare className="h-4 w-4" /> },
  { id: 'templates', label: 'Message Templates', icon: <Save className="h-4 w-4" /> },
  { id: 'sharing', label: 'Invoice Sharing', icon: <Share2 className="h-4 w-4" /> },
  { id: 'reminders', label: 'Payment Reminders', icon: <CalendarClock className="h-4 w-4" /> },
  { id: 'notifications', label: 'Customer Notifications', icon: <Bell className="h-4 w-4" /> },
];

type ReminderRow = (typeof reminderLog)[number];

/** W/A - SMS: provider setup, templates, invoice sharing, reminders and notifications. Nothing is sent in demo mode. */
export function WhatsAppSmsPage() {
  const [tab, setTab] = useState('whatsapp');
  const toast = useAppStore((s) => s.toast);
  const [wa, setWa] = useState({ ...providerConfig.whatsapp });
  const [sms, setSms] = useState({ ...providerConfig.sms });
  const [templateId, setTemplateId] = useState(waTemplates[0].id);
  const [body, setBody] = useState(waTemplates[0].body);
  const [share, setShare] = useState({ autoAfterSave: false, pdfLink: true, channel: 'WhatsApp' });
  const [reminderDays, setReminderDays] = useState('3');
  const [notify, setNotify] = useState({ orderReceived: true, invoice: true, delivered: false, paymentReceived: true });

  const tryProvider = async (what: 'whatsapp' | 'sms') => {
    try {
      if (what === 'whatsapp') await api.sendWhatsApp();
      else await api.sendSms();
    } catch (e) {
      toast({ tone: 'warning', title: 'Not sent', message: (e as Error).message });
    }
  };

  const reminderCols: Column<ReminderRow>[] = [
    { key: 'customer', header: 'Customer', render: (r) => <span className="font-semibold text-navy">{r.customer}</span> },
    { key: 'channel', header: 'Channel', render: (r) => r.channel },
    { key: 'sentAt', header: 'Last activity', render: (r) => r.sentAt },
    { key: 'state', header: 'State', render: (r) => <Badge tone="amber">{r.state}</Badge> },
    { key: 'act', header: '', render: () => <Button size="sm" variant="outline" icon={<Send className="h-3.5 w-3.5" />} onClick={() => void tryProvider('whatsapp')}>Send now</Button> },
  ];

  return (
    <>
      <PageHeader title="W/A - SMS" subtitle="Share invoices, send reminders and notify customers through WhatsApp or SMS." />
      <div className="space-y-4">
        <DemoNotice>No WhatsApp or SMS message is sent in demo mode. Connect a provider to enable sending.</DemoNotice>
        <Panel bodyClassName="p-0">
          <div className="px-3 pt-2"><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>
          <div className="p-4 sm:p-5">
            {tab === 'whatsapp' && (
              <ProviderCard title="WhatsApp Business provider" status={wa.status}>
                <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
                  <Field label="Provider"><SelectInput value={wa.provider} onChange={(e) => setWa({ ...wa, provider: e.target.value })}><option>Not connected</option><option>Meta Cloud API</option><option>Other BSP</option></SelectInput></Field>
                  <Field label="Phone number ID"><TextInput value={wa.phoneNumberId} onChange={(e) => setWa({ ...wa, phoneNumberId: e.target.value })} placeholder="Enter when connected" /></Field>
                  <Field label="Business account ID" className="sm:col-span-2"><TextInput value={wa.businessAccountId} onChange={(e) => setWa({ ...wa, businessAccountId: e.target.value })} placeholder="Enter when connected" /></Field>
                </div>
                <ProviderActions onSave={() => toast({ tone: 'success', title: 'WhatsApp settings saved (demo)' })} onTest={() => void tryProvider('whatsapp')} />
              </ProviderCard>
            )}

            {tab === 'sms' && (
              <ProviderCard title="SMS gateway" status={sms.status}>
                <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
                  <Field label="Provider"><SelectInput value={sms.provider} onChange={(e) => setSms({ ...sms, provider: e.target.value })}><option>Not connected</option><option>DLT-registered gateway</option></SelectInput></Field>
                  <Field label="Sender ID" hint="6 characters, DLT approved"><TextInput value={sms.senderId} maxLength={6} onChange={(e) => setSms({ ...sms, senderId: e.target.value.toUpperCase() })} placeholder="e.g. BLOOMS" /></Field>
                  <Field label="DLT template ID" className="sm:col-span-2"><TextInput value={sms.templateRegisteredId} onChange={(e) => setSms({ ...sms, templateRegisteredId: e.target.value })} placeholder="Enter when approved" /></Field>
                </div>
                <ProviderActions onSave={() => toast({ tone: 'success', title: 'SMS settings saved (demo)' })} onTest={() => void tryProvider('sms')} />
              </ProviderCard>
            )}

            {tab === 'templates' && (
              <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
                <ul className="space-y-2">
                  {waTemplates.map((t) => (
                    <li key={t.id}>
                      <button type="button" onClick={() => { setTemplateId(t.id); setBody(t.body); }}
                        className={`w-full rounded-lg border p-3 text-left text-sm transition ${templateId === t.id ? 'border-fiery bg-white shadow-panel' : 'border-cream-200 bg-cream-50 hover:border-steel'}`}>
                        <span className="block font-bold text-navy">{t.name}</span>
                        <span className="text-xs text-slate-500">{t.channel}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="space-y-3">
                  <Field label="Message body" hint="Placeholders such as {{customer}} are filled in when sent.">
                    <TextArea rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
                  </Field>
                  <div className="rounded-lg bg-cream-50 p-3 text-sm"><p className="section-title mb-1">Preview</p><p className="text-slate-700">{fill(body)}</p></div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="primary" icon={<Save className="h-4 w-4" />} onClick={() => toast({ tone: 'success', title: 'Template saved (demo)' })}>Save template</Button>
                    <Button variant="outline" onClick={() => setBody(waTemplates.find((t) => t.id === templateId)?.body ?? body)}>Reset</Button>
                  </div>
                </div>
              </div>
            )}

            {tab === 'sharing' && (
              <div className="grid max-w-3xl gap-3">
                <Toggle label="Send automatically after saving a bill" checked={share.autoAfterSave} onChange={(v) => setShare({ ...share, autoAfterSave: v })} />
                <Toggle label="Attach a PDF link to the message" checked={share.pdfLink} onChange={(v) => setShare({ ...share, pdfLink: v })} />
                <Field label="Default channel"><SelectInput value={share.channel} onChange={(e) => setShare({ ...share, channel: e.target.value })}><option>WhatsApp</option><option>SMS</option></SelectInput></Field>
                <p className="text-xs text-slate-500">Sharing is recorded as a draft only until a provider is connected.</p>
              </div>
            )}

            {tab === 'reminders' && (
              <div className="space-y-4">
                <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
                  <Field label="Remind customers before due date (days)"><TextInput type="number" min={0} numeric value={reminderDays} onChange={(e) => setReminderDays(e.target.value)} /></Field>
                  <Field label="Send time"><TextInput type="time" defaultValue="10:00" /></Field>
                </div>
                <DataTable columns={reminderCols} rows={reminderLog} rowKey={(r) => r.id} emptyTitle="No reminders queued" />
              </div>
            )}

            {tab === 'notifications' && (
              <div className="grid max-w-3xl gap-3">
                <Toggle label="Order received" checked={notify.orderReceived} onChange={(v) => setNotify({ ...notify, orderReceived: v })} />
                <Toggle label="Invoice generated" checked={notify.invoice} onChange={(v) => setNotify({ ...notify, invoice: v })} />
                <Toggle label="Delivery dispatched" checked={notify.delivered} onChange={(v) => setNotify({ ...notify, delivered: v })} />
                <Toggle label="Payment received" checked={notify.paymentReceived} onChange={(v) => setNotify({ ...notify, paymentReceived: v })} />
              </div>
            )}

            <p className="mt-6 flex items-center gap-2 text-xs text-slate-500"><Plug className="h-3.5 w-3.5" /> Provider settings are kept only in this session until a backend is connected.</p>
          </div>
        </Panel>
      </div>
    </>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-cream-200 bg-cream-50 px-3 py-2.5 text-sm font-semibold text-navy">
      {label}
      <input type="checkbox" className="h-5 w-5 accent-fiery" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function ProviderCard({ title, status, children }: { title: string; status: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-navy">{title}</h3>
        <Badge tone="red">{status}</Badge>
      </div>
      {children}
    </div>
  );
}

function ProviderActions({ onSave, onTest }: { onSave: () => void; onTest: () => void }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Button variant="primary" icon={<Save className="h-4 w-4" />} onClick={onSave}>Save configuration</Button>
      <Button variant="outline" icon={<Send className="h-4 w-4" />} onClick={onTest}>Send test message</Button>
    </div>
  );
}
