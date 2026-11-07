import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Panel } from '../../components/ui/Panel';
import { DemoNotice } from '../../components/ui/DemoNotice';
import { Button } from '../../components/ui/Button';
import { useAppStore } from '../../store/appStore';

/** Logout: confirmation first. Clears the demo session and returns to the sign-in screen. */
export function LogoutPage() {
  const navigate = useNavigate();
  const logout = useAppStore((s) => s.logout);
  const user = useAppStore((s) => s.user);

  return (
    <>
      <PageHeader title="Logout" subtitle="End this demo session." />
      <div className="space-y-4">
        <DemoNotice />
        <Panel title="Signed in" icon={<LogOut className="h-4 w-4" />}>
          <p className="text-sm text-slate-600">You are signed in as <b>{user?.name ?? 'Guest'}</b>. Use Logout to clear this browser session.</p>
          <Button className="mt-4" variant="outline" onClick={() => navigate('/')}>Stay signed in</Button>
        </Panel>
      </div>
      <ConfirmDialog
        open
        title="Log out of Blooms AI?"
        message="Your open screens and unsaved demo entries in this session will be cleared."
        cancelLabel="Cancel"
        confirmLabel="Logout"
        tone="danger"
        onCancel={() => navigate('/')}
        onConfirm={() => { logout(); navigate('/login', { replace: true }); }}
      />
    </>
  );
}
