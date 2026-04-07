import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

/** Auth endpoints that must never trigger the 401 → refresh loop */
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
