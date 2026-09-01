import type { GeoLineStringZM } from './geo.js';
import type { MediaCoordSource } from './media.js';

/** POST /v1/trips 요청 — 여행 메타 + 미디어 메타 일괄 (원본 파일은 별도 기능) */
export interface TripMediaUpload {
  type: 'photo' | 'video';
  /** ISO 8601 */
  capturedAt: string;
  lon: number | null;
  lat: number | null;
  source: MediaCoordSource;
  width: number | null;
  height: number | null;
}

export interface TripUploadRequest {
  /** 모바일의 결정적 여행 id — 서버 멱등키 (user 스코프) */
  clientKey: string;
  title: string | null;
  startedAt: string;
  endedAt: string;
  path: GeoLineStringZM | null;
  distanceM: number | null;
  media: TripMediaUpload[];
}

/** POST 응답 및 GET /v1/trips 목록 항목 */
export interface TripSummary {
  id: string;
  clientKey: string;
  title: string | null;
  startedAt: string;
  endedAt: string;
  distanceM: number | null;
  mediaCount: number;
}
