import { describe, expect, it, beforeEach } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';
import { AuthService } from './auth.service.js';
import { RefreshToken } from './refresh-token.entity.js';
import {
  InvalidProviderTokenException,
  InvalidRefreshTokenException,
} from './exceptions.js';
import type {
  ProviderVerifier,
  VerifiedProfile,
} from './verifiers/provider-verifier.interface.js';
import type { UsersService } from '../user/users.service.js';
import type { AuthProvider, User } from '../user/user.entity.js';

const GOOD_GOOGLE_TOKEN = 'valid-google-id-token';
const PROFILE: VerifiedProfile = {
  providerUid: 'g-123',
  email: 'a@b.c',
  nickname: '테스터',
  avatarUrl: null,
};

function stubVerifier(validToken: string, profile: VerifiedProfile): ProviderVerifier {
  return {
    verify: (token: string) => {
      if (token !== validToken) throw new InvalidProviderTokenException();
      return Promise.resolve(profile);
    },
  };
}

/** users 인메모리 페이크 — upsert 의미론만 재현 */
function fakeUsersService() {
  const byKey = new Map<string, User>();
  let seq = 0;
  return {
    upsertByProvider(provider: AuthProvider, p: VerifiedProfile) {
      const key = `${provider}:${p.providerUid}`;
      const existing = byKey.get(key);
      if (existing) {
        existing.nickname = p.nickname;
        return Promise.resolve(existing);
      }
      const user = {
        id: `user-${++seq}`,
        provider,
        providerUid: p.providerUid,
        email: p.email,
        nickname: p.nickname,
        avatarUrl: p.avatarUrl,
      } as User;
      byKey.set(key, user);
      return Promise.resolve(user);
    },
    count: () => byKey.size,
  };
}

/** refresh_tokens 인메모리 페이크 — findOneBy/update(revoked IS NULL 조건)/save */
function fakeRefreshRepo() {
  const rows: RefreshToken[] = [];
  return {
    rows,
    create: (x: Partial<RefreshToken>) => x as RefreshToken,
    save: (x: RefreshToken) => {
      rows.push(x);
      return Promise.resolve(x);
    },
    findOneBy: ({ tokenHash }: { tokenHash: string }) =>
      Promise.resolve(rows.find((r) => r.tokenHash === tokenHash) ?? null),
    update: (
      criteria: { tokenHash: string },
      patch: { revokedAt: Date },
    ) => {
      let affected = 0;
      for (const r of rows) {
        if (r.tokenHash === criteria.tokenHash && r.revokedAt === null) {
          r.revokedAt = patch.revokedAt;
          affected++;
        }
      }
      return Promise.resolve({ affected });
    },
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let users: ReturnType<typeof fakeUsersService>;
  let repo: ReturnType<typeof fakeRefreshRepo>;

  beforeEach(() => {
    users = fakeUsersService();
    repo = fakeRefreshRepo();
    service = new AuthService(
      stubVerifier(GOOD_GOOGLE_TOKEN, PROFILE),
      stubVerifier('valid-kakao-token', { ...PROFILE, providerUid: 'k-1' }),
      users as unknown as UsersService,
      new JwtService({ secret: 'test-secret', signOptions: { expiresIn: '1h' } }),
      repo as unknown as Repository<RefreshToken>,
      { get: (_k: string, d?: unknown) => d } as unknown as ConfigService,
    );
  });

  it('신규 로그인 — 유저 생성 + 토큰 쌍 발급, DB에는 해시만 저장', async () => {
    const result = await service.login('google', GOOD_GOOGLE_TOKEN);
    expect(result.user.nickname).toBe('테스터');
    expect(result.accessToken).toBeTruthy();
    expect(users.count()).toBe(1);
    // 평문 refresh가 저장소에 존재하면 안 됨 (design §0-2)
    expect(repo.rows[0].tokenHash).not.toBe(result.refreshToken);
    expect(repo.rows[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('재로그인 — 유저 중복 생성 없음', async () => {
    const first = await service.login('google', GOOD_GOOGLE_TOKEN);
    const second = await service.login('google', GOOD_GOOGLE_TOKEN);
    expect(second.user.id).toBe(first.user.id);
    expect(users.count()).toBe(1);
  });

  it('위조 provider 토큰 — 401 예외 전파', async () => {
    await expect(service.login('google', 'forged')).rejects.toBeInstanceOf(
      InvalidProviderTokenException,
    );
  });

  it('refresh 회전 — 신규 발급 후 이전 토큰 재사용 거부', async () => {
    const { refreshToken } = await service.login('google', GOOD_GOOGLE_TOKEN);
    const rotated = await service.refresh(refreshToken);
    expect(rotated.refreshToken).not.toBe(refreshToken);
    await expect(service.refresh(refreshToken)).rejects.toBeInstanceOf(
      InvalidRefreshTokenException,
    );
    // 회전된 새 토큰은 유효
    await expect(service.refresh(rotated.refreshToken)).resolves.toBeTruthy();
  });

  it('존재하지 않는 refresh — 거부', async () => {
    await expect(service.refresh('f'.repeat(64))).rejects.toBeInstanceOf(
      InvalidRefreshTokenException,
    );
  });

  it('logout — 이후 refresh 거부, 재호출은 멱등', async () => {
    const { refreshToken } = await service.login('google', GOOD_GOOGLE_TOKEN);
    await service.logout(refreshToken);
    await expect(service.refresh(refreshToken)).rejects.toBeInstanceOf(
      InvalidRefreshTokenException,
    );
    await expect(service.logout(refreshToken)).resolves.toBeUndefined();
  });
});
