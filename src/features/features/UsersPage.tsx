import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Power, UserCircle2, ShieldCheck, Save } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Field, SelectInput, TextInput } from '../../components/ui/Field';
import { Panel } from '../../components/ui/Panel';
import { Tabs } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Badge';
import { DemoNotice } from '../../components/ui/DemoNotice';
import { DataTable, type Column } from '../../components/tables/DataTable';
import { useDemoStore } from '../../store/demoStore';
import { useAppStore } from '../../store/appStore';
import { permissionModules } from '../../mock-data/company';
import type { UserAccount } from '../../types';
import { initials } from '../../utils/format';

const roles: UserAccount['role'][] = ['Owner', 'Manager', 'Cashier', 'Accountant', 'Staff'];

const userSchema = z.object({
  name: z.string().trim().min(2, 'Enter the full name'),
  username: z.string().trim().min(3, 'At least 3 characters').regex(/^[a-z0-9._]+$/i, 'Letters, numbers, dot or underscore only'),
  email: z.string().trim().email('Enter a valid email'),
  phone: z.string().trim().regex(/^\d{10}$/, 'Mobile must be 10 digits'),
  role: z.enum(['Owner', 'Manager', 'Cashier', 'Accountant', 'Staff']),
});
type UserForm = z.infer<typeof userSchema>;

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name'),
  email: z.string().trim().email('Enter a valid email'),
  phone: z.string().trim().regex(/^\d{10}$/, 'Mobile must be 10 digits'),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine((v) => !v.newPassword || v.newPassword.length >= 8, { message: 'Password needs 8+ characters', path: ['newPassword'] })
  .refine((v) => (v.newPassword ?? '') === (v.confirmPassword ?? ''), { message: 'Passwords do not match', path: ['confirmPassword'] });
type ProfileForm = z.infer<typeof profileSchema>;

/** Users: list, create, edit, activate or deactivate, role & permission matrix, and own profile. */
export function UsersPage() {
  const [tab, setTab] = useState('users');
  return (
    <>
      <PageHeader title="User" subtitle="Accounts, roles and permissions for this company." />
      <div className="space-y-4">
        <DemoNotice>Login is demo only. No passwords are stored or checked by this frontend.</DemoNotice>
        <Panel bodyClassName="p-0">
          <div className="px-3 pt-2">
            <Tabs active={tab} onChange={setTab} tabs={[
              { id: 'users', label: 'Users', icon: <UserCircle2 className="h-4 w-4" /> },
              { id: 'roles', label: 'Roles & Permissions', icon: <ShieldCheck className="h-4 w-4" /> },
              { id: 'profile', label: 'My Profile', icon: <UserCircle2 className="h-4 w-4" /> },
            ]} />
          </div>
          <div className="p-4">
            {tab === 'users' && <UserList />}
            {tab === 'roles' && <RoleMatrix />}
            {tab === 'profile' && <ProfileForm />}
          </div>
        </Panel>
      </div>
    </>
  );
}

function UserList() {
  const users = useDemoStore((s) => s.users);
  const save = useDemoStore((s) => s.saveUser);
  const toast = useAppStore((s) => s.toast);
  const [editing, setEditing] = useState<UserAccount | 'new' | null>(null);

  const columns: Column<UserAccount>[] = [
    { key: 'name', header: 'Name', sortValue: (u) => u.name, render: (u) => (
      <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-steel text-xs font-bold text-white">{initials(u.name)}</span><span><span className="block font-semibold text-navy">{u.name}</span><span className="block text-xs text-slate-500">{u.username}</span></span></div>
    ) },
    { key: 'role', header: 'Role', render: (u) => <Badge tone="maroon">{u.role}</Badge> },
    { key: 'phone', header: 'Mobile', render: (u) => u.phone },
    { key: 'last', header: 'Last login', render: (u) => u.lastLogin },
    { key: 'status', header: 'Status', render: (u) => <Badge tone={u.active ? 'green' : 'gray'}>{u.active ? 'Active' : 'Inactive'}</Badge> },
    { key: 'act', header: '', render: (u) => (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(u)}>Edit</Button>
        <Button size="sm" variant="ghost" icon={<Power className="h-4 w-4" />} onClick={() => { save({ ...u, active: !u.active }); toast({ tone: 'success', title: u.active ? `${u.name} deactivated` : `${u.name} activated` }); }}>{u.active ? 'Deactivate' : 'Activate'}</Button>
      </div>
    ) },
  ];

  return (
    <>
      <div className="mb-3 flex justify-end"><Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>New user</Button></div>
      <DataTable columns={columns} rows={users} rowKey={(u) => u.id} emptyTitle="No users yet" />
      {editing && <UserDialog user={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSave={(u) => { save(u); setEditing(null); toast({ tone: 'success', title: editing === 'new' ? 'User created (demo)' : 'User updated (demo)', message: u.name }); }} />}
    </>
  );
}

