'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { PasswordField, SelectField, TextField } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { MIN_PASSWORD_LENGTH } from '@/features/settings/change-password-card';
import { createStaff, resetStaffPassword } from '@/services/api/admin-api';
import { ApiError, describeApiError, getErrorMessage, toApiError } from '@/services/api/api-error';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AddStaffDialog({ open, onClose, onSaved }) {
  return (
    <Modal open={open} onClose={onClose} title="Add staff login">
      <AddStaffForm onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}

function AddStaffForm({ onClose, onSaved }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }
    const found = {};
    if (name.trim() === '') found['name'] = 'Enter a name.';
    if (!EMAIL_PATTERN.test(email.trim())) found['email'] = 'Enter a valid email address.';
    if (password.length < MIN_PASSWORD_LENGTH) found['password'] = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) {
      return;
    }

    setIsSaving(true);
    try {
      await createStaff({ name: name.trim(), email: email.trim(), password, role });
      toast.success(`${name.trim()} can now sign in.`);
      onSaved();
      onClose();
    } catch (error) {
      const failure = toApiError(error);
      if (failure instanceof ApiError && failure.code === 'ADMIN_EXISTS') {
        setErrors({ email: 'A staff login with this email already exists.' });
      } else {
        setFormError(describeApiError(failure));
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
      <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} error={errors['name']} disabled={isSaving} autoFocus />
      <TextField
        label="Email"
        type="email"
        autoComplete="off"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors['email']}
        disabled={isSaving}
      />
      <SelectField
        label="Role"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        disabled={isSaving}
        hint="A super admin can also manage staff logins and store settings.">
        <option value="ADMIN">Admin</option>
        <option value="SUPER_ADMIN">Super admin</option>
      </SelectField>
      <PasswordField
        label="Starting password"
        autoComplete="new-password"
        hint={`At least ${MIN_PASSWORD_LENGTH} characters. Tell them to change it after signing in.`}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors['password']}
        disabled={isSaving}
      />
      <div className="flex justify-end gap-2">
        <Button onClick={onClose} disabled={isSaving}>
          Not now
        </Button>
        <Button type="submit" variant="primary" loading={isSaving}>
          Add login
        </Button>
      </div>
    </form>
  );
}

export function ResetPasswordDialog({ staff, onClose }) {
  return (
    <Modal open={staff !== null} onClose={onClose} title="Reset password">
      {staff ? <ResetPasswordForm staff={staff} onClose={onClose} /> : null}
    </Modal>
  );
}

function ResetPasswordForm({ staff, onClose }) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [error, setError] = useState();
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    setError(undefined);
    setFormError(null);
    setIsSaving(true);
    try {
      await resetStaffPassword(staff.id, password);
      toast.success(`${staff.name}'s password was reset and they were signed out.`);
      onClose();
    } catch (failure) {
      setFormError(getErrorMessage(failure));
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="text-sm text-fg">
        Set a new password for <strong>{staff.name}</strong> ({staff.email}). They are signed out everywhere and must
        use the new password.
      </p>
      {formError ? (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      ) : null}
      <PasswordField
        label="New password"
        autoComplete="new-password"
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={error}
        disabled={isSaving}
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button onClick={onClose} disabled={isSaving}>
          Not now
        </Button>
        <Button type="submit" variant="primary" loading={isSaving}>
          Reset password
        </Button>
      </div>
    </form>
  );
}
