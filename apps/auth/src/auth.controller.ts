import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PATTERNS } from '@app/common';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern(PATTERNS.AUTH_REGISTER)
  async register(@Payload() data: { email: string; password: string; name: string }) {
    return this.authService.register(data.email, data.password, data.name);
  }

  @MessagePattern(PATTERNS.AUTH_LOGIN)
  async login(@Payload() data: { email: string; password: string }) {
    return this.authService.login(data.email, data.password);
  }

  @MessagePattern(PATTERNS.AUTH_VALIDATE_TOKEN)
  async validateToken(@Payload() data: { token: string }) {
    return this.authService.validateToken(data.token);
  }
}