import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PATTERNS } from '@app/common';
import { AuthService } from './auth.service';
import { RegisterDto } from '../../../libs/common/src/dtos/auth/dto/register.dto';
import { LoginDto } from '../../../libs/common/src/dtos/auth/dto/login.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern(PATTERNS.AUTH_REGISTER)
  async register(@Payload() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @MessagePattern(PATTERNS.AUTH_LOGIN)
  async login(@Payload() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @MessagePattern(PATTERNS.AUTH_REFRESH)
  async refresh(@Payload() data: { refreshToken: string }) {
    return this.authService.refreshTokens(data.refreshToken);
  }

  @MessagePattern(PATTERNS.AUTH_LOGOUT)
  async logout(@Payload() data: { userId: string }) {
    return this.authService.logout(data.userId);
  }

  @MessagePattern(PATTERNS.AUTH_VALIDATE_TOKEN)
  async validateToken(@Payload() data: { token: string }) {
    return this.authService.validateToken(data.token);
  }
}
