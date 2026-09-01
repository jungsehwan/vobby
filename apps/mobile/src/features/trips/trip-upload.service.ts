import type { TripSummary, TripUploadRequest } from '@vobby/shared-types';
import { apiFetch } from '@/lib/api-client';
import { buildPath } from './trip-path';
import { getLocationPointsBetween, getTrip, getTripMedia } from './trips-db';

export async function uploadTrip(tripId: string): Promise<TripSummary> {
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

  return apiFetch<TripSummary>('/v1/trips', { method: 'POST', body });
}
