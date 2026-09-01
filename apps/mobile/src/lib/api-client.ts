import type { ApiErrorBody } from '@vobby/shared-types';
import { getAccessToken } from '@/features/auth/auth-store';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function apiUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new ApiError(0, 'CONFIG_MISSING', 'EXPO_PUBLIC_API_URL이 설정되지 않았습니다');
  }
  return url;
}

/** Bearer 주입 + ApiErrorBody 파싱 공용 래퍼 */
export async function apiFetch<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new ApiError(401, 'AUTH_REQUIRED', '로그인이 필요합니다');
  }
  let res: Response;
  try {
    res = await fetch(`${apiUrl()}${path}`, {
      method: init?.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.body !== undefined && { 'Content-Type': 'application/json' }),
      },
      ...(init?.body !== undefined && { body: JSON.stringify(init.body) }),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', '서버에 연결할 수 없습니다');
  }
  if (!res.ok) {
    let body: Partial<ApiErrorBody> = {};
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      // 본문 없는 에러 응답 — 상태코드만으로 처리
    }
    throw new ApiError(
      res.status,
      body.code ?? `HTTP_${res.status}`,
      body.message ?? `요청 실패 (${res.status})`,
    );
  }
  return (await res.json()) as T;
}
