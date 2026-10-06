import type { ReactNode } from 'react';

import { Button, Spinner } from '@/components/ui/button';
import type { ApiQuery } from '@/hooks/use-api-query';
import { describeApiError, type ApiError } from '@/services/api/api-error';
import { cn } from '@/utils/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-line', className)} />;
}

/** A card-shaped placeholder with a few rows, shown while a list loads. */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="rounded-xl border border-line bg-surface p-4">
      <Skeleton className="mb-4 h-5 w-1/3" />
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}

export function CardsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-24" />
      ))}
    </div>
  );
}

export function FullScreenSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-screen items-center justify-center gap-3 text-muted">
      <Spinner className="h-5 w-5" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      <p className="font-medium text-fg">{title}</p>
      {message ? <p className="mx-auto mt-1 max-w-md text-sm text-muted">{message}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-6 py-8 text-center">
      <p className="font-medium text-danger">
        {error.isConnectionProblem ? 'Cannot reach the server' : 'Something went wrong'}
      </p>
      <p className="mx-auto mt-1 max-w-md text-sm text-fg">{describeApiError(error)}</p>
      {onRetry ? (
        <Button className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

type QueryViewProps<T> = {
  query: ApiQuery<T>;
  /** Shown while the first load is running. */
  skeleton?: ReactNode;
  /** Returns the empty-state to show for this data, or null if the data is not empty. */
  empty?: (data: T) => ReactNode | null;
  children: (data: T) => ReactNode;
};

/**
 * Gives every page the same four states: loading, error (with retry), empty, and success.
 * While a reload is running the previous data stays on screen, slightly dimmed.
 */
export function QueryView<T>({ query, skeleton, empty, children }: QueryViewProps<T>) {
  if (query.status === 'loading') {
    return <>{skeleton ?? <TableSkeleton />}</>;
  }
  if (query.status === 'error') {
    return <ErrorState error={query.error} onRetry={query.reload} />;
  }

  const emptyState = empty?.(query.data) ?? null;
  if (emptyState) {
    return <>{emptyState}</>;
  }
  return (
    <div className={cn('transition-opacity', query.isRefreshing && 'opacity-60')} aria-busy={query.isRefreshing}>
      {children(query.data)}
    </div>
  );
}
