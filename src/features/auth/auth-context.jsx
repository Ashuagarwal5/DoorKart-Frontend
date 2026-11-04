'use client';

import { createContext, use, useCallback, useEffect, useState } from 'react';

import { fetchMe, login as loginRequest, logout as logoutRequest } from '@/services/api/admin-api';
import { ApiError } from '@/services/api/api-error';
import { setUnauthorizedHandler } from '@/services/api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading' });

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
      (error) => {
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

  const value = {
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

export function useAuth() {
  const context = use(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}

/** The signed-in admin. Only call this below the auth gate, where one is guaranteed. */
export function useAdmin() {
  const { state } = useAuth();
  if (state.status !== 'authenticated') {
    throw new Error('useAdmin was used while nobody is signed in');
  }
  return state.admin;
}
