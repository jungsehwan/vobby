import type { TripUploadRequest, TripUploadResponse } from '@vobby/shared-types';
import { apiFetch, apiUploadFile } from '@/lib/api-client';
import { buildPath } from './trip-path';
import { getLocationPointsBetween, getTrip, getTripMedia } from './trips-db';

export async function uploadTrip(tripId: string): Promise<TripUploadResponse> {
  const trip = getTrip(tripId);
  if (!trip) throw new Error('여행을 찾을 수 없습니다');
  const media = getTripMedia(tripId);
  const extPoints = getLocationPointsBetween(trip.started_at, trip.ended_at);

  const body: TripUploadRequest = {
    clientKey: trip.id,
    title: null,
    startedAt: new Date(trip.started_at * 1000).toISOString(),
    endedAt: new Date(trip.ended_at * 1000).toISOString(),
    path: buildPath(media, extPoints),
    distanceM: trip.distance_m,
    media: media.map((m) => ({
      type: 'photo',
      capturedAt: new Date(m.captured_at * 1000).toISOString(),
      lon: m.lon,
      lat: m.lat,
      source: m.source,
      width: null,
      height: null,
    })),
  };

  const response = await apiFetch<TripUploadResponse>('/v1/trips', {
    method: 'POST',
    body,
  });

  // 원본 파일 업로드 — mediaIds는 요청 media와 같은 순서 (design §0-2).
  // 실패는 즉시 표면화: 재업로드는 멱등이므로 사용자가 다시 시도하면 된다
  for (let i = 0; i < response.mediaIds.length; i++) {
    const uri = media[i].uri;
    await apiUploadFile(`/v1/media/${response.mediaIds[i]}/file`, {
      uri,
      name: `photo-${i}.${uri.toLowerCase().endsWith('.png') ? 'png' : 'jpg'}`,
    });
  }
  return response;
}
