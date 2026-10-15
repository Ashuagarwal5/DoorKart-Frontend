'use client';

import { type FormEvent, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckboxField, TextField } from '@/components/ui/field';
import { QueryView, TableSkeleton } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useAdmin } from '@/features/auth/auth-context';
import { useSectionScroll } from '@/hooks/use-section-scroll';
import { useApiQuery } from '@/hooks/use-api-query';
import { fetchSettings, saveSettings, sendTestEmail } from '@/services/api/admin-api';
import { ApiError, describeApiError, type FieldErrors } from '@/services/api/api-error';
import type { SettingsChanges, SettingsView, SettingView } from '@/types/api';

/**
 * The shop's sign-in and email settings. The list of fields comes from the server, so a new
 * setting there appears here without any change to this screen. Secrets are write-only: the
 * server never sends them back, so a secret box starts empty and only a typed value is sent.
 */
export function AppSettings() {
  const admin = useAdmin();

  if (admin.role !== 'SUPER_ADMIN') {
    return (
      <Card title="Store settings">
        <p className="text-sm text-muted">Only a super admin can view or change these settings.</p>
      </Card>
    );
  }

  return <SettingsQuery />;
}

function SettingsQuery() {
  const query = useApiQuery('settings', () => fetchSettings());
  return (
    <QueryView query={query} skeleton={<TableSkeleton rows={4} />}>
      {(view) => <SettingsForm view={view} onSaved={query.reload} />}
    </QueryView>
  );
}

type FormState = {
  /** Plain settings, as text. */
  values: Record<string, string>;
  /** Secrets the admin typed a new value for. A secret not in here is left as it is. */
  secrets: Record<string, string>;
  /** Secrets the admin chose to remove. */
  removed: Set<string>;
};

function initialState(view: SettingsView): FormState {
  const values: Record<string, string> = {};
  for (const group of view.groups) {
    for (const setting of group.settings) {
      if (!setting.secret) {
        values[setting.key] = setting.value ?? '';
      }
    }
  }
  return { values, secrets: {}, removed: new Set() };
}

