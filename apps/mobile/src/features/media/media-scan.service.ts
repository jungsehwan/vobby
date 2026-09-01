// v57의 신규(Next) API 대신 legacy — getAssetsAsync 페이지네이션·EXIF 조회가 필요 (design §0-3)
import * as MediaLibrary from 'expo-media-library/legacy';
import {
  getPoints,
  type RecordedPoint,
  type RecordingSession,
} from '../recording/recording-db';
import {
  upsertSessionMedia,
  type MediaCoordSource,
  type SessionMedia,
} from './media-db';

/** Time-Sync 허용 오차 — 초과 시 오좌표 부여 대신 미매칭 (design §0-1) */
const TIMESYNC_TOLERANCE_S = 60;
const PAGE_SIZE = 100;

export type ScanPermission = 'granted' | 'denied';

export async function requestMediaPermission(): Promise<ScanPermission> {
  const res = await MediaLibrary.requestPermissionsAsync();
  return res.granted ? 'granted' : 'denied';
}

/** recorded_at 오름차순 포인트에서 목표 시각 최근접 포인트 이진 탐색 */
function nearestPoint(
  points: RecordedPoint[],
  targetSec: number,
): RecordedPoint | null {
  if (points.length === 0) return null;
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].recorded_at < targetSec) lo = mid + 1;
    else hi = mid;
  }
  const cand = [points[lo], points[lo - 1]].filter(Boolean) as RecordedPoint[];
  cand.sort(
    (a, b) =>
      Math.abs(a.recorded_at - targetSec) - Math.abs(b.recorded_at - targetSec),
  );
  return cand[0];
}

/** EXIF DateTimeOriginal("YYYY:MM:DD HH:MM:SS") → epoch초. 실패 시 null.
 *  EXIF에는 타임존이 없어 기기 TZ로 해석 — 촬영지 TZ가 다르면(해외여행) 오차 발생 가능 (EXIF 규격 한계) */
function parseExifDate(exif: Record<string, unknown> | undefined): number | null {
  const raw =
    (exif?.['DateTimeOriginal'] as string | undefined) ??
    (exif?.['{Exif}'] as { DateTimeOriginal?: string } | undefined)
      ?.DateTimeOriginal;
  if (!raw) return null;
  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(raw);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const t = new Date(+y, +mo - 1, +d, +h, +mi, +s).getTime();
  return Number.isNaN(t) ? null : Math.round(t / 1000);
}

export interface ScanResult {
  scanned: number;
  exif: number;
  timesync: number;
  none: number;
}

/** 세션 시간창의 갤러리 사진을 조회해 좌표를 매칭하고 저장한다 */
export async function scanSession(session: RecordingSession): Promise<ScanResult> {
  const endSec = session.ended_at ?? Math.round(Date.now() / 1000);
  const points = getPoints(session.id);
  const result: ScanResult = { scanned: 0, exif: 0, timesync: 0, none: 0 };

  let after: MediaLibrary.AssetRef | undefined;
  for (;;) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.photo,
      createdAfter: session.started_at * 1000,
      createdBefore: endSec * 1000,
      first: PAGE_SIZE,
      after,
      sortBy: MediaLibrary.SortBy.creationTime,
    });

    for (const asset of page.assets) {
      const info = await MediaLibrary.getAssetInfoAsync(asset);
      const capturedAt =
        parseExifDate(info.exif as Record<string, unknown> | undefined) ??
        Math.round(asset.creationTime / 1000);

      let lon: number | null = null;
      let lat: number | null = null;
      let source: MediaCoordSource = 'none';
      if (info.location) {
        lon = info.location.longitude;
        lat = info.location.latitude;
        source = 'exif';
      } else {
        const p = nearestPoint(points, capturedAt);
        if (p && Math.abs(p.recorded_at - capturedAt) <= TIMESYNC_TOLERANCE_S) {
          lon = p.lon;
          lat = p.lat;
          source = 'timesync';
        }
      }

      const row: SessionMedia = {
        session_id: session.id,
        asset_id: asset.id,
        captured_at: capturedAt,
        lon,
        lat,
        source,
        width: asset.width ?? null,
        height: asset.height ?? null,
        uri: info.localUri ?? asset.uri,
      };
      upsertSessionMedia(row);
      result.scanned++;
      result[source]++;
    }

    if (!page.hasNextPage) break;
    after = page.endCursor;
  }
  return result;
}
