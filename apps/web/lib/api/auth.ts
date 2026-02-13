import { client } from './client';
import type { LoginResponse } from '@/types';

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await client.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (email: string, password: string, displayName?: string) => {
    const response = await client.post('/auth/register', { email, password, displayName });
    return response.data;
  }
};
