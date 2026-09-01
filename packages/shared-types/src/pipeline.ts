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
