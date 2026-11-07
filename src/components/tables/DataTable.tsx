import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { EmptyState, LoadingRows } from '../ui/EmptyState';
import { cn } from '../../utils/cn';

export interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  render?: (row: T) => ReactNode;
  /** Value used for sorting; omit to disable sorting on this column. */
  sortValue?: (row: T) => string | number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  pageSize?: number;
  footer?: ReactNode;
  onRowDoubleClick?: (row: T) => void;
  selectedKey?: string | null;
  onRowClick?: (row: T) => void;
  caption?: string;
}

/** Sortable, paginated table with loading and empty states. Scrolls horizontally on small screens. */
export function DataTable<T>({
  columns, rows, rowKey, loading, emptyTitle = 'No records found', emptyMessage, pageSize = 10, footer,
  onRowDoubleClick, onRowClick, selectedKey, caption,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'en-IN', { numeric: true });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key: string) => {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
    setPage(1);
  };

  if (loading) return <LoadingRows />;

  return (
    <div>
      <div className="table-wrap scroll-thin max-h-[62vh] overflow-auto">
        <table className="data-table" aria-label={caption}>
          <thead>
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th key={c.key} className={cn(c.align === 'right' && 'num')} scope="col">
                    {c.sortValue ? (
                      <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-cream">
                        {c.header}
                        {active ? (sort?.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-50" />}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="!whitespace-normal">
                  <EmptyState title={emptyTitle} message={emptyMessage} />
                </td>
              </tr>
            ) : (
              visible.map((row) => {
                const key = rowKey(row);
                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(row) : undefined}
                    className={cn((onRowClick || onRowDoubleClick) && 'cursor-pointer', selectedKey === key && '[&>td]:!bg-steel-200')}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={cn(c.align === 'right' && 'num')}>
                        {c.render ? c.render(row) : (row as unknown as Record<string, ReactNode>)[c.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
          {footer && <tfoot>{footer}</tfoot>}
        </table>
      </div>
      {sorted.length > pageSize && (
        <div className="no-print flex flex-wrap items-center justify-between gap-2 border-t border-cream-200 px-3 py-2 text-xs text-slate-600">
          <span>
            Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button type="button" className="btn btn-outline btn-sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Prev</button>
            <span className="px-2 font-semibold text-navy">Page {safePage} / {pageCount}</span>
            <button type="button" className="btn btn-outline btn-sm" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
