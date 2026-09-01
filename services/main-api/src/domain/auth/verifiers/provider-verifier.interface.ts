/** provider 재검증 결과 — users upsert 입력 (design §0-3) */
export interface VerifiedProfile {
  providerUid: string;
  email: string | null;
  nickname: string;
  avatarUrl: string | null;
}

export interface ProviderVerifier {
  /** provider 토큰을 재검증하고 프로필을 반환. 무효 토큰은 InvalidProviderTokenException */
  verify(token: string): Promise<VerifiedProfile>;
}

export const GOOGLE_VERIFIER = Symbol('GOOGLE_VERIFIER');
export const KAKAO_VERIFIER = Symbol('KAKAO_VERIFIER');
