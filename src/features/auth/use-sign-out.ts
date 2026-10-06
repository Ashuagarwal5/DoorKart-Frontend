'use client';

import { useState } from 'react';

import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/features/auth/auth-context';
import { describeApiError, toApiError } from '@/services/api/api-error';

/**
 * Signing out, for any button that offers it. The session is ended on the server first;
 * once that has worked, the auth gate takes the admin to /login. If the server cannot be
 * reached the admin stays signed in and is told, rather than being shown a login page while
 * their session is still alive.
 */
export function useSignOut() {
  const { logout } = useAuth();
  const toast = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const signOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
    } catch (error) {
      toast.error(`Could not sign out. ${describeApiError(toApiError(error))}`);
      setIsSigningOut(false);
    }
  };

  return { signOut, isSigningOut };
}
