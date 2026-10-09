'use client';

import { createContext, type PropsWithChildren, use, useCallback, useEffect, useState } from 'react';

import { fetchMe, login as loginRequest, logout as logoutRequest } from '@/services/api/admin-api';
import { ApiError } from '@/services/api/api-error';
import { setUnauthorizedHandler } from '@/services/api/client';
import type { AdminProfile } from '@/types/api';

/**
 * Who is signed in. The truth lives on the server, in a cookie this code cannot even read
 * (it is HttpOnly), so the only way to know is to ask: `GET /auth/me`. There is no token,
 * password or flag stored in the browser, and nothing in localStorage or sessionStorage.
 */
type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; admin: AdminProfile }
  /** `expired` is true when a signed-in session ended while the panel was open. */
  | { status: 'unauthenticated'; expired: boolean }
  /** The server could not be reached, so nobody knows whether a session exists. */
  | { status: 'unreachable'; error: ApiError };

type AuthContextValue = {
  state: AuthState;
  /** Asks the server again after an unreachable result. */
  retry: () => void;
  login: (email: string, password: string) => Promise<void>;
  /** Ends the session on the SERVER first; the panel only signs out if that worked. */
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const [attempt, setAttempt] = useState(0);

  // Restore the session on load (and again after a retry).
  useEffect(() => {
    // The "who am I" check is one small request, so it is not cancelled when this effect is
    // cleaned up (React does that on purpose in development); its answer is just ignored.
    let isStale = false;
    fetchMe().then(
      ({ admin }) => {
        if (!isStale) {
          setState({ status: 'authenticated', admin });
        }
      },
      (error: unknown) => {
        if (isStale) {
          return;
        }
        // Being signed out is the normal answer here, not an expiry. But if the server could
        // not be reached at all we cannot say that, so the panel reports it instead of
        // quietly sending the admin to a login page that would also fail.
        const isDown =
          error instanceof ApiError &&
          (error.isConnectionProblem || error.code === 'SERVER_ERROR' || error.code === 'CONFIGURATION_ERROR');
        setState(
          isDown ? { status: 'unreachable', error } : { status: 'unauthenticated', expired: false }
        );
      }
    );
    return () => {
      isStale = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);
  // Any request that comes back 401 while signed in ends the session.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setState((current) =>
        current.status === 'authenticated' ? { status: 'unauthenticated', expired: true } : current
      );
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const value: AuthContextValue = {
    state,
    retry,
    login: async (email, password) => {
      const { admin } = await loginRequest(email, password);
      setState({ status: 'authenticated', admin });
    },
    logout: async () => {
      try {
        await logoutRequest();
      } catch (error) {
        // A 401 means the session was already gone, which is what was wanted. Any other
        // failure (server down) means it may still be alive, so stay signed in and say so.
        if (!(error instanceof ApiError && error.code === 'UNAUTHENTICATED')) {
          throw error;
        }
      }
      setState({ status: 'unauthenticated', expired: false });
    },
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}

/** The signed-in admin. Only call this below the auth gate, where one is guaranteed. */
export function useAdmin(): AdminProfile {
  const { state } = useAuth();
  if (state.status !== 'authenticated') {
    throw new Error('useAdmin was used while nobody is signed in');
  }
  return state.admin;
}
