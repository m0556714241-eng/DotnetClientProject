import axios from 'axios';
import { API_URL } from '../config';
import { getToken } from '../auth/session';
import { toApiError } from './errors';

// THE axios instance. Every request in the app goes through here.
export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 20000,
});

// 1. Attach the JWT (if there is one) to every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. On 401 (token missing / invalid / expired) – tell the app ONCE, even if several requests fail together.
//    The AuthProvider registers the handler (clear the session + go to /login with the current page).
//    403 is NOT handled here: it means "logged in, but not allowed" – the page shows a message instead.
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;
let handlingUnauthorized = false;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

// Called after a successful login, so a future 401 is handled again
export function resetUnauthorizedGuard() {
  handlingUnauthorized = false;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = toApiError(error);
    const url: string = error?.config?.url ?? '';
    // A 401 from /auth/login is "wrong email or password" – not an expired session
    const isAuthEndpoint = url.startsWith('/auth/');

    if (apiError.status === 401 && !isAuthEndpoint && !handlingUnauthorized) {
      handlingUnauthorized = true;
      unauthorizedHandler?.();
    }

    return Promise.reject(apiError);
  },
);
