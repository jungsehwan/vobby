import { HttpException, HttpStatus } from '@nestjs/common';

/** 토큰 자체가 무효 (위조/만료/대상 불일치) — 클라이언트 재로그인 필요 */
export class InvalidProviderTokenException extends HttpException {
  constructor() {
    super(
      { code: 'AUTH_INVALID_PROVIDER_TOKEN', message: '유효하지 않은 인증 토큰입니다' },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

/** provider 서버 통신 실패 — 사용자 잘못이 아님을 401과 구분 (design §0-4) */
export class ProviderUnavailableException extends HttpException {
  constructor(provider: string) {
    super(
      { code: 'AUTH_PROVIDER_UNAVAILABLE', message: `${provider} 인증 서버에 연결할 수 없습니다` },
      HttpStatus.BAD_GATEWAY,
    );
  }
}

export class InvalidRefreshTokenException extends HttpException {
  constructor() {
    super(
      { code: 'AUTH_INVALID_REFRESH_TOKEN', message: '유효하지 않은 refresh 토큰입니다' },
      HttpStatus.UNAUTHORIZED,
    );
  }
}
