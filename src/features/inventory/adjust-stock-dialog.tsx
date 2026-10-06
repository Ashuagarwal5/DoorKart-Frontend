'use client';

import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { TextArea, TextField } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { adjustInventory } from '@/services/api/admin-api';
import { ApiError, describeApiError } from '@/services/api/api-error';
import type { Product } from '@/types/api';

const MAX_UNITS = 1_000_000;

type Props = {
  /** The product being adjusted; null keeps the dialog closed. */
  product: Product | null;
  onClose: () => void;
  onAdjusted: () => void;
};

export function AdjustStockDialog({ product, onClose, onAdjusted }: Props) {
  return (
    <Modal open={product !== null} onClose={onClose} title="Adjust stock">
      {product ? <AdjustStockForm product={product} onClose={onClose} onAdjusted={onAdjusted} /> : null}
    </Modal>
  );
}

/** "+10", "10" and "-2" are all fine. Returns null for anything else, including zero. */
function parseDelta(text: string): number | null {
  const trimmed = text.trim();
  if (!/^[+-]?\d+$/.test(trimmed)) {
    return null;
  }
  const delta = Number(trimmed);
  return delta !== 0 && Math.abs(delta) <= MAX_UNITS ? delta : null;
}

function AdjustStockForm({ product, onClose, onAdjusted }: { product: Product; onClose: () => void; onAdjusted: () => void }) {
  const toast = useToast();
  const [deltaText, setDeltaText] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{ quantityDelta?: string; note?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const delta = parseDelta(deltaText);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    const found: typeof errors = {};
    if (delta === null) found.quantityDelta = 'Enter a whole number, like 10 or -2. It cannot be zero.';
    if (note.trim() === '') found.note = 'Say why the stock is changing.';
    setErrors(found);
    setFormError(null);
    if (delta === null || found.note) {
      return;
    }

    setIsSaving(true);
    try {
      await adjustInventory(product.id, { quantityDelta: delta, note: note.trim() });
      toast.success(`Stock adjusted by ${delta > 0 ? '+' : ''}${delta} for ${product.name}.`);
      onAdjusted();
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VALIDATION_ERROR' && Object.keys(error.fieldErrors).length > 0) {
        setErrors({ quantityDelta: error.fieldErrors['quantityDelta'], note: error.fieldErrors['note'] });
      } else {
        // For example: the server refusing to take stock below what open orders have reserved.
        setFormError(describeApiError(error instanceof ApiError ? error : new ApiError('SERVER_ERROR', 'Something went wrong.')));
      }
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <p className="font-medium text-fg">{product.name}</p>
        <p className="text-xs text-muted">{product.sku}</p>
      </div>

      <dl className="grid grid-cols-3 gap-3 rounded-lg bg-bg p-3 text-center text-sm">
        <div>
          <dt className="text-xs text-muted">On hand</dt>
          <dd className="font-semibold">{product.stockQuantity}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Reserved</dt>
          <dd className="font-semibold">{product.reservedQuantity}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Available</dt>
          <dd className="font-semibold">{product.availableQuantity}</dd>
        </div>
      </dl>

      {formError ? (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <TextField
        label="Change in stock"
        required
        inputMode="numeric"
        autoFocus
        placeholder="+10 or -2"
        hint={
          delta === null
            ? 'Use + to add stock and - to remove it.'
            : `Stock on hand will become ${product.stockQuantity + delta}.`
        }
        value={deltaText}
        onChange={(event) => setDeltaText(event.target.value)}
        error={errors.quantityDelta}
        disabled={isSaving}
      />
      {delta !== null && delta < 0 ? (
        <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
          This removes stock. The server will refuse it if it would leave fewer units than open orders have reserved.
        </p>
      ) : null}

      <TextArea
        label="Reason"
        required
        rows={2}
        maxLength={500}
        placeholder="New shipment received, damaged stock correction…"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        error={errors.note}
        disabled={isSaving}
      />

      <div className="flex justify-end gap-2">
        <Button onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={isSaving}>
          Adjust stock
        </Button>
      </div>
    </form>
  );
}
