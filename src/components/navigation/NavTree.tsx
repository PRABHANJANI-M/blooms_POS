import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronRight, FileText } from 'lucide-react';
import type { NavNode } from '../../config/navigation';
import { ancestorIds } from '../../config/navigation';
import { cn } from '../../utils/cn';
import { useAppStore } from '../../store/appStore';

/** Colours cycle through the palette so sub-menu icons are coloured but on-brand. */
const iconTones = ['text-steel', 'text-cream', 'text-[#ff8a94]', 'text-[#9bbfd1]'] as const;

interface NavTreeProps {
  nodes: NavNode[];
  depth: number;
  collapsedRail: boolean;
  onNavigate?: () => void;
}

/**
 * Reusable recursive menu used by every sidebar section.
 * Top-level parents use `.nav-parent`; nested rows use `.nav-sub` with depth-based indent.
 */
export function NavTree({ nodes, depth, collapsedRail, onNavigate }: NavTreeProps) {
  return (
    <>
      {nodes.map((node) =>
        node.children ? (
          <NavGroup key={node.id} node={node} depth={depth} collapsedRail={collapsedRail} onNavigate={onNavigate} />
        ) : (
          <NavLeaf key={node.id} node={node} depth={depth} collapsedRail={collapsedRail} onNavigate={onNavigate} />
        ),
      )}
    </>
  );
}
function NavLeaf({ node, depth, collapsedRail, onNavigate }: { node: NavNode; depth: number } & Omit<NavTreeProps, 'nodes' | 'depth'>) {
  const Icon = node.icon;
  const tone = iconTones[depth % iconTones.length];
  if (depth === 0) {
    return (
      <NavLink
        to={node.path ?? '/'}
        end={node.path === '/'}
        onClick={onNavigate}
        title={node.label}
        className={({ isActive }) => cn('nav-parent', isActive && 'is-active', collapsedRail && 'justify-center px-0')}
      >
        <Icon className="h-5 w-5 shrink-0" aria-hidden />
        <span className={cn('truncate', collapsedRail && 'sr-only')}>{node.label}</span>
      </NavLink>
    );
  }
  return (
    <NavLink
      to={node.path ?? '/'}
      onClick={onNavigate}
      title={node.label}
      style={{ paddingLeft: `${1.6 + (depth - 1) * 0.9}rem` }}
      className={({ isActive }) => cn('nav-sub', isActive && 'is-active', collapsedRail && 'sr-only')}
    >
      <Icon className={cn('nav-sub-icon', tone)} aria-hidden />
      <span className="truncate">{node.label}</span>
    </NavLink>
  );
}

function NavGroup({ node, depth, collapsedRail, onNavigate }: { node: NavNode; depth: number } & Omit<NavTreeProps, 'nodes' | 'depth'>) {
  const location = useLocation();
  const Icon = node.icon;
  const inActiveBranch = ancestorIds(location.pathname).includes(node.id);
  const [open, setOpen] = useState(inActiveBranch);
  const expanded = open;
  const tone = iconTones[depth % iconTones.length];
  const railCollapsedState = useAppStore((s) => s.railCollapsed);
  const toggleRail = useAppStore((s) => s.toggleRail);

  const onClick = () => {
    // In icon-rail mode a parent click restores the full sidebar and opens that branch.
    if (railCollapsedState && depth === 0) {
      toggleRail();
      setOpen(true);
      return;
    }
    setOpen((v) => !v);
  };

  if (depth === 0) {
    return (
      <div>
        <button
          type="button"
          onClick={onClick}
          aria-expanded={expanded}
          title={node.label}
          className={cn('nav-parent', expanded && 'is-open', !expanded && inActiveBranch && 'is-active', collapsedRail && 'justify-center px-0')}
        >
          <Icon className="h-5 w-5 shrink-0" aria-hidden />
          <span className={cn('truncate', collapsedRail && 'sr-only')}>{node.label}</span>
          {!collapsedRail && <ChevronRight className="nav-arrow h-4 w-4 shrink-0" aria-hidden />}
        </button>
        {expanded && !collapsedRail && (
          <div className="mb-1 mt-1 overflow-hidden rounded-md bg-navy-800/60">
            <NavTree nodes={node.children ?? []} depth={depth + 1} collapsedRail={collapsedRail} onNavigate={onNavigate} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={expanded}
        style={{ paddingLeft: `${1.6 + (depth - 1) * 0.9}rem` }}
        className={cn('nav-sub font-semibold', expanded && 'text-cream')}
      >
        <FileText className={cn('nav-sub-icon', tone)} aria-hidden />
        <span className="truncate">{node.label}</span>
        <ChevronRight className={cn('ml-auto h-3.5 w-3.5 transition-transform', expanded && 'rotate-90')} aria-hidden />
      </button>
      {expanded && <NavTree nodes={node.children ?? []} depth={depth + 1} collapsedRail={collapsedRail} onNavigate={onNavigate} />}
    </div>
  );
}
