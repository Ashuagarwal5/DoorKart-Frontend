'use client';

import { Button } from '@/components/ui/button';
import { Card, DetailRow } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { useAdmin } from '@/features/auth/auth-context';
import { useSignOut } from '@/features/auth/use-sign-out';
import { API_BASE_URL } from '@/services/api/config';

const ROLE_LABEL = { SUPER_ADMIN: 'Super admin', ADMIN: 'Admin' } as const;

/**
 * Deliberately small: only what the backend supports. There are no preferences to change
 * yet, and no password or user management.
 */
export function SettingsPage() {
  const admin = useAdmin();
  const { signOut, isSigningOut } = useSignOut();

  return (
    <>
      <PageHeader title="Settings" />

      <div className="max-w-2xl space-y-6">
        <Card title="Signed in as">
          <dl className="space-y-3">
            <DetailRow label="Name">{admin.name}</DetailRow>
            <DetailRow label="Email">{admin.email}</DetailRow>
            <DetailRow label="Role">{ROLE_LABEL[admin.role]}</DetailRow>
          </dl>
          <div className="mt-4">
            <Button loading={isSigningOut} onClick={signOut}>
              Sign out
            </Button>
          </div>
        </Card>

        {/* Only while developing: a production build does not advertise its server address. */}
        {process.env.NODE_ENV !== 'production' ? (
          <Card title="Development">
            <dl className="space-y-3">
              <DetailRow label="Backend address">{API_BASE_URL || 'Not set'}</DetailRow>
            </dl>
            <p className="mt-3 text-xs text-muted">
              Set by NEXT_PUBLIC_API_BASE_URL. The backend&apos;s CORS_ORIGINS must include this panel&apos;s address.
            </p>
          </Card>
        ) : null}
      </div>
    </>
  );
}
