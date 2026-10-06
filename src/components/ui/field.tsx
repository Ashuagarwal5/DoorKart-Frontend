import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

import { cn } from '@/utils/cn';

type FieldShellProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Receives the ids to put on the control, so label, hint and error are all connected to it. */
  children: (ids: { id: string; describedBy: string | undefined }) => ReactNode;
  className?: string;
};

/** Label, hint and error around one control, wired together for screen readers. */
function FieldShell({ label, hint, error, required, children, className }: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
        {required ? <span className="text-danger" aria-hidden="true"> *</span> : null}
      </label>
      {children({ id, describedBy })}
      {hint ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const CONTROL =
  'w-full rounded-lg border bg-surface px-3 text-sm text-fg placeholder:text-muted/70 disabled:bg-bg disabled:text-muted';

const controlClass = (error?: string) => cn(CONTROL, error ? 'border-danger' : 'border-line');

type SharedProps = { label: string; hint?: string; error?: string; fieldClassName?: string };

export function TextField({
  label, hint, error, fieldClassName, required, ...rest
}: SharedProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} className={fieldClassName}>
      {({ id, describedBy }) => (
        <input
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(controlClass(error), 'min-h-10')}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

export function TextArea({
  label, hint, error, fieldClassName, required, ...rest
}: SharedProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} className={fieldClassName}>
      {({ id, describedBy }) => (
        <textarea
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(controlClass(error), 'py-2')}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

export function SelectField({
  label, hint, error, fieldClassName, required, children, ...rest
}: SharedProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} className={fieldClassName}>
      {({ id, describedBy }) => (
        <select
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(controlClass(error), 'min-h-10')}
          {...rest}>
          {children}
        </select>
      )}
    </FieldShell>
  );
}

export function CheckboxField({
  label, hint, ...rest
}: { label: string; hint?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input id={id} type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" {...rest} />
      <label htmlFor={id} className="text-sm">
        <span className="font-medium text-fg">{label}</span>
        {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
      </label>
    </div>
  );
}
