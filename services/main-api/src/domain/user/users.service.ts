import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, type AuthProvider } from './user.entity.js';
import type { VerifiedProfile } from '../auth/verifiers/provider-verifier.interface.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  /** 로그인 시 계정 매핑 — 기존 유저면 프로필 최신화, 없으면 가입 */
  async upsertByProvider(
    provider: AuthProvider,
    profile: VerifiedProfile,
  ): Promise<User> {
    const existing = await this.users.findOneBy({
      provider,
      providerUid: profile.providerUid,
    });
    if (existing) {
      existing.email = profile.email;
      existing.nickname = profile.nickname;
      existing.avatarUrl = profile.avatarUrl;
      return this.users.save(existing);
    }
    return this.users.save(
      this.users.create({
        provider,
        providerUid: profile.providerUid,
        email: profile.email,
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl,
      }),
    );
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }
}
