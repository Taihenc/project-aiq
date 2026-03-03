export const DEFAULT_PORT = 3000;
export const SWAGGER_PATH = 'api';
export const API_VERSION = '1.0';
export const CORS_ORIGINS: string[] = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3001', 'http://localhost:8501', 'http://web:8501'];
