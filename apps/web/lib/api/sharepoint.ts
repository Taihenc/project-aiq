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
};
