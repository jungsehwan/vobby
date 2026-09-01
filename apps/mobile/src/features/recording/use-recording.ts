import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import {
  countPoints,
  getPoints,
  type RecordingSession,
} from './recording-db';
import {
  requestPermissions,
  resumeActiveSession,
  startRecording,
  stopRecording,
  type PermissionState,
} from './recording.service';

const POLL_MS = 2_000;
const EARTH_RADIUS_M = 6_371_000;

export interface RecordingStats {
  pointCount: number;
  distanceM: number;
  elapsedS: number;
}

/** 하버사인 — 서버 ST_Length와 동일 목적의 근사치 (표시용) */
function haversine(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

function computeStats(session: RecordingSession): RecordingStats {
  const points = getPoints(session.id);
  let distanceM = 0;
  for (let i = 1; i < points.length; i++) {
    distanceM += haversine(
      points[i - 1].lon,
      points[i - 1].lat,
      points[i].lon,
      points[i].lat,
    );
  }
  return {
    pointCount: points.length,
    distanceM,
    elapsedS: Math.max(0, Math.round(Date.now() / 1000) - session.started_at),
  };
}

export function useRecording() {
  const [permission, setPermission] = useState<PermissionState | 'unknown'>('unknown');
  const [session, setSession] = useState<RecordingSession | null>(null);
  const [stats, setStats] = useState<RecordingStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 앱 (재)시작 시: 권한 현황 조회 + 기록 중이던 세션 복구
  useEffect(() => {
    (async () => {
      const fg = await Location.getForegroundPermissionsAsync();
      const bg = await Location.getBackgroundPermissionsAsync();
      setPermission(bg.granted ? 'granted' : fg.granted ? 'foreground-only' : 'denied');
      const active = await resumeActiveSession();
      if (active) {
        setSession(active);
        setStats(computeStats(active));
      }
    })().catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  // 기록 중 통계 폴링 — 백그라운드 태스크가 쓴 포인트를 화면에 반영
  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => setStats(computeStats(session)), POLL_MS);
    return () => clearInterval(timer);
  }, [session]);

  const askPermission = useCallback(async () => {
    setError(null);
    try {
      setPermission(await requestPermissions());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const s = await startRecording();
      setSession(s);
      setStats(computeStats(s));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const stop = useCallback(async () => {
    setError(null);
    try {
      await stopRecording();
      setSession(null);
      setStats(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  return { permission, session, stats, error, askPermission, start, stop };
}
