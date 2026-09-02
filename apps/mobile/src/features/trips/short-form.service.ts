import type { ShortFormSummary } from '@vobby/shared-types';
import * as Notifications from 'expo-notifications';
import { apiFetch } from '@/lib/api-client';

// 폴링은 앱이 켜진 상태에서 완료를 감지한다 — 핸들러 없이는 포그라운드 배너가 표시되지 않음
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** tripId는 서버 여행 id (업로드 응답의 id — 로컬 trip id 아님) */
export function requestShortForm(serverTripId: string): Promise<ShortFormSummary> {
  return apiFetch<ShortFormSummary>(`/v1/trips/${serverTripId}/short-form`, {
    method: 'POST',
  });
}

export function getShortForm(id: string): Promise<ShortFormSummary> {
  return apiFetch<ShortFormSummary>(`/v1/short-forms/${id}`);
}

export function isInProgress(status: ShortFormSummary['status']): boolean {
  return status === 'requested' || status === 'analyzing' || status === 'rendering';
}

/** 폴링이 완료를 감지했을 때 1회 — 원격 Push는 기능 15 (plan §3) */
export async function notifyShortFormDone(): Promise<void> {
  const { granted } = await Notifications.requestPermissionsAsync();
  if (!granted) return; // 알림 거부는 실패가 아님 — 화면 표시로 충분
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '여행 영상이 완성됐어요 🎬',
      body: '지금 바로 확인하고 공유해 보세요.',
    },
    trigger: null,
  });
}
