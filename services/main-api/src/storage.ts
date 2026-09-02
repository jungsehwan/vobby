/** 로컬 스토리지·공개 URL 규약 — S3/CDN 도입 시 이 파일만 교체 (e2e-integration design §0-3) */

export function storageRoot(): string {
  const root = process.env.MEDIA_STORAGE_ROOT;
  if (!root) {
    throw new Error('MEDIA_STORAGE_ROOT 환경변수가 설정되지 않았습니다 (.env.example 참조)');
  }
  return root;
}

/** 브라우저·모바일이 접근하는 절대 URL의 기준 — SSR 내부 URL과 다를 수 있어 별도 env */
export function publicApiBaseUrl(): string {
  return process.env.PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
}

/** storage_key(renders/xxx.mp4) → 공개 스트림 URL. renders 외 키는 비공개 — null */
export function publicFileUrl(storageKey: string | null): string | null {
  if (!storageKey || !storageKey.startsWith('renders/')) return null;
  return `${publicApiBaseUrl()}/files/${storageKey}`;
}
