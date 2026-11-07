import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldAlert } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { Button } from '../../components/ui/Button';
import { Field, TextInput } from '../../components/ui/Field';
import { users } from '../../mock-data/company';

const schema = z.object({
  username: z.string().trim().min(1, 'Enter a username'),
  password: z.string().min(1, 'Enter any password (demo mode)'),
});
type LoginForm = z.infer<typeof schema>;

export function LoginPage() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const login = useAppStore((s) => s.login);
  const toast = useAppStore((s) => s.toast);
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { username: 'admin', password: 'demo' },
  });

  if (isAuthenticated) return <Navigate to="/" replace />;

  const onSubmit = async (values: LoginForm) => {
    await new Promise((r) => setTimeout(r, 400));
    if (!login(values.username)) {
      setServerError('No active demo user with that username. Try "admin".');
      return;
    }
    setServerError(null);
    toast({ tone: 'success', title: 'Signed in (demo)', message: 'No real authentication is connected yet.' });
    navigate('/', { replace: true });
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-gradient-to-br from-navy via-navy-700 to-steel/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-cream p-6 shadow-pop sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-fiery text-xl font-black text-cream">B</div>
          <div>
            <h1 className="text-xl font-extrabold text-navy">Blooms AI</h1>
            <p className="text-xs text-maroon">Billing & business management</p>
          </div>
        </div>

        <div className="mb-5 flex gap-2 rounded-lg border border-maroon/25 bg-white/70 p-3 text-xs text-maroon">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p><b>Demo mode.</b> This sign-in does not check passwords or connect to a real account. Demo users: {users.map((u) => u.username).join(', ')}.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field label="Username" error={errors.username?.message ?? serverError ?? undefined} htmlFor="username">
            <TextInput id="username" autoComplete="username" error={!!errors.username || !!serverError} {...register('username')} />
          </Field>
          <Field label="Password" error={errors.password?.message} htmlFor="password">
            <TextInput id="password" type="password" autoComplete="current-password" error={!!errors.password} {...register('password')} />
          </Field>
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={isSubmitting}>Sign in (demo)</Button>
        </form>
      </div>
    </div>
  );
}
