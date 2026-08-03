import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { eq, and } from 'drizzle-orm';
import * as crypto from 'crypto';
import * as databaseModule from '../database/database.module';
import { refreshTokens } from '../database/schema';

interface TokenPayload {
  sub: string;
  email: string;
}

@Injectable()
export class TokenService {
  constructor(
    @Inject(databaseModule.DRIZZLE) private readonly db: databaseModule.DrizzleDB,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateTokenPair(payload: TokenPayload) {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    const refreshTokenRaw = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = this.hashToken(refreshTokenRaw);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.db.insert(refreshTokens).values({
      userId: payload.sub,
      tokenHash: refreshTokenHash,
      expiresAt,
    });

    return { accessToken, refreshToken: refreshTokenRaw };
  }

  async rotateRefreshToken(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);

    const [stored] = await this.db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.tokenHash, tokenHash), eq(refreshTokens.isRevoked, false)));

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.id, stored.id));

    return stored.userId;
  }

  async revokeAllUserTokens(userId: string) {
    await this.db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.userId, userId));
  }

  verifyAccessToken(token: string) {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}