'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PasswordField } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { changeOwnPassword } from '@/services/api/admin-api';
import { ApiError, describeApiError, toApiError } from '@/services/api/api-error';

export const MIN_PASSWORD_LENGTH = 10;

/** Change the signed-in admin's own password. Other browsers they are signed in on are signed out. */
export function ChangePasswordCard() {
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    const found = {};
    if (current === '') found.current = 'Enter your current password.';
    if (next.length < MIN_PASSWORD_LENGTH) found.next = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    else if (next === current) found.next = 'Choose a password different from the current one.';
    if (confirm !== next) found.confirm = 'The two new passwords do not match.';
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) {
      return;
    }

    setIsSaving(true);
    try {
      await changeOwnPassword(current, next);
      toast.success('Password changed. Your other sign-ins were signed out.');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (error) {
      const failure = toApiError(error);
      if (failure instanceof ApiError && failure.code === 'INVALID_CREDENTIALS') {
        setErrors({ current: 'That is not your current password.' });
      } else {
        setFormError(describeApiError(failure));
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card title="Change password">
      <form onSubmit={submit} noValidate className="space-y-4">
        {formError ? (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        ) : null}
        <PasswordField
          label="Current password"
          name="current-password"
          autoComplete="current-password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          error={errors.current}
          disabled={isSaving}
        />
        <PasswordField
          label="New password"
          name="new-password"
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters. A long phrase is best.`}
          value={next}
          onChange={(event) => setNext(event.target.value)}
          error={errors.next}
          disabled={isSaving}
        />
        <PasswordField
          label="Confirm new password"
          name="confirm-password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          error={errors.confirm}
          disabled={isSaving}
        />
        <Button type="submit" variant="primary" loading={isSaving}>
          Change password
        </Button>
      </form>
    </Card>
  );
}
