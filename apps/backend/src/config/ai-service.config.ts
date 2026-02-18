import { registerAs } from '@nestjs/config';

export default registerAs('aiService', () => ({
  baseUrl: process.env.AI_SERVICE_BASE_URL ?? 'http://127.0.0.1:8000',
  aiEngineBaseUrl: process.env.AI_ENGINE_BASE_URL ?? 'http://127.0.0.1:8001',
  defaultCrew: process.env.DEFAULT_CREW ?? 'document_search_crew',
  defaultModel: process.env.DEFAULT_MODEL ?? 'gpt-4o-mini',
  embeddingServiceUrl: process.env.EMBEDDING_SERVICE_URL ?? 'http://127.0.0.1:8003',
}));
