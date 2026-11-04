'use client';

import { useId, useState } from 'react';

import { Icon } from '@/components/ui/icons';
import { cn } from '@/utils/cn';

/** Label, hint and error around one control, wired together for screen readers. */
export function FieldShell({ label, hint, error, required, children, className }) {
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

export const controlClass = (error) => cn(CONTROL, error ? 'border-danger' : 'border-line');

export function TextField({
  label, hint, error, fieldClassName, required, ...rest
}) {
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

/** A password box with an eye button that shows or hides what was typed. Hidden by default. */
export function PasswordField({
  label, hint, error, fieldClassName, required, disabled, ...rest
}) {
  const [isVisible, setIsVisible] = useState(false);
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} className={fieldClassName}>
      {({ id, describedBy }) => (
        <div className="relative">
          <input
            id={id}
            type={isVisible ? 'text' : 'password'}
            required={required}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(controlClass(error), 'min-h-10 pr-11')}
            {...rest}
          />
          <button
            type="button"
            onClick={() => setIsVisible((visible) => !visible)}
            aria-label={isVisible ? 'Hide password' : 'Show password'}
            aria-pressed={isVisible}
            disabled={disabled}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted hover:text-fg disabled:opacity-50">
            <Icon name={isVisible ? 'eyeOff' : 'eye'} />
          </button>
        </div>
      )}
    </FieldShell>
  );
}

export function TextArea({
  label, hint, error, fieldClassName, required, ...rest
}) {
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
}) {
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
}) {
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
