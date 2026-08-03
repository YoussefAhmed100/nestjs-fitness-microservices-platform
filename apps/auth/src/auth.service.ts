import { Injectable, Inject, ConflictException, UnauthorizedException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as databaseModule from './database/database.module';
import { users } from './database/schema';
import { TokenService } from './services/token.service';
import { PATTERNS, UserRegisteredEvent } from '@app/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(databaseModule.DRIZZLE) private readonly db: databaseModule.DrizzleDB,
    private readonly tokenService: TokenService,
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.db.select().from(users).where(eq(users.email, dto.email));
    if (existing.length > 0) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const [newUser] = await this.db
      .insert(users)
      .values({ email: dto.email, password: hashedPassword, name: dto.name })
      .returning();

    this.notificationClient.emit(
      PATTERNS.USER_REGISTERED,
      new UserRegisteredEvent(newUser.id, newUser.email, newUser.name),
    );

    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  async login(dto:LoginDto) {
    const [user] = await this.db.select().from(users).where(eq(users.email, dto.email));
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.tokenService.generateTokenPair({
      sub: user.id,
      email: user.email,
    });

    const { password: _, ...userWithoutPassword } = user;
    return { accessToken: tokens.accessToken, user: userWithoutPassword };
  }

  async refreshTokens(refreshToken: string) {
    const userId = await this.tokenService.rotateRefreshToken(refreshToken);

    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new UnauthorizedException('User not found');

    return this.tokenService.generateTokenPair({ sub: user.id, email: user.email });
  }

  async validateToken(token: string) {
    return this.tokenService.verifyAccessToken(token);
  }

  async logout(userId: string) {
    await this.tokenService.revokeAllUserTokens(userId);
    return { success: true };
  }
}