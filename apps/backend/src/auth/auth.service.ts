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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE) private db: BetterSQLite3Database,
    private jwtService: JwtService,
  ) {}

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
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    };
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

    const hashedPassword = await bcrypt.hash(pass, 10);
    const id = uuidv4();

    this.logger.verbose(`Inserting new user record for ${email}`);
    this.db
      .insert(users)
      .values({
        id,
        email,
        password: hashedPassword,
        displayName: displayName || email.split('@')[0],
        authProvider: 'local',
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