function SettingsForm({ view, onSaved }: { view: SettingsView; onSaved: () => void }) {
  const toast = useToast();
  const [state, setState] = useState<FormState>(() => initialState(view));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeGroup, setActiveGroup] = useState(view.groups[0]?.id ?? '');
  const section = useRef<HTMLDivElement>(null);
  useSectionScroll(activeGroup, section);
  const saved = initialState(view);

  const all = view.groups.flatMap((group) => group.settings);

  /** Only what the admin actually changed. */
  const changes = (): SettingsChanges => {
    const result: SettingsChanges = {};
    for (const setting of all) {
      if (setting.secret) {
        if (state.removed.has(setting.key)) result[setting.key] = null;
        else if ((state.secrets[setting.key] ?? '') !== '') result[setting.key] = state.secrets[setting.key] ?? null;
      } else if ((state.values[setting.key] ?? '') !== (saved.values[setting.key] ?? '')) {
        result[setting.key] = state.values[setting.key] ?? '';
      }
    }
    return result;
  };
  const pending = changes();
  const hasChanges = Object.keys(pending).length > 0;
  const registrationVerificationRequired =
    state.values['auth.registrationOtpEnabled'] !== 'false' ||
    state.values['auth.requireEmailVerification'] !== 'false';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving || !hasChanges) {
      return;
    }
    setIsSaving(true);
    setErrors({});
    setFormError(null);
    try {
      await saveSettings(pending);
      toast.success('Settings saved.');
      setState((current) => ({ ...current, secrets: {}, removed: new Set() }));
      onSaved();
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError('SERVER_ERROR', 'Something went wrong.');
      if (apiError.code === 'VALIDATION_ERROR' && Object.keys(apiError.fieldErrors).length > 0) {
        setErrors(apiError.fieldErrors);
        setFormError('Please check the highlighted fields before saving. Your changes have been kept.');
        const invalidGroup = view.groups.find(group => group.settings.some(setting => apiError.fieldErrors[setting.key]));
        if (invalidGroup) setActiveGroup(invalidGroup.id);
      } else {
        setFormError(describeApiError(apiError));
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {!view.secretsKeyConfigured ? (
        <p role="alert" className="rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning">
          The server has no <code>SECRETS_KEY</code>, so an SMTP password cannot be saved and customers cannot sign in with an
          email code yet. In the Backend folder run <code>npm run secrets:key</code>, put the line it prints into{' '}
          <code>Backend/.env</code>, and restart the API.
        </p>
      ) : null}

      <div ref={section} className="grid items-start gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
      <nav aria-label="Settings categories" className="flex flex-wrap gap-2 rounded-xl border border-line bg-surface p-3 xl:sticky xl:top-24 xl:flex-col">
        {view.groups.map(group => {
          const changed = group.settings.filter(setting => Object.hasOwn(pending, setting.key)).length;
          const invalid = group.settings.some(setting => errors[setting.key]);
          return <button key={group.id} type="button" aria-pressed={activeGroup === group.id} onClick={() => setActiveGroup(group.id)}
            className={`flex items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium ${activeGroup === group.id ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-bg'}`}>
            {group.title}{invalid ? <span className="text-danger">Check fields</span> : changed > 0 ? <span className="rounded-full bg-primary px-2 text-xs text-white" aria-label={`${changed} unsaved changes`}>{changed}</span> : null}
          </button>;
        })}
      </nav>
      <div className="min-w-0 space-y-6">
      <form onSubmit={submit} noValidate className="space-y-6">
        {formError ? (
          <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
            {formError}
          </p>
        ) : null}

        {view.groups.filter(group => group.id === activeGroup).map((group) => (
          <Card key={group.id} title={group.title}>
            <p className="mb-4 text-sm text-muted">{group.description}</p>
            {group.id === 'signin' ? (
              <div className="mb-4 space-y-2 rounded-lg bg-bg px-3 py-3 text-sm text-muted">
                <p>Email login always requires a one-time email code, regardless of registration settings.</p>
                <p>
                  {registrationVerificationRequired
                    ? 'With these settings, customers must verify their email to complete registration.'
                    : 'With these settings, customers can register an unverified account. They must verify an email login code before signing in.'}
                </p>
              </div>
            ) : null}
            {group.id === 'email' ? (
              <div
                role="status"
                className={`mb-4 rounded-lg px-3 py-3 text-sm ${view.smtpConfigured ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'}`}>
                <p className="font-medium">SMTP configuration: {view.smtpConfigured ? 'Configured' : 'Not configured'}</p>
                <p className="mt-1">
                  {view.smtpConfigured
                    ? 'The saved configuration is complete. Send a test email below to verify delivery.'
                    : 'Save complete email server settings to enable email-code registration and login.'}
                </p>
                {hasChanges ? <p className="mt-1">This status reflects saved settings. Save your changes to update it.</p> : null}
              </div>
            ) : null}
            <div className="grid items-start gap-5 md:grid-cols-2">
              {group.settings.map((setting) => (
                <SettingField
                  key={setting.key}
                  setting={setting}
                  state={state}
                  setState={setState}
                  error={errors[setting.key]}
                  disabled={isSaving}
                  secretsKeyConfigured={view.secretsKeyConfigured}
                />
              ))}
            </div>
          </Card>
        ))}

        <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-4 shadow-lg">
          <Button type="submit" variant="primary" loading={isSaving} disabled={!hasChanges}>
            Save all changes
          </Button>
          {hasChanges ? <span className="text-sm text-muted">You have unsaved changes.</span> : null}
        </div>
      </form>

      {activeGroup === 'email' && <TestEmail hasUnsavedChanges={hasChanges} />}
      </div>
      </div>
    </div>
  );
}

