// location-import 순수 함수 검증 (design §4 D-1~D-3) — 실행: npx tsx scripts/location-import.test.ts
import assert from 'node:assert/strict';
import {
  parseGpx,
  parseGoogleTimeline,
  parseLocationFile,
  type LocationPoint,
} from '../src/features/trips/location-parsers';
import { clusterTrips, TIMESYNC_TOLERANCE_S } from '../src/features/trips/clustering';
import { buildPath, MAX_PATH_POINTS } from '../src/features/trips/trip-path';
import type { AssetMeta, TripMedia } from '../src/features/trips/trips-db';

const BASE = 1_788_000_000; // 2026-08-25T20:00:00Z 근방
const iso = (offsetS: number) => new Date((BASE + offsetS) * 1000).toISOString();

// ── D-1: 파서 ──

// 1) GPX — lat/lon 속성 역순 포함, time 없는 점 skip
{
  const gpx = `<?xml version="1.0"?><gpx><trk><trkseg>
    <trkpt lat="35.1" lon="129.0"><time>${iso(0)}</time></trkpt>
    <trkpt lon="129.1" lat="35.2"><ele>12</ele><time>${iso(60)}</time></trkpt>
    <trkpt lat="35.3" lon="129.2"></trkpt>
  </trkseg></trk></gpx>`;
  const pts = parseGpx(gpx);
  assert.equal(pts.length, 2, 'time 없는 trkpt는 skip');
  assert.deepEqual(pts[0], { t: BASE, lon: 129.0, lat: 35.1 });
  assert.deepEqual(pts[1], { t: BASE + 60, lon: 129.1, lat: 35.2 }, '속성 순서 무관');
}

// 2) 신형 타임라인 — timelinePath offset분 + visit, geo:lat,lng 순서 변환
{
  const json = JSON.stringify({
    semanticSegments: [
      {
        startTime: iso(0),
        timelinePath: [
          { point: 'geo:35.1,129.0', durationMinutesOffsetFromStartTime: '0' },
          { point: 'geo:35.2,129.1', durationMinutesOffsetFromStartTime: '10' },
          { point: 'geo:invalid', durationMinutesOffsetFromStartTime: '20' },
        ],
      },
      { startTime: iso(3600), visit: { topCandidate: { placeLocation: 'geo:35.3,129.2' } } },
      { timelinePath: [{ point: 'geo:35.9,129.9' }] }, // startTime 없음 → skip
    ],
  });
  const pts = parseGoogleTimeline(json);
  assert.equal(pts.length, 3, '불량 엔트리 skip');
  assert.deepEqual(pts[0], { t: BASE, lon: 129.0, lat: 35.1 }, 'geo:lat,lng → lon,lat');
  assert.deepEqual(pts[1], { t: BASE + 600, lon: 129.1, lat: 35.2 }, 'offset 분→초');
  assert.deepEqual(pts[2], { t: BASE + 3600, lon: 129.2, lat: 35.3 }, 'visit 장소');
}

// 3) 구형 Takeout — E7 + timestampMs/ISO 혼재, 루트 배열형 신형도 판별
{
  const json = JSON.stringify({
    locations: [
      { latitudeE7: 351000000, longitudeE7: 1290000000, timestamp: iso(0) },
      { latitudeE7: 352000000, longitudeE7: 1291000000, timestampMs: String((BASE + 60) * 1000) },
      { latitudeE7: 999000000, longitudeE7: 1291000000, timestamp: iso(120) }, // lat 99.9 → skip
    ],
  });
  const pts = parseGoogleTimeline(json);
  assert.equal(pts.length, 2);
  assert.deepEqual(pts[0], { t: BASE, lon: 129.0, lat: 35.1 });
  assert.deepEqual(pts[1], { t: BASE + 60, lon: 129.1, lat: 35.2 });

  const rootArray = JSON.stringify([
    { startTime: iso(0), timelinePath: [{ point: 'geo:35.1,129.0' }] },
  ]);
  assert.equal(parseGoogleTimeline(rootArray).length, 1, '루트 배열형 신형');
}

// 4) 0점 파싱 throw + 미지원 확장자 throw + 정렬
{
  assert.throws(() => parseLocationFile('empty.gpx', '<gpx></gpx>'), /찾지 못했습니다/);
  assert.throws(() => parseLocationFile('a.csv', 'x'), /지원하지 않는 파일 형식/);
  const sorted = parseLocationFile(
    'b.gpx',
    `<gpx><trkpt lat="35.2" lon="129.1"><time>${iso(60)}</time></trkpt>
     <trkpt lat="35.1" lon="129.0"><time>${iso(0)}</time></trkpt></gpx>`,
  );
  assert.equal(sorted[0].t, BASE, '시간순 정렬');
}

