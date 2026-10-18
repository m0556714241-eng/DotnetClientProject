import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { resetUnauthorizedGuard, setUnauthorizedHandler } from '../api/client';
import { queryKeys } from '../api/queryKeys';
import type { LoginDto, RegisterDto } from '../types/api';
import { AuthContext, toAuthUser, type AuthContextValue } from './authContext';
import { clearSession, readSession, writeSession, type Session } from './session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => readSession());
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const endSession = useCallback(() => {
    clearSession();
    setSession(null);
    // Private data must not stay in the cache after logout
    queryClient.removeQueries({ queryKey: queryKeys.bookings.all });
  }, [queryClient]);

  const startSession = useCallback((s: Session) => {
    writeSession(s);
    setSession(s);
    resetUnauthorizedGuard();
    return toAuthUser(s);
  }, []);

  // The server answered 401 to a request that needed a token -> back to login, then back here
  useEffect(() => {
    setUnauthorizedHandler(() => {
      endSession();
      const from = window.location.pathname + window.location.search;
      navigate('/login', { replace: true, state: { from, reason: 'expired' } });
    });
    return () => setUnauthorizedHandler(null);
  }, [endSession, navigate]);

  // Log out exactly when the token expires (no request with a dead token)
  useEffect(() => {
    if (!session) return;
    const ms = new Date(session.expiresAt).getTime() - Date.now();
    if (ms <= 0) {
      endSession();
      return;
    }
    // setTimeout can't hold more than ~24.8 days – the token lives 2 hours, so this is fine
    const timer = window.setTimeout(endSession, Math.min(ms, 2_147_000_000));
    return () => window.clearTimeout(timer);
  }, [session, endSession]);

  const login = useCallback(async (dto: LoginDto) => startSession(await authApi.login(dto)), [startSession]);
  const register = useCallback(
    async (dto: RegisterDto) => startSession(await authApi.register(dto)),
    [startSession],
  );

  const value = useMemo<AuthContextValue>(() => {
    const user = session ? toAuthUser(session) : null;
    return {
      user,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'Admin',
      isCustomer: user?.role === 'Customer',
      login,
      register,
      logout: endSession,
    };
  }, [session, login, register, endSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
