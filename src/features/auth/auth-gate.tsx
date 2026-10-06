'use client';

import { useRouter } from 'next/navigation';
import { type PropsWithChildren, useEffect } from 'react';

import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { FullScreenSpinner } from '@/components/ui/states';
import { useAuth } from '@/features/auth/auth-context';
import { describeApiError } from '@/services/api/api-error';

/**
 * Guards every signed-in page. This is for the admin's convenience (nobody sees a screen
 * they cannot use); the real protection is that the backend refuses every admin request
 * that has no valid session.
 *
 * Nothing protected is drawn until the server has answered, so there is no flash of
 * content for someone who is signed out.
 */
export function AuthGate({ children }: PropsWithChildren) {
  const { state, retry } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [state.status, router]);

  if (state.status === 'unreachable') {
    return (
      <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-lg font-semibold text-fg">Cannot reach the server</p>
        <p className="max-w-md text-sm text-muted">{describeApiError(state.error)}</p>
        <Button variant="primary" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  }

  if (state.status !== 'authenticated') {
    // Loading, or signed out and being sent to /login.
    return <FullScreenSpinner label={state.status === 'loading' ? 'Loading…' : 'Redirecting to sign in…'} />;
  }

  return <AppShell>{children}</AppShell>;
}