// ── D-2: 클러스터링 보강 ──

function asset(id: string, atOffsetS: number, gps?: [number, number]): AssetMeta {
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

// 5) none 사진이 외부 포인트로 timesync (±30분 이내), 한계 초과는 none 유지
{
  const assets = [
    asset('a', 0, [129.0, 35.1]),
    asset('b', 3600), // GPS 없음 — 사진 후보는 1h 거리(한계 초과), 외부 포인트는 5분 거리
    asset('c', 7200, [129.2, 35.3]),
  ];
  const noExt = clusterTrips(assets);
  assert.equal(noExt.media.find((m) => m.asset_id === 'b')!.source, 'none', 'extPoints 없으면 기존과 동일');

  const ext: LocationPoint[] = [{ t: BASE + 3600 + 300, lon: 129.15, lat: 35.25 }];
  const withExt = clusterTrips(assets, ext);
  const b = withExt.media.find((m) => m.asset_id === 'b')!;
  assert.equal(b.source, 'timesync');
  assert.equal(b.lon, 129.15);

  const farExt: LocationPoint[] = [
    { t: BASE + 3600 + TIMESYNC_TOLERANCE_S + 1, lon: 129.9, lat: 35.9 },
  ];
  assert.equal(
    clusterTrips(assets, farExt).media.find((m) => m.asset_id === 'b')!.source,
    'none',
    '한계 초과 외부 포인트는 매칭 금지',
  );
}

// 6) 여행 시간 범위 밖 외부 포인트 무시 + 거리 재계산(조밀 경로 반영)
{
  const assets = [
    asset('a', 0, [129.0, 35.0]),
    asset('b', 600),
    asset('c', 1200, [129.0, 35.1]), // 사진만: 약 11.1km 직선
  ];
  const base = clusterTrips(assets).trips[0];
  const ext: LocationPoint[] = [
    { t: BASE + 300, lon: 129.1, lat: 35.05 }, // 범위 내 우회점 → 거리 증가
    { t: BASE - 999_999, lon: 100.0, lat: 10.0 }, // 범위 밖 → 무시
    { t: BASE + 999_999, lon: 100.0, lat: 10.0 }, // 범위 밖 → 무시
  ];
  const enriched = clusterTrips(assets, ext).trips[0];
  assert.ok(enriched.distance_m! > base.distance_m!, '우회점 반영으로 거리 증가');
  assert.ok(enriched.distance_m! < base.distance_m! * 3, '범위 밖 포인트(수천km) 미반영');
  assert.equal(enriched.id, base.id, 'tripId 결정성 유지');
}

// ── D-3: buildPath 병합·다운샘플 ──

function media(atOffsetS: number, gps?: [number, number]): TripMedia {
  return {
    trip_id: 't',
    asset_id: `m${atOffsetS}`,
    captured_at: BASE + atOffsetS,
    lon: gps?.[0] ?? null,
    lat: gps?.[1] ?? null,
    source: gps ? 'exif' : 'none',
    uri: 'file://x',
  };
}

// 7) 병합·시간순 + GPS<2 && ext로 2점 확보 시 path 생성
{
  const path = buildPath(
    [media(0, [129.0, 35.1]), media(1200, [129.2, 35.3]), media(600)],
    [{ t: BASE + 300, lon: 129.1, lat: 35.2 }],
  );
  assert.ok(path);
  assert.deepEqual(
    path!.coordinates.map((c) => c[3]),
    [BASE, BASE + 300, BASE + 1200],
    'GPS 없는 미디어 제외, 시간순 병합',
  );
  assert.deepEqual(path!.coordinates[1], [129.1, 35.2, 0, BASE + 300]);

  assert.equal(buildPath([media(0, [129.0, 35.1])], []), null, '1점은 path 없음');
  assert.ok(
    buildPath([media(0, [129.0, 35.1])], [{ t: BASE + 60, lon: 129.1, lat: 35.2 }]),
    '사진 1점 + 외부 1점 = path 생성',
  );
}

// 8) 500점 다운샘플 — 시작·끝 보존
{
  const ext: LocationPoint[] = Array.from({ length: 2000 }, (_, i) => ({
    t: BASE + i,
    lon: 129 + i * 0.0001,
    lat: 35 + i * 0.0001,
  }));
  const path = buildPath([], ext)!;
  assert.equal(path.coordinates.length, MAX_PATH_POINTS);
  assert.equal(path.coordinates[0][3], BASE, '시작 보존');
  assert.equal(path.coordinates[MAX_PATH_POINTS - 1][3], BASE + 1999, '끝 보존');
}

console.log('location-import 유닛 8/8 통과');
