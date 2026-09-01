/** OAuth 제공자 — 확장 시 main-api의 users CHECK 제약도 함께 교체 */
export type AuthProvider = 'google' | 'kakao';

/** 클라이언트에 노출되는 유저 표현 (엔티티 아님 — 와이어 계약) */
export interface PublicUser {
  id: string;
  provider: AuthProvider;
  nickname: string;
  /** Kakao는 동의 항목에 따라 이메일 미제공 */
  email: string | null;
  avatarUrl: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** POST /auth/login 응답 */
export interface LoginResponse extends TokenPair {
  user: PublicUser;
}
