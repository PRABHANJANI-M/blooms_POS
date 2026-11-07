import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/navigation/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { TaskStrip } from '../components/layout/TaskStrip';
import { Toaster } from '../components/ui/Toaster';
import { useAppStore } from '../store/appStore';
import { breadcrumbFor } from '../config/navigation';
import { useHotkeys } from '../hooks/useHotkeys';
import { DemoBanner } from './DemoBanner';

/** Shell for every signed-in screen: sidebar, top bar, page outlet, open-screen strip and toasts. */
export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const touchTab = useAppStore((s) => s.touchTab);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  useEffect(() => {
    const crumb = breadcrumbFor(location.pathname);
    // Label = the screen's trail without the top-level group, e.g. "Sales › Create", so tabs stay distinct.
    if (crumb && location.pathname !== '/') touchTab(location.pathname, crumb.slice(1).map((c) => c.label).join(' › '));
  }, [location.pathname, touchTab]);

  // Global shortcuts from the brief: Alt+F2 change period, Alt+F3 change company.
  useHotkeys({
    'Alt+F2': () => navigate('/company/change-period'),
    'Alt+F3': () => navigate('/quit/change-company'),
    Escape: () => {
      // Escape returns to the dashboard from billing screens, unless a dialog is open.
      if (!document.querySelector('[data-modal-open]') && location.pathname.startsWith('/entry')) navigate('/');
    },
  });

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-dvh overflow-hidden bg-[#fffaf3]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <DemoBanner />
        <main className="scroll-thin flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-5 sm:py-6" id="main-content">
          <div className="mx-auto w-full max-w-[1400px]">
            <Outlet />
          </div>
        </main>
        <TaskStrip />
      </div>
      <Toaster />
    </div>
  );
}
