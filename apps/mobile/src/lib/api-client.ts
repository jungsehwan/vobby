import type { ApiErrorBody } from '@vobby/shared-types';
import { File as FsFile } from 'expo-file-system';
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
    await throwApiError(res);
  }
  return (await res.json()) as T;
}

async function throwApiError(res: Response): Promise<never> {
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

/** 멀티파트 파일 업로드 — 응답 본문 없는 204 계약용 (e2e-integration) */
export async function apiUploadFile(
  path: string,
  file: { uri: string; name: string },
): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    throw new ApiError(401, 'AUTH_REQUIRED', '로그인이 필요합니다');
  }
  const form = new FormData();
  // Expo fetch는 RN식 {uri,name,type} 파트를 지원하지 않는다("Unsupported FormDataPart") —
  // expo-file-system File(Blob 구현체)로 전달, MIME은 확장자에서 유도된다
  form.append('file', new FsFile(file.uri) as unknown as Blob, file.name);
  let res: Response;
  try {
    res = await fetch(`${apiUrl()}${path}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch (e) {
    // 파일 읽기 실패 등 원인 구분이 필요 — 메시지를 함께 표면화 (DESIGN §6)
    const cause = e instanceof Error ? e.message : String(e);
    throw new ApiError(0, 'NETWORK_ERROR', `파일 업로드 실패: ${cause}`);
  }
  if (!res.ok) {
    await throwApiError(res);
  }
}
