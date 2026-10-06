import { resolveMediaUrl } from '@/services/api/config';
import { cn } from '@/utils/cn';

/**
 * A small product picture, or a blank box when the product has none. A plain <img> is used
 * on purpose: next/image needs every image host listed ahead of time, and the admin can
 * enter any image address.
 */
export function ProductThumb({ url, alt, className }: { url: string | undefined; alt: string; className?: string }) {
  if (!url) {
    return <div aria-hidden="true" className={cn('h-10 w-10 shrink-0 rounded-md border border-line bg-bg', className)} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolveMediaUrl(url)}
      alt={alt}
      loading="lazy"
      className={cn('h-10 w-10 shrink-0 rounded-md border border-line bg-bg object-cover', className)}
    />
  );
}
