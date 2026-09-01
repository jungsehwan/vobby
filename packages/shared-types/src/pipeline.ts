/** 숏폼 렌더링 상태 머신 — 파이프라인 단계와 1:1 (short_forms.status CHECK와 동일) */
export type ShortFormStatus =
  | 'requested'
  | 'analyzing'
  | 'rendering'
  | 'done'
  | 'failed';

/** Redis 진행률 키(vobby:progress:{taskId}) 값 계약 — 기록: ai-pipeline common/progress.py */
export interface TaskProgress {
  status: string;
  detail: unknown;
  updatedAt: string;
}

/** GET /v1/short-forms/by-slug/:slug — 로그인 없는 공유 뷰어용 공개 표현 */
export interface ShortFormPublicView {
  shareSlug: string;
  title: string | null;
  status: ShortFormStatus;
  /** 마일스톤 4(렌더러) 전까지 null */
  videoKey: string | null;
  thumbnailKey: string | null;
  durationS: number | null;
  stats: {
    /** 사진 GPS 시퀀스 근사 — GPS 사진 없는 여행은 null */
    distanceM: number | null;
    durationS: number;
    mediaCount: number;
  };
  createdAt: string;
}
