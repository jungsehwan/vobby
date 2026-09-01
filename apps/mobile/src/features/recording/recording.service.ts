import { randomUUID } from 'expo-crypto';
import * as Location from 'expo-location';
import { LOCATION_TASK } from './location-task';
import {
  createSession,
  finishSession,
  getActiveSession,
  type RecordingSession,
} from './recording-db';

export type PermissionState = 'granted' | 'foreground-only' | 'denied';

/** 전경 → 배경 순서로 요청해야 iOS가 '항상 허용'을 노출한다 */
export async function requestPermissions(): Promise<PermissionState> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return 'denied';
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.granted ? 'granted' : 'foreground-only';
}

async function ensureLocationUpdatesRunning(): Promise<void> {
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
  if (started) return;
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 5_000,
    distanceInterval: 10,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Vobby 경로 기록 중',
      notificationBody: '이동 경로를 기록하고 있습니다.',
    },
  });
}

export async function startRecording(): Promise<RecordingSession> {
  const existing = getActiveSession();
  if (existing) {
    // 중복 시작 방지 (plan §5) — 기존 세션을 잇되, 강제종료 등으로
    // 위치 업데이트가 꺼져 있으면 재개한다
    await ensureLocationUpdatesRunning();
    return existing;
  }
  const id = randomUUID();
  createSession(id, Math.round(Date.now() / 1000));
  try {
    await ensureLocationUpdatesRunning();
  } catch (e) {
    // 위치 업데이트 시작 실패 시 세션을 남기면 "업데이트 없는 기록 중" 상태로 고착된다
    finishSession(id, Math.round(Date.now() / 1000));
    throw e;
  }
  const created = getActiveSession();
  if (!created) throw new Error('세션 생성에 실패했습니다');
  return created;
}

export async function stopRecording(): Promise<void> {
  const session = getActiveSession();
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
  if (started) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
  if (session) {
    finishSession(session.id, Math.round(Date.now() / 1000));
  }
}

/** 앱 재시작 후 기록 중이던 세션 복구 (plan §4) — 위치 업데이트가 꺼져 있으면 재개 */
export async function resumeActiveSession(): Promise<RecordingSession | null> {
  const session = getActiveSession();
  if (session) {
    const bg = await Location.getBackgroundPermissionsAsync();
    if (bg.granted) {
      await ensureLocationUpdatesRunning();
    }
  }
  return session;
}
