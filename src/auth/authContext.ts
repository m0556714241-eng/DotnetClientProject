import { createContext, useContext } from 'react';
import type { LoginDto, RegisterDto, UserRole } from '../types/api';
import type { Session } from './session';

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isCustomer: boolean;
  login: (dto: LoginDto) => Promise<AuthUser>;
  register: (dto: RegisterDto) => Promise<AuthUser>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function toAuthUser(session: Session): AuthUser {
  return {
    id: session.userId,
    email: session.email,
    fullName: session.fullName,
    role: session.role,
  };
}
