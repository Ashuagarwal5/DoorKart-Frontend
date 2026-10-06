'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { FullScreenSpinner } from '@/components/ui/states';
import { useAuth } from '@/features/auth/auth-context';
import { ApiError, describeApiError } from '@/services/api/api-error';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * What to tell someone whose sign-in failed. Wrong password, unknown email and a
 * deactivated account all come back from the backend as the same INVALID_CREDENTIALS, and
 * this screen keeps them identical, so it cannot be used to find out which emails exist.
 */
function describeLoginFailure(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'INVALID_CREDENTIALS') {
      return 'Incorrect email or password.';
    }
    if (error.code === 'TOO_MANY_REQUESTS') {
      return 'Too many sign-in attempts. Please wait a few minutes and try again.';
    }
    return describeApiError(error);
  }
  return 'Something went wrong. Please try again.';
}

export function LoginScreen() {
  const { state, login, retry } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Already signed in (or just signed in): go to the dashboard.
  useEffect(() => {
    if (state.status === 'authenticated') {
      router.replace('/');
    }
  }, [state.status, router]);

  if (state.status === 'loading' || state.status === 'authenticated') {
    return <FullScreenSpinner />;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const nextErrors: typeof errors = {};
    if (!EMAIL_PATTERN.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (password === '') {
      nextErrors.password = 'Enter your password.';
    }
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      // The effect above sends the admin on once the state changes.
    } catch (error) {
      setFormError(describeLoginFailure(error));
      setPassword('');
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-primary">BuyNest</h1>
          <p className="mt-1 text-sm text-muted">Shop admin sign in</p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-6">
          {state.status === 'unauthenticated' && state.expired ? (
            <p role="status" className="mb-4 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
              Your session has expired. Please sign in again.
            </p>
          ) : null}

          {state.status === 'unreachable' ? (
            <div role="alert" className="space-y-3 text-center">
              <p className="text-sm text-fg">{describeApiError(state.error)}</p>
              <Button variant="primary" onClick={retry}>
                Try again
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="space-y-4">
              {formError ? (
                <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                  {formError}
                </p>
              ) : null}
              <TextField
                label="Email"
                type="email"
                name="email"
                autoComplete="username"
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={errors.email}
                disabled={isSubmitting}
              />
              <TextField
                label="Password"
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                error={errors.password}
                disabled={isSubmitting}
              />
              <Button type="submit" variant="primary" className="w-full" loading={isSubmitting}>
                Sign in
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
