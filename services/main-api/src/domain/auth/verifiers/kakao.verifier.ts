import { Injectable } from '@nestjs/common';
import {
  InvalidProviderTokenException,
  ProviderUnavailableException,
} from '../exceptions.js';
import type {
  ProviderVerifier,
  VerifiedProfile,
} from './provider-verifier.interface.js';

const KAKAO_ME_URL = 'https://kapi.kakao.com/v2/user/me';
const TIMEOUT_MS = 5_000;

interface KakaoMeResponse {
  id: number;
  kakao_account?: {
    email?: string;
    profile?: { nickname?: string; profile_image_url?: string };
  };
}

@Injectable()
export class KakaoVerifier implements ProviderVerifier {
  async verify(accessToken: string): Promise<VerifiedProfile> {
    let res: Response;
    try {
      res = await fetch(KAKAO_ME_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new ProviderUnavailableException('kakao');
    }
    if (res.status === 401) {
      throw new InvalidProviderTokenException();
    }
    if (!res.ok) {
      throw new ProviderUnavailableException('kakao');
    }
    let body: KakaoMeResponse;
    try {
      body = (await res.json()) as KakaoMeResponse;
    } catch {
      // 200이지만 본문이 JSON이 아닌 이상 응답(프록시 개입 등) — 500 대신 502
      throw new ProviderUnavailableException('kakao');
    }
    if (!body.id) {
      throw new InvalidProviderTokenException();
    }
    const account = body.kakao_account;
    return {
      providerUid: String(body.id),
      // Kakao는 동의 항목에 따라 이메일 미제공 — users.email nullable로 흡수
      email: account?.email ?? null,
      nickname: account?.profile?.nickname ?? '카카오사용자',
      avatarUrl: account?.profile?.profile_image_url ?? null,
    };
  }
}
