import { createHash, randomBytes } from 'node:crypto';
import type { LoginResponse, TokenPair } from '@vobby/shared-types';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { UsersService } from '../user/users.service.js';
import type { AuthProvider } from '../user/user.entity.js';
import { RefreshToken } from './refresh-token.entity.js';
import { InvalidRefreshTokenException } from './exceptions.js';
import {
  GOOGLE_VERIFIER,
  KAKAO_VERIFIER,
  type ProviderVerifier,
} from './verifiers/provider-verifier.interface.js';

const DEFAULT_REFRESH_TTL_DAYS = 30;

@Injectable()
export class AuthService {
  private readonly refreshTtlDays: number;

  constructor(
    @Inject(GOOGLE_VERIFIER) private readonly googleVerifier: ProviderVerifier,
    @Inject(KAKAO_VERIFIER) private readonly kakaoVerifier: ProviderVerifier,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    config: ConfigService,
  ) {
    this.refreshTtlDays = Number(
      config.get('REFRESH_TTL_DAYS', DEFAULT_REFRESH_TTL_DAYS),
    );
  }

  async login(provider: AuthProvider, token: string): Promise<LoginResponse> {
    const verifier =
      provider === 'google' ? this.googleVerifier : this.kakaoVerifier;
    const profile = await verifier.verify(token);
    const user = await this.usersService.upsertByProvider(provider, profile);
    const pair = await this.issueTokens(user.id);
    return {
      ...pair,
      user: {
        id: user.id,
        provider: user.provider,
        nickname: user.nickname,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  /** 회전: 기존 토큰을 원자적으로 무효화한 뒤에만 신규 발급 (design §0-2) */
  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    const tokenHash = this.hash(rawRefreshToken);
    const row = await this.refreshTokens.findOneBy({ tokenHash });
    if (!row || row.revokedAt !== null || row.expiresAt <= new Date()) {
      // revoked 토큰 재제시 = 탈취 가능성 — 동일하게 401 (성공 여부로 정보 노출 금지)
      throw new InvalidRefreshTokenException();
    }
    // 동시 refresh 경쟁: 먼저 revoke를 성공시킨 요청만 신규 발급
    const claimed = await this.refreshTokens.update(
      { tokenHash, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    if (!claimed.affected) {
      throw new InvalidRefreshTokenException();
    }
    return this.issueTokens(row.userId);
  }

  /** 멱등 — 이미 무효화됐거나 없는 토큰이어도 성공으로 처리 */
  async logout(rawRefreshToken: string): Promise<void> {
    await this.refreshTokens.update(
      { tokenHash: this.hash(rawRefreshToken), revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private async issueTokens(userId: string): Promise<TokenPair> {
    const accessToken = await this.jwtService.signAsync({ sub: userId });
    const refreshToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + this.refreshTtlDays * 24 * 60 * 60 * 1000,
    );
    await this.refreshTokens.save(
      this.refreshTokens.create({
        userId,
        tokenHash: this.hash(refreshToken),
        expiresAt,
        revokedAt: null,
      }),
    );
    return { accessToken, refreshToken };
  }

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
