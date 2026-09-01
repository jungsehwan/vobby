import type { ShortFormPublicView } from '@vobby/shared-types';

// 서버 전용 — NEXT_PUBLIC 아님 (클라이언트에 API 주소 비노출, design §2.2)
function apiBaseUrl(): string {
  const url = process.env.API_BASE_URL;
  if (!url) {
    throw new Error('API_BASE_URL 환경변수가 설정되지 않았습니다 (.env.example 참조)');
  }
  return url;
}

export type ShortFormFetchResult =
  | { kind: 'found'; shortForm: ShortFormPublicView }
  | { kind: 'not-found' }
  | { kind: 'api-error' };

/** RSC/generateMetadata 공용 — Next fetch 캐시(60s)로 중복 호출 제거 (design §0-1) */
export async function fetchShortForm(slug: string): Promise<ShortFormFetchResult> {
  let res: Response;
  try {
    res = await fetch(
      `${apiBaseUrl()}/v1/short-forms/by-slug/${encodeURIComponent(slug)}`,
      { next: { revalidate: 60 } },
    );
  } catch {
    // API 다운 — 조용한 빈 화면 대신 명확한 오류 상태 (plan §5)
    return { kind: 'api-error' };
  }
  if (res.status === 404) return { kind: 'not-found' };
  if (!res.ok) return { kind: 'api-error' };
  return { kind: 'found', shortForm: (await res.json()) as ShortFormPublicView };
}
