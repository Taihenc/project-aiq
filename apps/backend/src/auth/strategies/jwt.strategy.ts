import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Inject, UnauthorizedException, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../database/drizzle.module';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { users } from '../../database/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Inject(DRIZZLE) private db: BetterSQLite3Database,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'dev_secret_key',
    });
  }

  async validate(payload: any) {
    // Check if user exists in database
    const userResult = this.db
      .select()
      .from(users)
      .where(eq(users.id, payload.sub))
      .all();

    const user = userResult[0];
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      authProvider: payload.authProvider,
    };
  }
}
