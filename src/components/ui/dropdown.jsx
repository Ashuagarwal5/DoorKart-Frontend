'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useId, useRef, useState } from 'react';

import { Icon } from '@/components/ui/icons';
import { cn } from '@/utils/cn';

/**
 * A select drawn by the app instead of the browser, so the open list matches the rest of the
 * panel. It follows the listbox pattern: arrow keys move, Enter or Space picks, Escape closes,
 * and a letter jumps to the next option starting with it.
 *
 * `options` is `[{ value, label }]`; `onChange` receives the picked value.
 */
export function Dropdown({ label, value, options, onChange, className, hideLabel = false, placement = 'bottom' }) {
  const id = useId();
  const root = useRef(null);
  const trigger = useRef(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const outside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  const openList = () => {
    setActive(selectedIndex);
    setOpen(true);
  };

  const pick = (option) => {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
    if (option.value !== value) onChange(option.value);
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) return openList();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) => (current + step + options.length) % options.length);
    } else if (event.key === 'Home' || event.key === 'End') {
      if (!open) return;
      event.preventDefault();
      setActive(event.key === 'Home' ? 0 : options.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) pick(options[active]);
      else openList();
    } else if (event.key === 'Tab') {
      setOpen(false);
    } else if (event.key.length === 1 && /\S/.test(event.key)) {
      const letter = event.key.toLowerCase();
      const from = open ? active + 1 : selectedIndex + 1;
      const order = [...options.keys()].map((_, offset) => (from + offset) % options.length);
      const match = order.find((index) => options[index].label.toLowerCase().startsWith(letter));
      if (match === undefined) return;
      if (open) setActive(match);
      else onChange(options[match].value);
    }
  };

  return (
    <div ref={root} className={cn('relative flex flex-col gap-1.5', className)}>
      <span id={`${id}-label`} className={hideLabel ? 'sr-only' : 'text-xs font-semibold uppercase tracking-[0.06em] text-muted'}>{label}</span>
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-activedescendant={open ? `${id}-option-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          'flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border bg-surface px-3 text-left text-sm font-medium text-fg transition-colors hover:border-muted/50',
          open ? 'border-primary' : 'border-line'
        )}>
        <span id={`${id}-value`} className="truncate">{selected?.label}</span>
        <Icon name="chevronDown" className={cn('h-4 w-4 text-muted transition-transform duration-200', open && 'rotate-180 text-primary')} />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.ul
            id={`${id}-list`}
            role="listbox"
            aria-labelledby={`${id}-label`}
            initial={{ opacity: 0, y: placement === 'top' ? 4 : -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: placement === 'top' ? 4 : -4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className={cn('absolute left-0 z-40 max-h-64 min-w-full overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-xl', placement === 'top' ? 'bottom-full mb-1.5 origin-bottom' : 'top-full mt-1.5 origin-top')}>
            {options.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <li
                  key={option.value}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onPointerEnter={() => setActive(index)}
                  onClick={() => pick(option)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm',
                    index === active ? 'bg-bg' : '',
                    isSelected ? 'font-semibold text-primary' : 'text-fg'
                  )}>
                  {option.label}
                  {isSelected ? <Icon name="check" className="h-4 w-4" /> : null}
                </li>
              );
            })}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
