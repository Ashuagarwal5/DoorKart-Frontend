'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { Icon } from '@/components/ui/icons';
import { cn } from '@/utils/cn';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Wider dialog, for forms with several fields. */
  wide?: boolean;
};

/**
 * A modal built on the browser's native <dialog>, which brings a focus trap, Escape to
 * close, and correct screen-reader behaviour for free. Its content is only mounted while
 * open, so a form inside always starts fresh.
 */
export function Modal({ open, onClose, title, children, wide = false }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onClose={onClose}
      // A click on the dimmed backdrop (the dialog element itself) closes it.
      onClick={(event) => {
        if (event.target === ref.current) {
          onClose();
        }
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-xl border border-line bg-surface p-0 text-fg shadow-xl',
        wide ? 'max-w-2xl' : 'max-w-md'
      )}>
      {open ? (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <h2 id="modal-title" className="text-base font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-muted hover:bg-bg hover:text-fg">
              <Icon name="close" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
