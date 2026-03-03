import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import * as schema from './schema';
import * as path from 'path';

export const DRIZZLE = 'DRIZZLE';

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('DrizzleModule');
        const dbPath =
          configService.get<string>('DATABASE_PATH') || 'sqlite.db';
        const sqlite = new Database(dbPath);
        const db = drizzle(sqlite, { schema });

        // Run migrations on startup
        try {
          const migrationsFolder = path.resolve(__dirname, '../../drizzle');
          migrate(db, { migrationsFolder });
          logger.log('Database migrations applied successfully');
        } catch (err: any) {
          logger.warn(`Migration skipped or failed: ${err.message}`);
        }

        return db;
      },
      inject: [ConfigService],
    },
  ],
  exports: [DRIZZLE],
})
export class DrizzleModule {}
