import { registerAs } from '@nestjs/config';

export default registerAs('aiService', () => ({
  baseUrl: process.env.AI_SERVICE_BASE_URL ?? 'http://127.0.0.1:8000/v1',
}));
