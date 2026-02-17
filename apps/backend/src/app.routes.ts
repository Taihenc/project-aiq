import { Routes } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { ChatHistoryModule } from './chat-history/chat-history.module';
import { ChatModule } from './chat/chat.module';

export const routes: Routes = [
  {
    path: 'api/v1',
    children: [
      {
        path: 'auth',
        module: AuthModule,
      },
      {
        path: 'history',
        module: ChatHistoryModule,
      },
      {
        path: 'chat',
        module: ChatModule,
      },
    ],
  },
];
