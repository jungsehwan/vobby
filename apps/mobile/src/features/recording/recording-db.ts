import * as SQLite from 'expo-sqlite';

// 포인트 좌표 규약: 경도/위도/고도m/epoch초 — 서버 geography(LineStringZM)와 1:1 (design §0-3)

export interface RecordingSession {
  id: string;
  started_at: number;
  ended_at: number | null;
  status: 'recording' | 'done';
}

export interface RecordedPoint {
  session_id: string;
  seq: number;
  lon: number;
  lat: number;
  altitude: number;
  recorded_at: number;
}

// 백그라운드 태스크와 화면이 같은 파일 DB를 공유한다 (media-db 등 다른 기능도 이 인스턴스 사용)
export const db = SQLite.openDatabaseSync('vobby-recording.db');

db.execSync(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    status TEXT NOT NULL DEFAULT 'recording'
  );
  CREATE TABLE IF NOT EXISTS points (
    session_id TEXT NOT NULL,
    seq INTEGER NOT NULL,
    lon REAL NOT NULL,
    lat REAL NOT NULL,
    altitude REAL NOT NULL,
    recorded_at INTEGER NOT NULL,
    PRIMARY KEY (session_id, seq)
  );
`);

export function createSession(id: string, startedAtSec: number): void {
  db.runSync(
    `INSERT INTO sessions (id, started_at, status) VALUES (?, ?, 'recording')`,
    [id, startedAtSec],
  );
}

export function getActiveSession(): RecordingSession | null {
  return db.getFirstSync<RecordingSession>(
    `SELECT * FROM sessions WHERE status = 'recording' ORDER BY started_at DESC LIMIT 1`,
  );
}

export function listFinishedSessions(): RecordingSession[] {
  return db.getAllSync<RecordingSession>(
    `SELECT * FROM sessions WHERE status = 'done' ORDER BY started_at DESC`,
  );
}

export function getSession(id: string): RecordingSession | null {
  return db.getFirstSync<RecordingSession>(
    `SELECT * FROM sessions WHERE id = ?`,
    [id],
  );
}

export function finishSession(id: string, endedAtSec: number): void {
  db.runSync(
    `UPDATE sessions SET status = 'done', ended_at = ? WHERE id = ? AND status = 'recording'`,
    [endedAtSec, id],
  );
}

export function appendPoint(
  sessionId: string,
  lon: number,
  lat: number,
  altitude: number,
  recordedAtSec: number,
): void {
  db.runSync(
    `INSERT INTO points (session_id, seq, lon, lat, altitude, recorded_at)
     SELECT ?, COALESCE(MAX(seq), 0) + 1, ?, ?, ?, ?
     FROM points WHERE session_id = ?`,
    [sessionId, lon, lat, altitude, recordedAtSec, sessionId],
  );
}

export function getPoints(sessionId: string): RecordedPoint[] {
  return db.getAllSync<RecordedPoint>(
    `SELECT * FROM points WHERE session_id = ? ORDER BY seq`,
    [sessionId],
  );
}

export function countPoints(sessionId: string): number {
  const row = db.getFirstSync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM points WHERE session_id = ?`,
    [sessionId],
  );
  return row?.n ?? 0;
}
