import type { GeoLineStringZM } from '@vobby/shared-types';
import type { LocationPoint } from './location-parsers';
import type { TripMedia } from './trips-db';

/** Nest JSON 바디 100kb 방어 — 초과 시 균등 다운샘플, 시작·끝 보존 (design §0-3) */
export const MAX_PATH_POINTS = 500;

export function downsample(points: LocationPoint[]): LocationPoint[] {
  if (points.length <= MAX_PATH_POINTS) return points;
  const picked: LocationPoint[] = [];
  for (let i = 0; i < MAX_PATH_POINTS; i++) {
    picked.push(points[Math.round((i * (points.length - 1)) / (MAX_PATH_POINTS - 1))]);
  }
  return picked;
}

/** 사진 GPS + 여행 범위 내 외부 포인트의 시간순 병합 — 서버 path 규약과 1:1 */
export function buildPath(media: TripMedia[], extPoints: LocationPoint[]): GeoLineStringZM | null {
  const merged: LocationPoint[] = [
    ...media
      .filter((m) => m.lon !== null && m.lat !== null)
      .map((m) => ({ t: m.captured_at, lon: m.lon!, lat: m.lat! })),
    ...extPoints,
  ].sort((a, b) => a.t - b.t);
  if (merged.length < 2) return null;
  return {
    type: 'LineString',
    coordinates: downsample(merged).map((p) => [p.lon, p.lat, 0, p.t]),
  };
}
