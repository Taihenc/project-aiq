import axios from 'axios';
import { Cookies } from '@/lib/utils/cookies';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export const client = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

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

// For streaming endpoints, bypass Next.js rewrite proxy (it buffers responses)
// and call the NestJS backend directly.
const BACKEND_URL_DIRECT =
  (typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_BACKEND_URL
    : process.env.NEXT_PUBLIC_BACKEND_URL) || 'http://localhost:3000';

export const streamFetch = async (endpoint: string, body: any) => {
  const token = Cookies.get('auth_token');
  const url = `${BACKEND_URL_DIRECT}/api/v1${endpoint}`;
  console.log('[streamFetch] Calling backend directly:', url);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: 'Streaming request failed' }));
    throw new Error(error.message || 'Streaming request failed');
  }

  return response.body;
};
