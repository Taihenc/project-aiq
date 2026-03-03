import { client } from './client';

export const sharePointApi = {
  listFiles: async (path?: string) => {
    const response = await client.get('/sharepoint/files', {
      params: { path },
    });
    return response.data;
  },
  uploadFile: async (file: File, path?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await client.post('/sharepoint/upload', formData, {
      params: { path },
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  getFileStatus: async (sourceId: string) => {
    const response = await client.get(`/sharepoint/status/${sourceId}`);
    return response.data;
  },
  ingestFile: async (sourceId: string) => {
    const response = await client.post(`/sharepoint/ingest/${sourceId}`);
    return response.data;
  },
  deleteFile: async (sourceId: string) => {
    const response = await client.delete(`/sharepoint/${sourceId}`);
    return response.data;
  },
  /** Fetch a short-lived SSE token from the authenticated NestJS endpoint. */
  getSSEToken: async () => {
    const response = await client.get('/sharepoint/sse-token');
    return response.data as { token: string };
  },
};
