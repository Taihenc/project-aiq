import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, LogLevel } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { DEFAULT_PORT, SWAGGER_PATH, API_VERSION, CORS_ORIGINS } from './constants/app.constants';

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

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('AINGO Backend API')
    .setDescription('The core API for the AINGO platform')
    .setVersion(API_VERSION)
    .addTag('auth', 'User Authentication')
    .addTag('chat', 'Chat and AI completions')
    .addTag('history', 'Conversation history management')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(SWAGGER_PATH, app, document);

  // Enable CORS for frontend
  app.enableCors({
    origin: CORS_ORIGINS,
    credentials: true,
  });

  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  await app.listen(port, '0.0.0.0');
  logger.log(`Backend service is running on http://localhost:${port}`);
  logger.log(`Swagger documentation available at http://localhost:${port}/${SWAGGER_PATH}`);
  logger.log(`Active log levels: ${logLevels.join(', ')}`);
}
bootstrap();
