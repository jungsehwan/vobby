/** 외부 위치 이력 파서 — 순수 함수 (design §2). 불량 엔트리는 skip, 0점 파싱만 실패. */

export interface LocationPoint {
  /** epoch 초 */
  t: number;
  lon: number;
  lat: number;
}

function toEpochS(iso: string | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

function isValidCoord(lon: number, lat: number): boolean {
  return (
    Number.isFinite(lon) && Number.isFinite(lat) &&
    Math.abs(lon) <= 180 && Math.abs(lat) <= 90
  );
}

/** 구글 규약 `geo:lat,lng` — lat이 먼저 (plan §4) */
function parseGeoString(geo: string | undefined): { lon: number; lat: number } | null {
  if (!geo) return null;
  const m = /^geo:\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)$/.exec(geo.trim());
  if (!m) return null;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  return isValidCoord(lon, lat) ? { lon, lat } : null;
}

/** GPX `<trkpt lat=".." lon=".."><time>ISO</time>` — time 없는 점은 skip */
export function parseGpx(text: string): LocationPoint[] {
  const points: LocationPoint[] = [];
  const trkptRe = /<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/g;
  for (const m of text.matchAll(trkptRe)) {
    const lat = Number(/\blat\s*=\s*"(-?[\d.]+)"/.exec(m[1])?.[1]);
    const lon = Number(/\blon\s*=\s*"(-?[\d.]+)"/.exec(m[1])?.[1]);
    const t = toEpochS(/<time>([^<]+)<\/time>/.exec(m[2])?.[1]);
    if (t === null || !isValidCoord(lon, lat)) continue;
    points.push({ t, lon, lat });
  }
  return points;
}

/** 구형 Takeout: locations[].latitudeE7/longitudeE7 + timestamp(ISO)|timestampMs */
function parseTakeoutLocations(locations: unknown[]): LocationPoint[] {
  const points: LocationPoint[] = [];
  for (const raw of locations) {
    const loc = raw as Record<string, unknown>;
    const lat = Number(loc.latitudeE7) / 1e7;
    const lon = Number(loc.longitudeE7) / 1e7;
    const t =
      typeof loc.timestampMs === 'string'
        ? Math.floor(Number(loc.timestampMs) / 1000)
        : toEpochS(loc.timestamp as string | undefined);
    if (t === null || !Number.isFinite(t) || !isValidCoord(lon, lat)) continue;
    points.push({ t, lon, lat });
  }
  return points;
}

interface TimelinePathEntry {
  point?: string;
  durationMinutesOffsetFromStartTime?: string | number;
}

interface SemanticSegment {
  startTime?: string;
  endTime?: string;
  timelinePath?: TimelinePathEntry[];
  visit?: { topCandidate?: { placeLocation?: string } };
}

/** 신형 기기 내보내기: semanticSegments[] — timelinePath(offset분) + visit 장소 */
function parseSemanticSegments(segments: unknown[]): LocationPoint[] {
  const points: LocationPoint[] = [];
  for (const raw of segments) {
    const seg = raw as SemanticSegment;
    const startS = toEpochS(seg.startTime);
    if (startS === null) continue;

    for (const entry of seg.timelinePath ?? []) {
      const coord = parseGeoString(entry.point);
      const offsetMin = Number(entry.durationMinutesOffsetFromStartTime ?? 0);
      if (!coord || !Number.isFinite(offsetMin)) continue;
      points.push({ t: startS + Math.round(offsetMin * 60), ...coord });
    }

    const place = parseGeoString(seg.visit?.topCandidate?.placeLocation);
    if (place) points.push({ t: startS, ...place });
  }
  return points;
}

/** 구글 타임라인 JSON — 루트 형태로 신/구형 자동 판별 */
export function parseGoogleTimeline(text: string): LocationPoint[] {
  const root = JSON.parse(text) as unknown;
  if (Array.isArray(root)) return parseSemanticSegments(root);
  const obj = root as Record<string, unknown>;
  if (Array.isArray(obj.semanticSegments)) return parseSemanticSegments(obj.semanticSegments);
  if (Array.isArray(obj.locations)) return parseTakeoutLocations(obj.locations);
  return [];
}

/** 파일명 확장자로 포맷 결정 → 파싱. 0점이면 throw (plan §5 — 조용한 무시 금지) */
export function parseLocationFile(fileName: string, text: string): LocationPoint[] {
  const lower = fileName.toLowerCase();
  let points: LocationPoint[];
  if (lower.endsWith('.gpx')) {
    points = parseGpx(text);
  } else if (lower.endsWith('.json')) {
    points = parseGoogleTimeline(text);
  } else {
    throw new Error(`지원하지 않는 파일 형식입니다: ${fileName} (.gpx/.json)`);
  }
  if (points.length === 0) {
    throw new Error('파일에서 위치 포인트를 찾지 못했습니다 — 지원하지 않는 형식이거나 빈 파일입니다');
  }
  return points.sort((a, b) => a.t - b.t);
}
