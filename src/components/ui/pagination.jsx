import { Button } from '@/components/ui/button';

/** Previous / next with a count. The page itself lives in the URL, so back and refresh work. */
export function Pagination({
  pagination,
  onPageChange,
  extra,
}) {
  const { page, limit, total, totalPages } = pagination;
  if (total === 0) {
    return null;
  }

  const first = (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);

  return (
    <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-sm text-muted">
          Showing {first}–{last} of {total}
        </p>
        {extra}
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <span className="text-sm text-muted">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <Button size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  );
}
