import * as SQLite from 'expo-sqlite';
import type { MediaCoordSource } from '@vobby/shared-types';
import type { LocationPoint } from './location-parsers';

/** 갤러리 스캔 캐시 — asset당 getAssetInfoAsync 1회만 (design §0-1) */
export interface AssetMeta {
  asset_id: string;
  captured_at: number;
  lon: number | null;
  lat: number | null;
  width: number | null;
  height: number | null;
  uri: string;
}

/** 파생 데이터 — 클러스터링 재계산 시 전량 재작성 */
export interface Trip {
  id: string;
  started_at: number;
  ended_at: number;
  media_count: number;
  distance_m: number | null;
}

export interface TripMedia {
  trip_id: string;
  asset_id: string;
  captured_at: number;
  lon: number | null;
  lat: number | null;
  source: MediaCoordSource;
  uri: string;
}

export const db = SQLite.openDatabaseSync('vobby.db');

db.execSync(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS asset_meta (
    asset_id TEXT PRIMARY KEY,
    captured_at INTEGER NOT NULL,
    lon REAL, lat REAL,
    width INTEGER, height INTEGER,
    uri TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    started_at INTEGER NOT NULL,
    ended_at INTEGER NOT NULL,
    media_count INTEGER NOT NULL,
    distance_m REAL
  );
  CREATE TABLE IF NOT EXISTS trip_media (
    trip_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,
    captured_at INTEGER NOT NULL,
    lon REAL, lat REAL,
    source TEXT NOT NULL,
    uri TEXT NOT NULL,
    PRIMARY KEY (trip_id, asset_id)
  );
  CREATE TABLE IF NOT EXISTS location_points (
    source_file TEXT NOT NULL,
    t INTEGER NOT NULL,
    lon REAL NOT NULL, lat REAL NOT NULL,
    PRIMARY KEY (source_file, t)
  );
`);

export function getKnownAssetIds(): Set<string> {
  const rows = db.getAllSync<{ asset_id: string }>(
    `SELECT asset_id FROM asset_meta`,
  );
  return new Set(rows.map((r) => r.asset_id));
}

export function upsertAssetMeta(meta: AssetMeta): void {
  db.runSync(
    `INSERT OR REPLACE INTO asset_meta (asset_id, captured_at, lon, lat, width, height, uri)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [meta.asset_id, meta.captured_at, meta.lon, meta.lat, meta.width, meta.height, meta.uri],
  );
}

export function getAllAssetMeta(): AssetMeta[] {
  return db.getAllSync<AssetMeta>(
    `SELECT * FROM asset_meta ORDER BY captured_at`,
  );
}

/** 클러스터링 결과 반영 — 파생 테이블 전량 재작성 (멱등, design §0-1) */
export function rewriteTrips(trips: Trip[], media: TripMedia[]): void {
  db.withTransactionSync(() => {
    db.runSync(`DELETE FROM trip_media`);
    db.runSync(`DELETE FROM trips`);
    for (const t of trips) {
      db.runSync(
        `INSERT INTO trips (id, started_at, ended_at, media_count, distance_m) VALUES (?, ?, ?, ?, ?)`,
        [t.id, t.started_at, t.ended_at, t.media_count, t.distance_m],
      );
    }
    for (const m of media) {
      db.runSync(
        `INSERT INTO trip_media (trip_id, asset_id, captured_at, lon, lat, source, uri)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [m.trip_id, m.asset_id, m.captured_at, m.lon, m.lat, m.source, m.uri],
      );
    }
  });
}

export function listTrips(): Trip[] {
  return db.getAllSync<Trip>(`SELECT * FROM trips ORDER BY started_at DESC`);
}

export function getTrip(id: string): Trip | null {
  return db.getFirstSync<Trip>(`SELECT * FROM trips WHERE id = ?`, [id]);
}

export function getTripMedia(tripId: string): TripMedia[] {
  return db.getAllSync<TripMedia>(
    `SELECT * FROM trip_media WHERE trip_id = ? ORDER BY captured_at`,
    [tripId],
  );
}

/** import된 파일 요약 — 화면 목록용 */
export interface ImportedFile {
  source_file: string;
  point_count: number;
  from_t: number;
  to_t: number;
}

/** 파일 단위 전량 교체 — 같은 파일 재import 멱등 (design §0-2) */
export function replaceLocationPoints(sourceFile: string, points: LocationPoint[]): void {
  db.withTransactionSync(() => {
    db.runSync(`DELETE FROM location_points WHERE source_file = ?`, [sourceFile]);
    for (const p of points) {
      // 같은 초의 중복 포인트는 마지막 것만 유지 (PK 충돌 흡수)
      db.runSync(
        `INSERT OR REPLACE INTO location_points (source_file, t, lon, lat) VALUES (?, ?, ?, ?)`,
        [sourceFile, p.t, p.lon, p.lat],
      );
    }
  });
}

export function getAllLocationPoints(): LocationPoint[] {
  return db.getAllSync<LocationPoint>(
    `SELECT t, lon, lat FROM location_points ORDER BY t`,
  );
}

export function getLocationPointsBetween(startS: number, endS: number): LocationPoint[] {
  return db.getAllSync<LocationPoint>(
    `SELECT t, lon, lat FROM location_points WHERE t BETWEEN ? AND ? ORDER BY t`,
    [startS, endS],
  );
}

export function listImportedFiles(): ImportedFile[] {
  return db.getAllSync<ImportedFile>(
    `SELECT source_file, COUNT(*) AS point_count, MIN(t) AS from_t, MAX(t) AS to_t
     FROM location_points GROUP BY source_file ORDER BY source_file`,
  );
}
