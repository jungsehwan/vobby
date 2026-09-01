import { db } from '../recording/recording-db';

/** 좌표 출처 — AI 분석에서 신뢰도 가중치로 사용 예정 (design §0-1) */
export type MediaCoordSource = 'exif' | 'timesync' | 'none';

export interface SessionMedia {
  session_id: string;
  asset_id: string;
  captured_at: number;
  lon: number | null;
  lat: number | null;
  source: MediaCoordSource;
  width: number | null;
  height: number | null;
  uri: string;
}

db.execSync(`
  CREATE TABLE IF NOT EXISTS session_media (
    session_id  TEXT NOT NULL,
    asset_id    TEXT NOT NULL,
    captured_at INTEGER NOT NULL,
    lon REAL, lat REAL,
    source TEXT NOT NULL,
    width INTEGER, height INTEGER,
    uri TEXT NOT NULL,
    PRIMARY KEY (session_id, asset_id)
  );
`);

/** 재스캔 멱등 — (session, asset) 기준 교체 (design §0-2) */
export function upsertSessionMedia(row: SessionMedia): void {
  db.runSync(
    `INSERT OR REPLACE INTO session_media
       (session_id, asset_id, captured_at, lon, lat, source, width, height, uri)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.session_id,
      row.asset_id,
      row.captured_at,
      row.lon,
      row.lat,
      row.source,
      row.width,
      row.height,
      row.uri,
    ],
  );
}

export function getSessionMedia(sessionId: string): SessionMedia[] {
  return db.getAllSync<SessionMedia>(
    `SELECT * FROM session_media WHERE session_id = ? ORDER BY captured_at`,
    [sessionId],
  );
}
