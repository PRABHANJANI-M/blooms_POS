import { useAppStore } from '../store/appStore';

/** Thin, always-visible reminder that this build runs on demo data. */
export function DemoBanner() {
  const user = useAppStore((s) => s.user);
  return (
    <div className="no-print flex items-center justify-center gap-2 bg-maroon px-3 py-1 text-center text-[.7rem] font-semibold tracking-wide text-cream">
      DEMO MODE · sample data only · no real payments, messages, backups or database writes
      {user && <span className="hidden opacity-75 sm:inline">· signed in as {user.username}</span>}
    </div>
  );
}
