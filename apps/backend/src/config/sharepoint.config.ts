import { registerAs } from '@nestjs/config';

export default registerAs('sharepoint', () => ({
  webhookServiceUrl: process.env.SHAREPOINT_WEBHOOK_URL ?? 'http://127.0.0.1:8010',
  fileStorageUrl: process.env.FILE_STORAGE_URL ?? 'http://127.0.0.1:8007',
}));