function UserDialog({ user, onClose, onSave }: { user: UserAccount | null; onClose: () => void; onSave: (u: UserAccount) => void }) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: user ? { name: user.name, username: user.username, email: user.email, phone: user.phone, role: user.role } : { name: '', username: '', email: '', phone: '', role: 'Staff' },
  });
  const submit = handleSubmit((v) => onSave({
    id: user?.id ?? `u-${Date.now()}`, ...v, active: user?.active ?? true, lastLogin: user?.lastLogin ?? 'Never',
  }));
  return (
    <Modal open onClose={onClose} title={user ? `Edit ${user.name}` : 'New user'} width="max-w-xl"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => void submit()}>Save user</Button></>}>
      <form className="grid gap-3 sm:grid-cols-2" noValidate onSubmit={submit}>
        <Field label="Full name" error={errors.name?.message}><TextInput error={!!errors.name} {...register('name')} /></Field>
        <Field label="Username" error={errors.username?.message}><TextInput error={!!errors.username} {...register('username')} /></Field>
        <Field label="Email" error={errors.email?.message}><TextInput type="email" error={!!errors.email} {...register('email')} /></Field>
        <Field label="Mobile" error={errors.phone?.message}><TextInput inputMode="numeric" maxLength={10} error={!!errors.phone} {...register('phone')} /></Field>
        <Field label="Role" className="sm:col-span-2">
          <Controller control={control} name="role" render={({ field }) => (
            <SelectInput value={field.value} onChange={field.onChange}>{roles.map((r) => <option key={r}>{r}</option>)}</SelectInput>
          )} />
        </Field>
      </form>
    </Modal>
  );
}

function RoleMatrix() {
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>(() =>
    Object.fromEntries(roles.map((r) => [r, Object.fromEntries(permissionModules.map((m) => [m, r === 'Owner' || (r === 'Manager' && m !== 'Backup') || (r === 'Accountant' && ['Reports', 'Accounts'].includes(m)) || (r === 'Cashier' && ['Sales'].includes(m)) || (r === 'Staff' && ['Sales', 'Stock'].includes(m))]))])),
  );
  const toast = useAppStore((s) => s.toast);
  const toggle = (role: string, mod: string) => setMatrix((m) => ({ ...m, [role]: { ...m[role], [mod]: !m[role][mod] } }));
  const rows = useMemo(() => permissionModules.map((m) => m), []);
  return (
    <>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Module</th>{roles.map((r) => <th key={r} className="num">{r}</th>)}</tr></thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m}>
                <td className="font-semibold text-navy">{m}</td>
                {roles.map((r) => (
                  <td key={r} className="num">
                    <input type="checkbox" className="h-4 w-4 accent-fiery" checked={matrix[r][m]} disabled={r === 'Owner'} onChange={() => toggle(r, m)} aria-label={`${r} can access ${m}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">Owner always has full access. Permissions are not enforced until a backend is connected.</p>
        <Button variant="primary" icon={<Save className="h-4 w-4" />} onClick={() => toast({ tone: 'success', title: 'Role permissions saved (demo)' })}>Save permissions</Button>
      </div>
    </>
  );
}

function ProfileForm() {
  const user = useAppStore((s) => s.user);
  const toast = useAppStore((s) => s.toast);
  const save = useDemoStore((s) => s.saveUser);
  const { register, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '', phone: user?.phone ?? '', newPassword: '', confirmPassword: '' },
  });
  const onSubmit = handleSubmit((v) => {
    if (user) save({ ...user, name: v.name, email: v.email, phone: v.phone });
    toast({ tone: 'success', title: 'Profile saved (demo)', message: v.newPassword ? 'Password change is not stored in demo mode.' : undefined });
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid max-w-3xl gap-3 sm:grid-cols-2">
      <Field label="Full name" error={errors.name?.message}><TextInput error={!!errors.name} {...register('name')} /></Field>
      <Field label="Email" error={errors.email?.message}><TextInput type="email" error={!!errors.email} {...register('email')} /></Field>
      <Field label="Mobile" error={errors.phone?.message}><TextInput inputMode="numeric" maxLength={10} error={!!errors.phone} {...register('phone')} /></Field>
      <Field label="Role"><TextInput value={user?.role ?? ''} readOnly /></Field>
      <Field label="New password" error={errors.newPassword?.message} hint="Leave blank to keep the current password"><TextInput type="password" error={!!errors.newPassword} {...register('newPassword')} /></Field>
      <Field label="Confirm password" error={errors.confirmPassword?.message}><TextInput type="password" error={!!errors.confirmPassword} {...register('confirmPassword')} /></Field>
      <div className="sm:col-span-2"><Button type="submit" variant="primary" icon={<Save className="h-4 w-4" />}>Save profile</Button></div>
    </form>
  );
}
