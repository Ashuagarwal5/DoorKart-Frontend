import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'right';
  className?: string;
};

/**
 * A plain, accessible table: real <table> markup, scrolls sideways on narrow screens.
 * It only draws rows it is given; sorting, filtering and paging all happen on the server.
 */
export function DataTable<T>({
  columns,
  rows,
  getKey,
  caption,
  rowClassName,
}: {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T) => string;
  caption: string;
  /** Extra classes for a row, for example to tint one that needs attention. */
  rowClassName?: (row: T) => string | undefined;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-max text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-line bg-bg text-xs font-medium uppercase tracking-wide text-muted">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn('px-4 py-3 font-medium', column.align === 'right' && 'text-right', column.className)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={getKey(row)} className={cn('hover:bg-bg/60', rowClassName?.(row))}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn('px-4 py-3 align-middle', column.align === 'right' && 'text-right', column.className)}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
