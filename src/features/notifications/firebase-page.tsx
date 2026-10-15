'use client';

import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, DetailRow } from '@/components/ui/card';
import { CheckboxField, TextArea, TextField } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { QueryView } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useAdmin } from '@/features/auth/auth-context';
import { useApiQuery } from '@/hooks/use-api-query';
import { describeApiError, toApiError } from '@/services/api/api-error';
import {
  fetchProviderConfig,
  saveProviderCredentials,
  setProviderEnabled,
  testProviderConnection,
  type ProviderConfig,
} from '@/services/api/notifications-api';
import { formatDateTime } from '@/utils/date';
import { NotificationsNav } from './notifications-nav';

export function FirebasePage() {
  const admin = useAdmin();
  return (
    <>
      <PageHeader title="Firebase settings" description="Connect Firebase Cloud Messaging so the shop can send push notifications." />
      <NotificationsNav />
      {admin.role === 'SUPER_ADMIN' ? (
        <FirebaseSettings />
      ) : (
        <Card title="Firebase settings">
          <p className="p-4 text-sm text-muted">Only a super admin can view or change the Firebase connection.</p>
        </Card>
      )}
    </>
  );
}

function FirebaseSettings() {
  const query = useApiQuery('notification-provider', fetchProviderConfig);
  return <QueryView query={query}>{(config) => <ProviderPanel config={config} onChanged={query.reload} />}</QueryView>;
}

function ProviderPanel({ config, onChanged }: { config: ProviderConfig; onChanged: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState<'test' | 'toggle' | null>(null);

  async function run(kind: 'test' | 'toggle', work: () => Promise<unknown>, success: string) {
    setBusy(kind);
    try {
      await work();
      toast.success(success);
      onChanged();
    } catch (error) {
      toast.error(describeApiError(toApiError(error)));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {!config.secretsKeyConfigured ? (
        <p role="alert" className="rounded-xl border border-warning p-4 text-sm text-warning">
          The server has no SECRETS_KEY, so credentials cannot be stored. Run “npm run secrets:key” in the Backend folder and restart the API.
        </p>
      ) : null}

      <Card title="Connection status">
        <div className="p-4">
          <dl>
            <DetailRow label="Credentials">{config.configured ? 'Saved' : 'Not saved'}</DetailRow>
            <DetailRow label="Push">{config.isEnabled ? 'On' : 'Off'}</DetailRow>
            <DetailRow label="Project">{config.projectId ?? '—'}</DetailRow>
            <DetailRow label="Service account">{config.clientEmail ?? '—'}</DetailRow>
            <DetailRow label="Key ID">{config.privateKeyIdSuffix ? `…${config.privateKeyIdSuffix}` : '—'}</DetailRow>
            <DetailRow label="Last test">
              {config.lastTestAt ? `${config.lastTestOk ? 'Passed' : 'Failed'} · ${formatDateTime(config.lastTestAt)} · ${config.lastTestMessage ?? ''}` : '—'}
            </DetailRow>
            <DetailRow label="Last success">{config.lastSuccessAt ? formatDateTime(config.lastSuccessAt) : '—'}</DetailRow>
            <DetailRow label="Last failure">{config.lastFailureAt ? `${formatDateTime(config.lastFailureAt)} · ${config.lastFailureMessage ?? ''}` : '—'}</DetailRow>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={!config.configured || busy !== null} loading={busy === 'test'} onClick={() => run('test', testProviderConnection, 'Connection test finished.')}>
              Test connection
            </Button>
            <Button
              variant={config.isEnabled ? 'secondary' : 'primary'}
              disabled={!config.configured || busy !== null}
              loading={busy === 'toggle'}
              onClick={() => run('toggle', () => setProviderEnabled(!config.isEnabled), config.isEnabled ? 'Push notifications turned off.' : 'Push notifications turned on.')}>
              {config.isEnabled ? 'Turn off push notifications' : 'Turn on push notifications'}
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted">
            While push is off, the customer inbox still receives notifications. The Android app also needs its own Firebase configuration file at build time; this page only gives the server permission to send.
          </p>
        </div>
      </Card>

      <CredentialsForm config={config} onSaved={onChanged} />
    </div>
  );
}

function CredentialsForm({ config, onSaved }: { config: ProviderConfig; onSaved: () => void }) {
  const toast = useToast();
  const [projectId, setProjectId] = useState('');
  const [json, setJson] = useState('');
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await saveProviderCredentials({ projectId: projectId.trim(), serviceAccountJson: json, confirmReplace });
      toast.success('Credentials verified with Google and saved.');
      // The secret never stays in the page after it is sent.
      setJson('');
      setConfirmReplace(false);
      onSaved();
    } catch (caught) {
      setError(describeApiError(toApiError(caught)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={config.configured ? 'Replace credentials' : 'Add credentials'}>
      <form className="space-y-4 p-4" onSubmit={submit} autoComplete="off">
        <p className="text-sm text-muted">
          In the Firebase console open Project settings → Service accounts → Generate new private key, then paste the whole downloaded JSON file. It is verified with Google before saving, stored encrypted, and never shown again.
        </p>
        <TextField label="Firebase project ID" required value={projectId} onChange={(e) => setProjectId(e.target.value)} />
        <TextArea
          label="Service account JSON"
          required
          rows={8}
          spellCheck={false}
          autoComplete="off"
          value={json}
          onChange={(e) => setJson(e.target.value)}
          placeholder='{ "type": "service_account", … }'
        />
        {config.configured ? (
          <CheckboxField
            label="Replace the saved credentials"
            hint="The current key keeps working until the new one is accepted by Google."
            checked={confirmReplace}
            onChange={(e) => setConfirmReplace(e.target.checked)}
          />
        ) : null}
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" variant="primary" loading={busy} disabled={!config.secretsKeyConfigured || (config.configured && !confirmReplace)}>
          Verify and save
        </Button>
      </form>
    </Card>
  );
}
