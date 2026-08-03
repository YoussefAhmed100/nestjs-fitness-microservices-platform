import { Injectable, Inject, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import * as databaseModule from './database/database.module';
import { users } from './database/schema';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'; // placeholder type import guard
import { ClientProxy } from '@nestjs/microservices';
import { UserRegisteredEvent } from '@app/common/events/user-registered.event';
import { PATTERNS } from '@app/common';

@Injectable()
export class AuthService {
  constructor(
    @Inject(databaseModule.DRIZZLE) private readonly db: databaseModule.DrizzleDB,
    private readonly jwtService: JwtService,
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
  ) {}

  async register(email: string, password: string, name: string) {
    const existing = await this.db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [newUser] = await this.db
      .insert(users)
      .values({ email, password: hashedPassword, name })
      .returning();

    const { password: _, ...userWithoutPassword } = newUser;
        this.notificationClient.emit(
      PATTERNS.USER_REGISTERED,
      new UserRegisteredEvent(newUser.id, newUser.email, newUser.name),
    );
    return userWithoutPassword;
  }

  async login(email: string, password: string) {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    const { password: _, ...userWithoutPassword } = user;
    return { accessToken, user: userWithoutPassword };
  }

  async validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}