// clustering 순수 함수 검증 (design §4 D-1) — 실행: npx tsx scripts/clustering.test.ts
import assert from 'node:assert/strict';
import {
  clusterTrips,
  GAP_SPLIT_S,
  MIN_TRIP_PHOTOS,
  TIMESYNC_TOLERANCE_S,
} from '../src/features/trips/clustering';
import type { AssetMeta } from '../src/features/trips/trips-db';

const BASE = 1_788_000_000;

function asset(
  id: string,
  atOffsetS: number,
  gps?: [number, number],
): AssetMeta {
  return {
    asset_id: id,
    captured_at: BASE + atOffsetS,
    lon: gps?.[0] ?? null,
    lat: gps?.[1] ?? null,
    width: 100,
    height: 100,
    uri: `file://${id}`,
  };
}

// 1) 8h 간격 분리 — 두 여행
{
  const { trips } = clusterTrips([
    asset('a1', 0, [126.98, 37.56]),
    asset('a2', 600, [126.99, 37.57]),
    asset('a3', 1200),
    asset('b1', GAP_SPLIT_S + 1300),
    asset('b2', GAP_SPLIT_S + 1900),
    asset('b3', GAP_SPLIT_S + 2500),
  ]);
  assert.equal(trips.length, 2, '8h 초과 간격은 여행을 분리해야 함');
}

// 2) 최소 장수 미만 그룹 배제
{
  const { trips } = clusterTrips([
    asset('solo1', 0),
    asset('solo2', GAP_SPLIT_S * 2),
    asset('c1', GAP_SPLIT_S * 4),
    asset('c2', GAP_SPLIT_S * 4 + 60),
    asset('c3', GAP_SPLIT_S * 4 + 120),
  ]);
  assert.equal(trips.length, 1, `${MIN_TRIP_PHOTOS}장 미만은 승격 금지`);
  assert.equal(trips[0].media_count, 3);
}

// 3) 좌표 매칭 — exif 보존, 30분 내 timesync, 초과 none
{
  const { media } = clusterTrips([
    asset('g', 0, [126.98, 37.56]),
    asset('near', 60), // 1분 차 → timesync
    asset('far', TIMESYNC_TOLERANCE_S + 61), // 30분 초과 → none
  ]);
  const byId = Object.fromEntries(media.map((m) => [m.asset_id, m]));
  assert.equal(byId['g'].source, 'exif');
  assert.equal(byId['near'].source, 'timesync');
  assert.equal(byId['near'].lon, 126.98);
  assert.equal(byId['far'].source, 'none');
  assert.equal(byId['far'].lon, null, '허용 오차 초과에 오좌표 부여 금지');
}

// 4) 거리 — GPS 2장 이상만 계산, 미만은 null
{
  const withGps = clusterTrips([
    asset('d1', 0, [126.9820, 37.6580]),
    asset('d2', 300, [126.9910, 37.6640]),
    asset('d3', 600),
  ]);
  assert.ok(
    withGps.trips[0].distance_m! > 900 && withGps.trips[0].distance_m! < 1200,
    `거리 근사 오류: ${withGps.trips[0].distance_m}`,
  );
  const noGps = clusterTrips([asset('e1', 0), asset('e2', 60), asset('e3', 120)]);
  assert.equal(noGps.trips[0].distance_m, null);
}

// 5) 결정적 trip id — 같은 입력이면 같은 id
{
  const input = [asset('f1', 0), asset('f2', 60), asset('f3', 120)];
  assert.equal(clusterTrips(input).trips[0].id, clusterTrips(input).trips[0].id);
}

console.log('clustering.test.ts — 5개 시나리오 전부 통과');
