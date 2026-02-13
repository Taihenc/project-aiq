import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
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
  constructor(
    @Inject(DRIZZLE) private db: BetterSQLite3Database,
    private jwtService: JwtService,
  ) { }

  async validateUser(email: string, pass: string): Promise<any> {
    const result = this.db.select().from(users).where(eq(users.email, email)).all();
    const user = result[0];

    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      authProvider: user.authProvider
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      }
    };
  }

  async register(email: string, pass: string, displayName?: string) {
    const existing = this.db.select().from(users).where(eq(users.email, email)).all();
    if (existing.length > 0) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(pass, 10);
    const id = uuidv4();

    this.db.insert(users).values({
      id,
      email,
      password: hashedPassword,
      displayName: displayName || email.split('@')[0],
      authProvider: 'local'
    }).run();

    const newUser = this.db.select().from(users).where(eq(users.id, id)).get();
    if (!newUser) throw new Error('Failed to create user');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = newUser;
    return result;
  }
}
