import { client } from './client';
import type { ChatSession } from '@/types';

export const historyApi = {
  getHistory: async (): Promise<ChatSession[]> => {
    const response = await client.get('/history');
    return response.data;
  },
  getSession: async (id: string): Promise<{ session: ChatSession, messages: unknown[] }> => {
    const response = await client.get(`/history/${id}`);
    return response.data;
  },
  createSession: async (title?: string): Promise<ChatSession> => {
    const response = await client.post('/history', { title });
    return response.data;
  },
  deleteSession: async (id: string) => {
    await client.delete(`/history/${id}`);
  }
};
