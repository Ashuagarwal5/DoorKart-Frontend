import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/utils/cn';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'md' | 'sm';
  /** Shows a spinner and blocks clicks while work is in progress. */
  loading?: boolean;
};

const VARIANTS = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover border-transparent',
  secondary: 'bg-surface text-fg hover:bg-bg border-line',
  danger: 'bg-danger text-white hover:opacity-90 border-transparent',
  ghost: 'bg-transparent text-muted hover:bg-bg hover:text-fg border-transparent',
} as const;

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        size === 'md' ? 'min-h-10 px-4 text-sm' : 'min-h-8 px-3 text-xs',
        VARIANTS[variant],
        className
      )}
      {...rest}>
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent',
        className
      )}
    />
  );
}
