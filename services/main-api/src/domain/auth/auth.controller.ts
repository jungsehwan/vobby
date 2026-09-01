import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { AuthenticatedUser } from './jwt.strategy.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { UsersService } from '../user/users.service.js';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('auth/login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.provider, dto.token);
  }

  @Post('auth/refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('auth/logout')
  @HttpCode(204)
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request) {
    const { userId } = req.user as AuthenticatedUser;
    const user = await this.usersService.findById(userId);
    if (!user) {
      // 유효한 JWT지만 계정이 삭제된 경우
      throw new UnauthorizedException({ code: 'AUTH_USER_NOT_FOUND' });
    }
    return {
      id: user.id,
      provider: user.provider,
      nickname: user.nickname,
      email: user.email,
      avatarUrl: user.avatarUrl,
    };
  }
}
