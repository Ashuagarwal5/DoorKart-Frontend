'use client';

import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { TextArea } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { describeApiError, toApiError } from '@/services/api/api-error';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  /** Explain what will happen, especially if it cannot be undone. */
  children: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  /** Shows an optional note box and passes what was typed to `onConfirm`. */
  noteLabel?: string;
  /**
   * Does the work. If it throws, the dialog stays open and shows the server's message, so
   * a refused action is never mistaken for a successful one. When it resolves, the dialog
   * closes itself.
   */
  onConfirm: (note: string) => Promise<void>;
  onClose: () => void;
};

/** "Are you sure?" for actions that matter. The buttons lock while the request is running. */
export function ConfirmDialog(props: ConfirmDialogProps) {
  // The body is only mounted while open, so its state (note, error) resets every time.
  return (
    <Modal open={props.open} onClose={props.onClose} title={props.title}>
      <ConfirmBody {...props} />
    </Modal>
  );
}

function ConfirmBody({ children, confirmLabel, tone = 'primary', noteLabel, onConfirm, onClose }: ConfirmDialogProps) {
  const [note, setNote] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setIsBusy(true);
    setError(null);
    try {
      await onConfirm(note.trim());
      onClose();
    } catch (failure) {
      setError(describeApiError(toApiError(failure)));
      setIsBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2 text-sm text-fg">{children}</div>
      {noteLabel ? (
        <TextArea
          label={noteLabel}
          rows={2}
          maxLength={500}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          disabled={isBusy}
        />
      ) : null}
      {error ? (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button onClick={onClose} disabled={isBusy}>
          Not now
        </Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={isBusy} onClick={confirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
