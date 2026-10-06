'use client';

import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { CheckboxField, TextField } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { createDeliveryArea, updateDeliveryArea } from '@/services/api/admin-api';
import { ApiError, describeApiError, type FieldErrors } from '@/services/api/api-error';
import type { DeliveryArea, DeliveryAreaInput } from '@/types/api';
import { MAX_PAISE, paiseToRupeeInput, parseRupeesToPaise } from '@/utils/money';

type Props = {
  open: boolean;
  /** The area being edited, or null to create one. */
  area: DeliveryArea | null;
  onClose: () => void;
  onSaved: () => void;
};

export function DeliveryAreaFormDialog({ open, area, onClose, onSaved }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={area ? 'Edit delivery area' : 'Add delivery area'}>
      <DeliveryAreaForm area={area} onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}

type AmountResult = { ok: true; paise: number | null } | { ok: false };

/**
 * An optional rupee field. Blank is NOT zero: it means "no minimum" or "no free delivery",
 * and is sent as null. Zero is only ever sent if the admin actually types 0.
 */
function parseOptionalAmount(text: string): AmountResult {
  if (text.trim() === '') {
    return { ok: true, paise: null };
  }
  const paise = parseRupeesToPaise(text);
  return paise === null || paise > MAX_PAISE ? { ok: false } : { ok: true, paise };
}

function DeliveryAreaForm({ area, onClose, onSaved }: Omit<Props, 'open'>) {
  const toast = useToast();
  const [name, setName] = useState(area?.name ?? '');
  const [pincode, setPincode] = useState(area?.pincode ?? '');
  const [charge, setCharge] = useState(area ? paiseToRupeeInput(area.deliveryChargePaise) : '');
  const [minimum, setMinimum] = useState(area?.minimumOrderPaise != null ? paiseToRupeeInput(area.minimumOrderPaise) : '');
  const [freeAbove, setFreeAbove] = useState(
    area?.freeDeliveryThresholdPaise != null ? paiseToRupeeInput(area.freeDeliveryThresholdPaise) : ''
  );
  const [isActive, setIsActive] = useState(area?.isActive ?? true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    const found: FieldErrors = {};
    if (name.trim() === '') found['name'] = 'Enter the area name.';
    if (pincode.trim() !== '' && !/^[1-9]\d{5}$/.test(pincode.trim())) found['pincode'] = 'A pincode has 6 digits.';

    const chargePaise = parseRupeesToPaise(charge);
    if (chargePaise === null || chargePaise > MAX_PAISE) {
      found['deliveryChargePaise'] = 'Enter an amount in rupees, like 30 or 30.50. Use 0 for free delivery.';
    }
    const minimumResult = parseOptionalAmount(minimum);
    if (!minimumResult.ok) found['minimumOrderPaise'] = 'Enter an amount in rupees, or leave it blank for no minimum.';
    const freeResult = parseOptionalAmount(freeAbove);
    if (!freeResult.ok) found['freeDeliveryThresholdPaise'] = 'Enter an amount in rupees, or leave it blank.';

    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0 || chargePaise === null || !minimumResult.ok || !freeResult.ok) {
      return;
    }

    const next = {
      name: name.trim(),
      pincode: pincode.trim() || null,
      deliveryChargePaise: chargePaise,
      minimumOrderPaise: minimumResult.paise,
      freeDeliveryThresholdPaise: freeResult.paise,
      isActive,
    };

    let input: DeliveryAreaInput;
    if (area) {
      input = {};
      if (next.name !== area.name) input.name = next.name;
      if (next.pincode !== area.pincode) input.pincode = next.pincode;
      if (next.deliveryChargePaise !== area.deliveryChargePaise) input.deliveryChargePaise = next.deliveryChargePaise;
      if (next.minimumOrderPaise !== area.minimumOrderPaise) input.minimumOrderPaise = next.minimumOrderPaise;
      if (next.freeDeliveryThresholdPaise !== area.freeDeliveryThresholdPaise) {
        input.freeDeliveryThresholdPaise = next.freeDeliveryThresholdPaise;
      }
      if (next.isActive !== area.isActive) input.isActive = next.isActive;
      if (Object.keys(input).length === 0) {
        onClose();
        return;
      }
    } else {
      input = next;
    }

    setIsSaving(true);
    try {
      if (area) {
        await updateDeliveryArea(area.id, input);
        toast.success('Delivery area updated.');
      } else {
        await createDeliveryArea(input);
        toast.success('Delivery area created.');
      }
      onSaved();
      onClose();
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError('SERVER_ERROR', 'Something went wrong.');
      if (apiError.code === 'VALIDATION_ERROR' && Object.keys(apiError.fieldErrors).length > 0) {
        setErrors(apiError.fieldErrors);
      } else if (apiError.code === 'DUPLICATE_NAME') {
        setErrors({ name: apiError.message });
      } else {
        setFormError(describeApiError(apiError));
      }
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {formError ? (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      ) : null}
      <TextField label="Area name" required autoFocus value={name} onChange={(e) => setName(e.target.value)} error={errors['name']} maxLength={100} disabled={isSaving} />
      <TextField label="Pincode" inputMode="numeric" hint="Optional." value={pincode} onChange={(e) => setPincode(e.target.value)} error={errors['pincode']} maxLength={6} disabled={isSaving} />
      <TextField
        label="Delivery charge (₹)"
        required
        inputMode="decimal"
        value={charge}
        onChange={(e) => setCharge(e.target.value)}
        error={errors['deliveryChargePaise']}
        disabled={isSaving}
      />
      <TextField
        label="Minimum order (₹)"
        inputMode="decimal"
        hint="Optional. Orders below this amount are not accepted for this area. Blank means no minimum."
        value={minimum}
        onChange={(e) => setMinimum(e.target.value)}
        error={errors['minimumOrderPaise']}
        disabled={isSaving}
      />
      <TextField
        label="Free delivery above (₹)"
        inputMode="decimal"
        hint="Optional. Orders at or above this amount get free delivery. Blank means delivery is always charged."
        value={freeAbove}
        onChange={(e) => setFreeAbove(e.target.value)}
        error={errors['freeDeliveryThresholdPaise']}
        disabled={isSaving}
      />
      <CheckboxField
        label="Active"
        hint="Customers can only order for active areas."
        checked={isActive}
        onChange={(e) => setIsActive(e.target.checked)}
        disabled={isSaving}
      />
      {area ? (
        <p className="text-xs text-muted">Changed charges apply to new orders. Orders already placed keep the charge they were given.</p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={isSaving}>
          {area ? 'Save changes' : 'Create area'}
        </Button>
      </div>
    </form>
  );
}
