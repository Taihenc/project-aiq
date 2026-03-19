import { client } from './client';
import type { ChatSession, PaginatedHistoryResponse, PaginatedMessagesResponse, BackendMessage } from '@/types';
import type { Citation } from './chat';

export interface MessageTreeResponse {
  messages: BackendMessage[];
  activePath: string[];
}

export interface PathCitationsResponse {
  citations: Citation[];
}

export const historyApi = {
  getHistory: async (params?: { limit?: number; cursor?: string }): Promise<PaginatedHistoryResponse> => {
    const response = await client.get('/history', { params });
    return response.data;
  },
  getSession: async (id: string, params?: { limit?: number; before?: string }): Promise<PaginatedMessagesResponse> => {
    const response = await client.get(`/history/${id}`, { params });
    return response.data;
  },
  getSessionTree: async (id: string, tip?: string): Promise<MessageTreeResponse> => {
    const response = await client.get(`/history/${id}/tree`, { params: tip ? { tip } : undefined });
    return response.data;
  },
  checkSession: async (id: string): Promise<boolean> => {
    const response = await client.get(`/history/check/${id}`);
    return response.data.exists;
  },
  createSession: async (title?: string): Promise<ChatSession> => {
    const response = await client.post('/history', { title });
    return response.data;
  },
  deleteSession: async (id: string) => {
    await client.delete(`/history/${id}`);
  },
  getPathCitations: async (id: string, tip?: string): Promise<PathCitationsResponse> => {
    const response = await client.get(`/history/${id}/citations`, { params: tip ? { tip } : undefined });
    return response.data;
  },
};
