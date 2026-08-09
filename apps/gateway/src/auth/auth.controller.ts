import {
  Controller,
  Post,
  Body,
  UseFilters,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { PATTERNS } from '@app/common';
import { RegisterDto } from 'libs/common/dto/register.dto';
import { LoginDto } from 'libs/common/dto/login.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return firstValueFrom(this.authClient.send(PATTERNS.AUTH_REGISTER, dto));
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return firstValueFrom(this.authClient.send(PATTERNS.AUTH_LOGIN, dto));
  }
  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refresh(@Body() dto: { refreshToken: string }) {
    return firstValueFrom(this.authClient.send(PATTERNS.AUTH_REFRESH, dto));
  }
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Body() dto: { userId: string }) {
    return firstValueFrom(this.authClient.send(PATTERNS.AUTH_LOGOUT, dto));
  }
}
