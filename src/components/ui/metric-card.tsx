import Link from 'next/link';

import { cn } from '@/utils/cn';

/** One headline number. With `href` the whole card is a link to the relevant list. */
export function MetricCard({
  label,
  value,
  hint,
  href,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  tone?: 'neutral' | 'warning';
}) {
  const body = (
    <>
      <p className="text-sm text-muted">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold', tone === 'warning' ? 'text-warning' : 'text-fg')}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </>
  );

  const classes = 'block rounded-xl border border-line bg-surface p-4';
  return href ? (
    <Link href={href} className={cn(classes, 'transition-colors hover:border-primary')}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
