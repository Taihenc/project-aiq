import { client } from './client';
import type { LoginResponse } from '@/types';

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await client.post('auth/login', { email, password });
    if (typeof response.data === 'string' && response.data.trim().startsWith('<')) {
      throw new Error('Received HTML response instead of JSON. Check middleware configuration.');
    }
    return response.data;
  },
  register: async (email: string, password: string, displayName?: string): Promise<LoginResponse> => {
    const response = await client.post('auth/register', { email, password, displayName });
    if (typeof response.data === 'string' && response.data.trim().startsWith('<')) {
      throw new Error('Received HTML response instead of JSON. Check middleware configuration.');
    }
    // Note: register in this app automatically logs the user in on the backend or returns user info
    // For consistency with enterprise flow, we expect it to return tokens if it auto-logs in
    return response.data;
  },
  refresh: async (refreshToken: string): Promise<LoginResponse> => {
    const response = await client.post('auth/refresh', { refresh_token: refreshToken });
    return response.data;
  },
  logout: async (): Promise<void> => {
    await client.post('auth/logout');
  },
};
