import * as SQLite from 'expo-sqlite';
import type { MediaCoordSource } from '@vobby/shared-types';

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
