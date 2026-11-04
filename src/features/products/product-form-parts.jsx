'use client';

import { FieldShell, controlClass } from '@/components/ui/field';
import { Icon } from '@/components/ui/icons';
import { cn } from '@/utils/cn';

/** One titled block of the product form. */
export function FormSection({ icon, title, description, aside, children, className }) {
  return (
    <section className={cn('rounded-2xl border border-line bg-surface p-5 sm:p-6', className)}>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          {icon ? <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon name={icon} className="h-[18px] w-[18px]" /></span> : null}
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-fg">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
          </div>
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}

/** A large radio option, as a card. */
export function ChoiceCard({ name, checked, onChange, title, description, icon, disabled }) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition-colors', checked ? 'border-primary bg-primary-soft/30' : 'border-line hover:bg-bg', disabled && 'cursor-not-allowed opacity-60')}>
      <input type="radio" name={name} checked={checked} onChange={onChange} disabled={disabled} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-fg">{title}</span>
        <span className="mt-1 block text-xs text-muted">{description}</span>
      </span>
      {icon ? <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg text-primary"><Icon name={icon} className="h-4 w-4" /></span> : null}
    </label>
  );
}

/** A checkbox option, as a card. `leading` puts the checkbox first, before the title. */
export function ToggleCard({ checked, onChange, title, description, icon, disabled, leading = false }) {
  const box = <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />;
  return (
    <label className={cn('flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors', checked ? 'border-primary/50 bg-primary-soft/30' : 'border-line hover:bg-bg', disabled && 'cursor-not-allowed opacity-60')}>
      {leading ? box : null}
      {icon ? <Icon name={icon} className={cn('h-5 w-5', checked ? 'text-primary' : 'text-muted')} /> : null}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-fg">{title}</span>
        <span className="mt-1 block text-xs text-muted">{description}</span>
      </span>
      {leading ? null : box}
    </label>
  );
}

/** An on/off switch; a checkbox underneath, so it is announced and toggled like one. */
export function Switch({ checked, onChange, label, disabled }) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2.5', disabled && 'cursor-not-allowed opacity-60')}>
      <input type="checkbox" role="switch" checked={checked} onChange={onChange} disabled={disabled} className="peer sr-only" />
      <span aria-hidden="true" className="relative h-6 w-11 rounded-full bg-line transition-colors peer-checked:bg-success peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
      <span className="text-sm font-semibold text-fg">{label}</span>
    </label>
  );
}

/** A rupee amount box with a ₹ in front. The value stays text; the form parses it to paise. */
export function MoneyField({ label, hint, error, required, fieldClassName, ...rest }) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} className={fieldClassName}>
      {({ id, describedBy }) => (
        <div className="relative">
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">₹</span>
          <input id={id} inputMode="decimal" required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy} className={cn(controlClass(error), 'min-h-10 pl-7')} {...rest} />
        </div>
      )}
    </FieldShell>
  );
}

/** A number box with its unit written after it, like "g" or "cm". */
export function UnitField({ label, hint, error, unit, fieldClassName, ...rest }) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={fieldClassName}>
      {({ id, describedBy }) => (
        <div className="relative">
          <input id={id} inputMode="decimal" aria-invalid={error ? true : undefined} aria-describedby={describedBy} className={cn(controlClass(error), 'min-h-10 pr-10')} {...rest} />
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">{unit}</span>
        </div>
      )}
    </FieldShell>
  );
}

/**
 * A titled list of checks with a met/total count. Each item is `{ label, detail?, done,
 * optional?, status?, onSelect? }`; an item with `onSelect` is a button that jumps to its step,
 * and `status` replaces the word shown once it is done. `badge` replaces the met/total count:
 * "ready" reads "4/4 Ready", "percent" reads "100% Ready".
 */
export function Checklist({ title, items, footer, showProgress = false, disabled, badge = "met" }) {
  const required = items.filter((item) => !item.optional);
  const met = items.filter((item) => item.done).length;
  const ready = required.every((item) => item.done);
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-fg">{title}</h2>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', ready ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning')}>{badge === 'percent' ? `${Math.round((met / items.length) * 100)}% Ready` : badge === 'ready' ? `${met}/${items.length} Ready` : `${met}/${items.length} met`}</span>
      </header>
      {showProgress ? (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg" role="progressbar" aria-label={title} aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={met}>
          <div className="h-full rounded-full bg-success transition-[width]" style={{ width: `${(met / items.length) * 100}%` }} />
        </div>
      ) : null}
      <ul className="mt-4 space-y-2">
        {items.map((item) => {
          const body = (
            <>
              <span className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full', item.done ? 'bg-success text-white' : 'border border-line')}>
                {item.done ? <Icon name="check" className="h-3 w-3" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-fg">{item.label}</span>
                {item.detail ? <span className="block text-xs text-muted">{item.detail}</span> : null}
              </span>
              <span className={cn('shrink-0 text-xs font-medium', item.done ? 'text-success' : item.optional ? 'text-muted' : 'text-warning')}>
                {item.done ? item.status ?? 'Ready' : item.optional ? 'Optional' : 'Needed'}
              </span>
            </>
          );
          const className = cn('flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left', item.done ? 'border-success/25 bg-success-soft/40' : 'border-line');
          return (
            <li key={item.label}>
              {item.onSelect ? <button type="button" disabled={disabled} onClick={item.onSelect} className={cn(className, 'hover:bg-bg')}>{body}</button> : <div className={className}>{body}</div>}
            </li>
          );
        })}
      </ul>
      {footer ? <p className="mt-4 flex gap-2 border-t border-line pt-3 text-xs text-muted"><Icon name="info" className="h-4 w-4" />{footer}</p> : null}
    </section>
  );
}

/**
 * Buttons above a description box that start a list line. The description stays plain text,
 * which is what the app shows, so these only insert the markers a reader expects.
 */
export function ListToolbar({ textareaId, value, onChange, disabled }) {
  const insert = (marker) => {
    const box = document.getElementById(textareaId);
    const start = box?.selectionStart ?? value.length;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    // A numbered line continues the list on the line above it, or starts one at 1.
    const previousLine = value.slice(0, Math.max(lineStart - 1, 0)).split('\n').pop() ?? '';
    const previousNumber = Number(/^(\d+)\. /.exec(previousLine)?.[1] ?? 0);
    const prefix = marker === 'numbered' ? `${previousNumber + 1}. ` : '• ';
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    requestAnimationFrame(() => {
      box?.focus();
      box?.setSelectionRange(start + prefix.length, start + prefix.length);
    });
  };
  return (
    <div className="flex items-center gap-1 rounded-t-lg border border-b-0 border-line bg-bg px-2 py-1.5" role="toolbar" aria-label="Description formatting">
      <button type="button" disabled={disabled} onClick={() => insert('bullet')} className="rounded px-2 py-1 text-xs font-medium text-muted hover:bg-surface hover:text-fg">• Bullet list</button>
      <button type="button" disabled={disabled} onClick={() => insert('numbered')} className="rounded px-2 py-1 text-xs font-medium text-muted hover:bg-surface hover:text-fg">1. Numbered list</button>
      <span className="ml-auto text-[11px] text-muted">Plain text, as shown in the app</span>
    </div>
  );
}
