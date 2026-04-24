import axios from 'axios';
import { Cookies } from '@/lib/utils/cookies';

const BACKEND_URL = (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_BACKEND_URL)
  ? ''
  : (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000');

export const client = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple refresh calls
let isRefreshing = false;

interface FailedQueueItem {
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
}
let failedQueue: FailedQueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

client.interceptors.request.use(
  (config) => {
    const token = Cookies.get('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet and it's not a refresh/login request
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return client(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = Cookies.get('refresh_token');
      if (!refreshToken) {
        isRefreshing = false;
        // No refresh token, redirect to login
        if (typeof window !== 'undefined') {
          Cookies.remove('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        // Use a clean axios instance to avoid interceptors for refresh call
        const response = await axios.post(`${BACKEND_URL}/api/v1/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token } = response.data;

        // Update cookie
        Cookies.set('auth_token', access_token);

        processQueue(null, access_token);
        isRefreshing = false;

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Refresh failed, clear tokens and redirect
        if (typeof window !== 'undefined') {
          Cookies.remove('auth_token');
          Cookies.remove('refresh_token');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// For streaming endpoints, bypass Next.js rewrite proxy (it buffers responses)
// and call the NestJS backend directly.
const BACKEND_URL_DIRECT =
  (typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_BACKEND_URL || '')
    : (process.env.INTERNAL_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'));

export const streamFetch = async (endpoint: string, body: object): Promise<ReadableStream<Uint8Array> | null> => {
  const attemptFetch = async (token: string | undefined) => {
    const url = `${BACKEND_URL_DIRECT}/api/v1${endpoint}`;
    console.log('[streamFetch] Calling backend:', url);
    return await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(body),
    });
  };

  const response = await attemptFetch(Cookies.get('auth_token'));

  if (response.status === 401) {
    console.log('[streamFetch] Unauthorized, attempting refresh...');
    const refreshToken = Cookies.get('refresh_token');
    if (refreshToken) {
      try {
        const refreshResponse = await axios.post(`${BACKEND_URL}/api/v1/auth/refresh`, {
          refresh_token: refreshToken,
        });
        const { access_token } = refreshResponse.data;
        Cookies.set('auth_token', access_token);

        // Retry with new token
        const retryResponse = await attemptFetch(access_token);
        if (retryResponse.ok) {
          return retryResponse.body;
        }
      } catch (e) {
        console.error('[streamFetch] Refresh failed:', e);
      }
    }

    // Fallback: logout and redirect
    if (typeof window !== 'undefined') {
      Cookies.remove('auth_token');
      Cookies.remove('refresh_token');
      window.location.href = '/login';
    }
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: 'Streaming request failed' }));
    throw new Error(errorData.message || 'Streaming request failed');
  }

  return response.body;
};
