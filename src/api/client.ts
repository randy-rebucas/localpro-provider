import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

/* ── CSRF token cache ─────────────────────────────────────────── */
let csrfCache: { token: string; expiresAt: number } | null = null;

async function getCsrfToken(): Promise<string> {
  if (csrfCache && Date.now() < csrfCache.expiresAt * 1000) return csrfCache.token;
  const res = await fetch(`${BASE_URL}/api/auth/csrf`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch CSRF token');
  const data: { token: string; expiresAt: number } = await res.json();
  csrfCache = data;
  return data.token;
}

export function clearCsrfCache() {
  csrfCache = null;
}

/** Attach x-csrf-token to every mutating request */
api.interceptors.request.use(async (config) => {
  const method = config.method?.toUpperCase() ?? 'GET';
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    try {
      config.headers['x-csrf-token'] = await getCsrfToken();
    } catch {
      // If CSRF fetch fails let the request through — server will reject with 403
    }
  }
  return config;
});

/* ── Auth endpoints that must never trigger the 401 → refresh loop */
const AUTH_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: AxiosError | null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve()));
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const url = original?.url ?? '';

    // Clear CSRF cache on 403 (token expired / invalid)
    if (error.response?.status === 403) {
      clearCsrfCache();
    }

    // Never retry auth endpoints — surface the error immediately
    const isAuthPath = AUTH_PATHS.some((p) => url.includes(p));
    if (error.response?.status !== 401 || original._retry || isAuthPath) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => api(original));
    }

    original._retry = true;
    isRefreshing = true;

    try {
      await api.post('/api/auth/refresh');
      processQueue(null);
      return api(original);
    } catch (refreshError) {
      processQueue(refreshError as AxiosError);
      const { useAuthStore } = await import('@/stores/auth-store');
      useAuthStore.getState().clearUser();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
