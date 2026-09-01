import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import {
  InvalidProviderTokenException,
  ProviderUnavailableException,
} from '../exceptions.js';
import type {
  ProviderVerifier,
  VerifiedProfile,
} from './provider-verifier.interface.js';

@Injectable()
export class GoogleVerifier implements ProviderVerifier {
  private readonly client = new OAuth2Client();
  private readonly clientId: string;

  constructor(config: ConfigService) {
    this.clientId = config.get<string>('OAUTH_GOOGLE_CLIENT_ID', '');
  }

  async verify(idToken: string): Promise<VerifiedProfile> {
    if (!this.clientId) {
      // 콘솔 앱 미등록 상태에서 500 대신 명확한 신호 (plan §6)
      throw new ProviderUnavailableException('google(클라이언트 ID 미설정)');
    }
    let payload;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });
      payload = ticket.getPayload();
    } catch (e) {
      // 서명/만료/aud 오류와 네트워크 오류를 메시지로 구분 (라이브러리가 예외 타입을 나누지 않음)
      const msg = e instanceof Error ? e.message : String(e);
      if (/ENOTFOUND|ETIMEDOUT|ECONNREFUSED|network|fetch failed/i.test(msg)) {
        throw new ProviderUnavailableException('google');
      }
      throw new InvalidProviderTokenException();
    }
    if (!payload?.sub) {
      throw new InvalidProviderTokenException();
    }
    return {
      providerUid: payload.sub,
      email: payload.email ?? null,
      nickname: payload.name ?? '구글사용자',
      avatarUrl: payload.picture ?? null,
    };
  }
}
