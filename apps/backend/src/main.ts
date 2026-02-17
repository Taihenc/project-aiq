import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, LogLevel } from '@nestjs/common';

async function bootstrap() {
  const logLevelsEnv = process.env.LOG_LEVELS;
  const defaultLogLevels: LogLevel[] = ['log', 'error', 'warn'];

  const logLevels: LogLevel[] = logLevelsEnv
    ? (logLevelsEnv.split(',') as LogLevel[])
    : defaultLogLevels;

  const app = await NestFactory.create(AppModule, {
    logger: logLevels,
  });

  const logger = new Logger('Bootstrap');

  // Enable CORS for frontend
  app.enableCors({
    origin: [
      'http://localhost:3001', // Local Next.js dev server
      'http://localhost:8501', // Docker web service
      'http://web:8501', // Docker internal network
    ],
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  logger.log(`Backend service is running on http://localhost:${port}`);
  logger.log(`Active log levels: ${logLevels.join(', ')}`);
}
bootstrap();
