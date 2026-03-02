import {
  Injectable,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DRIZZLE } from '../database/drizzle.module';
import { users } from '../database/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { AuthUser } from './auth.types';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import {
  JWT_ACCESS_TOKEN_EXPIRY,
  JWT_REFRESH_TOKEN_EXPIRY,
  BCRYPT_SALT_ROUNDS,
  AUTH_PROVIDER_LOCAL,
} from '../constants/auth.constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE) private db: BetterSQLite3Database,
    private jwtService: JwtService,
  ) { }

  async validateUser(email: string, pass: string): Promise<any> {
    this.logger.debug(`Validating user: ${email}`);
    const result = this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .all();
    const user = result[0];

    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      this.logger.log(`User validated: ${email}`);
      const { password, ...result } = user;
      return result;
    }

    this.logger.warn(`Failed validation for user: ${email}`);
    return null;
  }

  async login(user: any) {
    this.logger.log(`Logging in user: ${user.email} (${user.id})`);

    const payload = {
      email: user.email,
      sub: user.id,
      authProvider: user.authProvider,
    };

    // Access token
    const access_token = this.jwtService.sign(payload, {
      expiresIn: JWT_ACCESS_TOKEN_EXPIRY,
    });

    // Refresh token
    const refresh_token = this.jwtService.sign(payload, {
      expiresIn: JWT_REFRESH_TOKEN_EXPIRY,
    });

    // Save hashed refresh token to database
    // Note: In production, consider hashing this like a password
    this.db
      .update(users)
      .set({ refreshToken: refresh_token })
      .where(eq(users.id, user.id))
      .run();

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      // Verify token
      const payload = this.jwtService.verify(refreshToken);

      // Check if user exists and has this refresh token
      const userResult = this.db
        .select()
        .from(users)
        .where(eq(users.id, payload.sub))
        .all();

      const user = userResult[0];
      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new access token
      const newPayload = {
        email: user.email,
        sub: user.id,
        authProvider: user.authProvider,
      };

      const access_token = this.jwtService.sign(newPayload, {
        expiresIn: JWT_ACCESS_TOKEN_EXPIRY,
      });

      return {
        access_token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        },
      };
    } catch (e: any) {
      this.logger.error(`Refresh token failed: ${e.message}`);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string) {
    this.logger.log(`Logging out user: ${userId}`);
    this.db
      .update(users)
      .set({ refreshToken: null })
      .where(eq(users.id, userId))
      .run();
  }

  async register(email: string, pass: string, displayName?: string) {
    this.logger.debug(`Registration attempt for: ${email}`);
    const existing = this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .all();
    if (existing.length > 0) {
      this.logger.warn(`Registration failed: user ${email} already exists`);
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(pass, BCRYPT_SALT_ROUNDS);
    const id = uuidv4();

    this.logger.verbose(`Inserting new user record for ${email}`);
    this.db
      .insert(users)
      .values({
        id,
        email,
        password: hashedPassword,
        displayName: displayName || email.split('@')[0],
        authProvider: AUTH_PROVIDER_LOCAL,
      })
      .run();

    const newUser = this.db.select().from(users).where(eq(users.id, id)).get();
    if (!newUser) {
      this.logger.error(`Failed to retrieve newly created user: ${id}`);
      throw new Error('Failed to create user');
    }

    this.logger.log(`User registered successfully: ${email} (${id})`);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = newUser;
    return result;
  }
}
