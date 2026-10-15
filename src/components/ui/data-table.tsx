import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'right';
  className?: string;
  /** Left out of the phone card, for a column that only repeats the card's own link. */
  hideOnCard?: boolean;
};

/**
 * A plain, accessible table: real <table> markup on tablets and desktops, and one card per
 * row on phones, so nothing needs sideways scrolling. The first column is the card's title,
 * the rest are label/value pairs. It only draws rows it is given; sorting, filtering and
 * paging all happen on the server.
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
  const [titleColumn, ...otherColumns] = columns;
  const detailColumns = otherColumns.filter((column) => !column.hideOnCard && column.key !== 'actions');

  const actions = columns.find(column => column.key === 'actions');

  return (
    <>
      <ul aria-label={caption} className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li
            key={getKey(row)}
            className={cn('rounded-xl border border-line bg-surface p-4', rowClassName?.(row))}>
            {titleColumn ? <div className="mb-2 font-medium text-fg">{titleColumn.cell(row)}</div> : null}
            <dl className="space-y-1.5">
              {detailColumns.map((column) => (
                <div key={column.key} className="flex items-center justify-between gap-4 text-sm">
                  <dt className="shrink-0 text-muted">{column.header}</dt>
                  <dd className="min-w-0 text-right text-fg">{column.cell(row)}</dd>
                </div>
              ))}
            </dl>
            {actions && <div className="table-actions mt-4 flex flex-wrap justify-end gap-2 border-t border-line pt-3">{actions.cell(row)}</div>}
          </li>
        ))}
      </ul>

      <div role="region" aria-label={caption} tabIndex={0} className="hidden overflow-x-auto rounded-xl border border-line bg-surface shadow-sm md:block">
        <table className="w-full min-w-max text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-line bg-bg text-xs font-semibold uppercase tracking-wider text-muted">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn('whitespace-nowrap px-5 py-4 font-semibold', column.align === 'right' && 'text-right', column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={getKey(row)} className={cn('transition-colors hover:bg-primary-soft/25 focus-within:bg-primary-soft/25', rowClassName?.(row))}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn('px-5 py-4 align-middle', column.key === 'actions' && 'table-actions', column.align === 'right' && 'tabular-nums', column.align === 'right' && 'text-right', column.className)}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
