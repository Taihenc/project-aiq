import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
  console.log(`Backend service is running on http://localhost:${port}`);
}
bootstrap();
