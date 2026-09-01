import type {
  GeoLineStringZM,
  TripSummary,
  TripUploadRequest,
} from '@vobby/shared-types';
import { apiFetch } from '@/lib/api-client';
import { getTrip, getTripMedia, type TripMedia } from './trips-db';

/** GPS 있는 미디어의 시간순 좌표 시퀀스 — 서버 path 규약과 1:1 (클러스터링과 동일) */
function buildPath(media: TripMedia[]): GeoLineStringZM | null {
  const gps = media.filter((m) => m.lon !== null && m.lat !== null);
  if (gps.length < 2) return null;
  return {
    type: 'LineString',
    coordinates: gps.map((m) => [m.lon!, m.lat!, 0, m.captured_at]),
  };
}

export async function uploadTrip(tripId: string): Promise<TripSummary> {
  const trip = getTrip(tripId);
  if (!trip) throw new Error('여행을 찾을 수 없습니다');
  const media = getTripMedia(tripId);

  const body: TripUploadRequest = {
    clientKey: trip.id,
    title: null,
    startedAt: new Date(trip.started_at * 1000).toISOString(),
    endedAt: new Date(trip.ended_at * 1000).toISOString(),
    path: buildPath(media),
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

  return apiFetch<TripSummary>('/v1/trips', { method: 'POST', body });
}