function SettingField({
  setting,
  state,
  setState,
  error,
  disabled,
  secretsKeyConfigured,
}: {
  setting: SettingView;
  state: FormState;
  setState: (update: (current: FormState) => FormState) => void;
  error: string | undefined;
  disabled: boolean;
  secretsKeyConfigured: boolean;
}) {
  const { key } = setting;

  if (setting.type === 'boolean') {
    return (
      <div className="rounded-lg border border-line bg-bg/50 p-4">
      <CheckboxField
        label={setting.label}
        hint={setting.description ?? undefined}
        checked={state.values[key] === 'true'}
        disabled={disabled}
        onChange={(event) =>
          setState((current) => ({ ...current, values: { ...current.values, [key]: String(event.target.checked) } }))
        }
      />
      {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
      </div>
    );
  }

  if (setting.secret) {
    const isRemoved = state.removed.has(key);
    const savedNote = isRemoved ? 'Will be removed when you save.' : setting.isSet ? 'A value is saved. Type to replace it.' : 'Not set.';
    return (
      <div>
        <TextField
          label={setting.label}
          type="password"
          autoComplete="new-password"
          hint={`${setting.description ?? ''} ${savedNote}`.trim()}
          placeholder={setting.isSet && !isRemoved ? '•••••••• (saved)' : ''}
          value={state.secrets[key] ?? ''}
          error={error}
          disabled={disabled || !secretsKeyConfigured}
          onChange={(event) =>
            setState((current) => {
              const removed = new Set(current.removed);
              removed.delete(key);
              return { ...current, secrets: { ...current.secrets, [key]: event.target.value }, removed };
            })
          }
        />
        {setting.isSet ? (
          <button
            type="button"
            disabled={disabled}
            className="mt-1 text-xs text-danger underline disabled:opacity-50"
            onClick={() =>
              setState((current) => {
                const removed = new Set(current.removed);
                if (removed.has(key)) removed.delete(key);
                else removed.add(key);
                return { ...current, secrets: { ...current.secrets, [key]: '' }, removed };
              })
            }>
            {isRemoved ? 'Keep the saved value' : 'Remove the saved value'}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <TextField
      label={setting.label}
      type={setting.type === 'number' ? 'text' : setting.type === 'email' ? 'email' : 'text'}
      inputMode={setting.type === 'number' ? 'numeric' : undefined}
      hint={setting.description ?? undefined}
      placeholder={setting.placeholder ?? undefined}
      value={state.values[key] ?? ''}
      error={error}
      disabled={disabled}
      autoComplete="off"
      onChange={(event) =>
        setState((current) => ({ ...current, values: { ...current.values, [key]: event.target.value } }))
      }
    />
  );
}

function TestEmail({ hasUnsavedChanges }: { hasUnsavedChanges: boolean }) {
  const admin = useAdmin();
  const toast = useToast();
  const [to, setTo] = useState(admin.email);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const send = async () => {
    setIsSending(true);
    setResult(null);
    try {
      const sent = await sendTestEmail(to.trim() || undefined);
      setResult({ ok: true, message: `Sent to ${sent.sentTo}. Check that inbox (and spam).` });
      toast.success('Test email sent.');
    } catch (error) {
      setResult({ ok: false, message: error instanceof ApiError ? describeApiError(error) : 'The test failed.' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card title="Send a test email">
      <p className="mb-4 text-sm text-muted">
        Uses the settings that are <strong>saved</strong>
        {hasUnsavedChanges ? ' (save your changes first)' : ''}. A wrong password shows up here instead of at a
        customer&apos;s sign-in.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <TextField
          label="Send to"
          type="email"
          fieldClassName="w-72 max-w-full"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          disabled={isSending}
        />
        <Button onClick={send} loading={isSending} disabled={to.trim() === ''}>
          Send test email
        </Button>
      </div>
      {result ? (
        <p
          role={result.ok ? 'status' : 'alert'}
          className={`mt-3 text-sm ${result.ok ? 'text-success' : 'text-danger'}`}>
          {result.message}
        </p>
      ) : null}
    </Card>
  );
}
