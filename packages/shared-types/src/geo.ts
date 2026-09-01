// PostGIS geography 컬럼과 주고받는 GeoJSON 최소 타입.
// 좌표 차원 규약 — 궤적: [경도, 위도, 고도m, epoch초] (LineStringZM)
//                미디어 위치: [경도, 위도] (Point)

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface GeoLineStringZM {
  type: 'LineString';
  coordinates: Array<[number, number, number, number]>;
}
