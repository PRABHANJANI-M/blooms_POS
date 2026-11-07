import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg py-10">
      <Panel bodyClassName="flex flex-col items-center gap-3 p-8 text-center">
        <Compass className="h-10 w-10 text-steel" />
        <h1 className="text-xl font-bold text-navy">Page not found</h1>
        <p className="text-sm text-slate-600">This screen does not exist in the menu. Use the sidebar or return to the dashboard.</p>
        <Link to="/"><Button variant="primary">Back to dashboard</Button></Link>
      </Panel>
    </div>
  );
}
