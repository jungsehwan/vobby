import type { MediaCoordSource } from '@vobby/shared-types';
import type { AssetMeta, Trip, TripMedia } from './trips-db';

// 클러스터링 파라미터 (plan §4.1 — 사용 데이터로 조정 예정)
export const GAP_SPLIT_S = 8 * 60 * 60; // 연속 사진 간격 초과 시 여행 분리
export const MIN_TRIP_PHOTOS = 3; // 미만은 여행으로 승격하지 않음 (잡음 배제)
export const TIMESYNC_TOLERANCE_S = 30 * 60; // 여행 내 GPS 사진 근사 허용 오차

const EARTH_RADIUS_M = 6_371_000;

function haversine(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export interface ClusterResult {
  trips: Trip[];
  media: TripMedia[];
}

/** 시각 오름차순 자산을 시간 간격으로 그룹핑 */
function splitByGap(sorted: AssetMeta[]): AssetMeta[][] {
  const groups: AssetMeta[][] = [];
  let current: AssetMeta[] = [];
  for (const asset of sorted) {
    const prev = current[current.length - 1];
    if (prev && asset.captured_at - prev.captured_at > GAP_SPLIT_S) {
      groups.push(current);
      current = [];
    }
    current.push(asset);
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

/** 여행 내 GPS 사진 중 시각 최근접 좌표로 근사 — 여행 밖 사진은 후보에서 제외 (design §0-2) */
function matchCoord(
  asset: AssetMeta,
  gpsAssets: AssetMeta[],
): { lon: number | null; lat: number | null; source: MediaCoordSource } {
  if (asset.lon !== null && asset.lat !== null) {
    return { lon: asset.lon, lat: asset.lat, source: 'exif' };
  }
  let best: AssetMeta | null = null;
  for (const g of gpsAssets) {
    if (
      !best ||
      Math.abs(g.captured_at - asset.captured_at) <
        Math.abs(best.captured_at - asset.captured_at)
    ) {
      best = g;
    }
  }
  if (best && Math.abs(best.captured_at - asset.captured_at) <= TIMESYNC_TOLERANCE_S) {
    return { lon: best.lon, lat: best.lat, source: 'timesync' };
  }
  return { lon: null, lat: null, source: 'none' };
}

/**
 * 갤러리 메타 → 여행/여행미디어 파생 (순수 함수 — 유닛 테스트 대상).
 * tripId는 결정적이어야 재계산이 안정적: `trip-{시작epoch}-{장수}`.
 */
export function clusterTrips(assets: AssetMeta[]): ClusterResult {
  const sorted = [...assets].sort((a, b) => a.captured_at - b.captured_at);
  const trips: Trip[] = [];
  const media: TripMedia[] = [];

  for (const group of splitByGap(sorted)) {
    if (group.length < MIN_TRIP_PHOTOS) continue;

    const tripId = `trip-${group[0].captured_at}-${group.length}`;
    const gpsAssets = group.filter((a) => a.lon !== null && a.lat !== null);

    for (const asset of group) {
      const coord = matchCoord(asset, gpsAssets);
      media.push({
        trip_id: tripId,
        asset_id: asset.asset_id,
        captured_at: asset.captured_at,
        lon: coord.lon,
        lat: coord.lat,
        source: coord.source,
        uri: asset.uri,
      });
    }

    let distanceM: number | null = null;
    if (gpsAssets.length >= 2) {
      distanceM = 0;
      for (let i = 1; i < gpsAssets.length; i++) {
        distanceM += haversine(
          gpsAssets[i - 1].lon!,
          gpsAssets[i - 1].lat!,
          gpsAssets[i].lon!,
          gpsAssets[i].lat!,
        );
      }
    }

    trips.push({
      id: tripId,
      started_at: group[0].captured_at,
      ended_at: group[group.length - 1].captured_at,
      media_count: group.length,
      distance_m: distanceM,
    });
  }

  return { trips, media };
}
