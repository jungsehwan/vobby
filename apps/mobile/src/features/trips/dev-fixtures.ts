/** __DEV__ 전용 샘플 위치 이력 — 시뮬레이터 E2E 경로 (design §0-4, DEV_JWT 시드 선례).
 *  좌표는 부산 송도→해운대 경로를 주어진 시간 범위에 균등 배치 — 기존 여행 기간에
 *  맞춰 생성하면 timesync·path 보강을 실기기 사진 없이 검증할 수 있다. */

const ROUTE: Array<[number, number]> = [
  [35.1142, 129.0403],
  [35.12, 129.055],
  [35.128, 129.068],
  [35.133, 129.0756],
  [35.14, 129.085],
  [35.1532, 129.1186],
  [35.155, 129.13],
  [35.1587, 129.14],
  [35.1587, 129.1603],
];

function spread(startS: number, endS: number): Array<[number, number, number]> {
  const span = Math.max(endS - startS, ROUTE.length - 1);
  return ROUTE.map((coord, i) => [
    ...coord,
    startS + Math.round((i * span) / (ROUTE.length - 1)),
  ]) as Array<[number, number, number]>;
}

export function sampleGpx(startS: number, endS: number): string {
  const trkpts = spread(startS, endS)
    .map(
      ([lat, lon, t]) =>
        `<trkpt lat="${lat}" lon="${lon}"><time>${new Date(t * 1000).toISOString()}</time></trkpt>`,
    )
    .join('\n      ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="vobby-dev">
  <trk><name>부산 샘플</name><trkseg>
      ${trkpts}
  </trkseg></trk>
</gpx>`;
}

export function sampleGoogleTimeline(startS: number, endS: number): string {
  const startIso = new Date(startS * 1000).toISOString();
  const spanMin = Math.max(Math.round((endS - startS) / 60), ROUTE.length - 1);
  return JSON.stringify({
    semanticSegments: [
      {
        startTime: startIso,
        endTime: new Date(endS * 1000).toISOString(),
        timelinePath: ROUTE.map(([lat, lon], i) => ({
          point: `geo:${lat},${lon}`,
          durationMinutesOffsetFromStartTime: String(
            Math.round((i * spanMin) / (ROUTE.length - 1)),
          ),
        })),
      },
      {
        startTime: startIso,
        visit: { topCandidate: { placeLocation: 'geo:35.1731,129.1758' } },
      },
    ],
  });
}
