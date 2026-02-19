import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RouterModule, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import aiServiceConfig from './config/ai-service.config';
import sharepointConfig from './config/sharepoint.config';
import { DrizzleModule } from './database/drizzle.module';
import { AuthModule } from './auth/auth.module';
import { ChatHistoryModule } from './chat-history/chat-history.module';
import { ChatModule } from './chat/chat.module';
import { SharePointModule } from './sharepoint/sharepoint.module';
import { routes } from './app.routes';
import { LoggerMiddleware } from './middleware/logger.middleware';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [aiServiceConfig, sharepointConfig],
    }),
    DrizzleModule,
    AuthModule,
    ChatHistoryModule,
    ChatModule,
    SharePointModule,
    RouterModule.register(routes),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
