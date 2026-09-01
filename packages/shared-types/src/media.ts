/** 미디어 좌표 출처 — 모바일 로컬 매칭과 서버 스키마가 공유하는 규약.
 *  AI 분석(마일스톤 3)에서 신뢰도 가중치로 사용: exif(실측) > timesync(±60s 근사) > none */
export type MediaCoordSource = 'exif' | 'timesync' | 'none';
