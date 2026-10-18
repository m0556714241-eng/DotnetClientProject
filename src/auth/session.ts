import type { UserTokenDto } from '../types/api';

// The ONLY place that touches the stored session (token + basic user details).
// Trade-off (documented in the README): localStorage is simple and survives a refresh,
// but is readable by any script on the page – so the app never injects untrusted HTML,
// never logs the token, and drops it as soon as it expires or the server answers 401.
const KEY = 'seatwise.session';

export type Session = UserTokenDto;

export function isExpired(session: Session): boolean {
  return new Date(session.expiresAt).getTime() <= Date.now();
}

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    if (!session?.token || !session.expiresAt || isExpired(session)) {
      localStorage.removeItem(KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function writeSession(session: Session): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Storage blocked (private mode) – the session lives only in memory for this tab
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function getToken(): string | null {
  return readSession()?.token ?? null;
}
