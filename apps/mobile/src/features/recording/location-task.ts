import type { LocationObject } from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { appendPoint, getActiveSession } from './recording-db';

export const LOCATION_TASK = 'vobby-location-logging';

// 모듈 최상위 정의 필수 — UI 미기동 상태에서도 OS가 이 태스크를 깨운다 (design §0-1)
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[location-task] 위치 이벤트 오류:', error.message);
    return;
  }
  const session = getActiveSession();
  if (!session) {
    // 세션 종료 직후 도착한 잔여 이벤트 — 버린다
    return;
  }
  const { locations } = data as { locations: LocationObject[] };
  for (const loc of locations) {
    appendPoint(
      session.id,
      loc.coords.longitude,
      loc.coords.latitude,
      loc.coords.altitude ?? 0,
      Math.round(loc.timestamp / 1000),
    );
  }
});
