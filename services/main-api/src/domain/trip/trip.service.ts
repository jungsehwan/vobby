import type { TripSummary, TripUploadResponse } from '@vobby/shared-types';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Trip } from './trip.entity.js';
import { UploadTripDto } from './dto/upload-trip.dto.js';

function toSummary(trip: Trip): TripSummary {
  return {
    id: trip.id,
    clientKey: trip.clientKey,
    title: trip.title,
    startedAt: trip.startedAt.toISOString(),
    endedAt: trip.endedAt.toISOString(),
    distanceM: trip.distanceM,
    mediaCount: trip.mediaCount,
  };
}

@Injectable()
export class TripService {
  constructor(
    @InjectRepository(Trip)
    private readonly trips: Repository<Trip>,
    private readonly dataSource: DataSource,
  ) {}

  /** (user, clientKey) 멱등 upsert — 재업로드는 여행 갱신 + 미디어 전량 교체 (design §0-3) */
  async uploadTrip(userId: string, dto: UploadTripDto): Promise<TripUploadResponse> {
    if (dto.path) {
      const coords = dto.path.coordinates;
      const valid =
        dto.path.type === 'LineString' &&
        Array.isArray(coords) &&
        coords.length >= 2 &&
        coords.every(
          (c) =>
            Array.isArray(c) &&
            c.length === 4 &&
            c.every((n) => typeof n === 'number') &&
            c[0] >= -180 && c[0] <= 180 &&
            c[1] >= -90 && c[1] <= 90,
        );
      if (!valid) {
        throw new BadRequestException({
          code: 'TRIP_INVALID_PATH',
          message: 'path는 LineStringZM([lon,lat,alt,epoch] 2개 이상)이어야 합니다',
        });
      }
    }

    const { tripId, mediaIds } = await this.dataSource.transaction(async (manager) => {
      // GeoJSON 규격에는 M 차원이 없어 ST_GeomFromGeoJSON이 4번째 값을 버린다 —
      // 숫자 검증(위)을 통과한 좌표로 WKT를 조립해 파라미터로 전달 (인젝션 불가: 숫자만)
      const pathParam = dto.path
        ? `LINESTRING ZM (${dto.path.coordinates.map((c) => c.join(' ')).join(', ')})`
        : null;
      const upserted: Array<{ id: string }> = await manager.query(
        `INSERT INTO trips (user_id, client_key, title, started_at, ended_at, path, distance_m, media_count)
         VALUES ($1, $2, $3, $4, $5, ST_GeogFromText($6), $7, $8)
         ON CONFLICT (user_id, client_key) DO UPDATE SET
           title = EXCLUDED.title,
           started_at = EXCLUDED.started_at,
           ended_at = EXCLUDED.ended_at,
           path = EXCLUDED.path,
           distance_m = EXCLUDED.distance_m,
           media_count = EXCLUDED.media_count,
           updated_at = now()
         RETURNING id`,
        [
          userId,
          dto.clientKey,
          dto.title,
          dto.startedAt,
          dto.endedAt,
          pathParam,
          dto.distanceM,
          dto.media.length,
        ],
      );
      const id = upserted[0].id;

      await manager.query(`DELETE FROM media WHERE trip_id = $1`, [id]);
      const ids: string[] = [];
      for (const m of dto.media) {
        const point =
          m.lon !== null && m.lat !== null
            ? JSON.stringify({ type: 'Point', coordinates: [m.lon, m.lat] })
            : null;
        const inserted: Array<{ id: string }> = await manager.query(
          `INSERT INTO media (user_id, trip_id, type, captured_at, location, source, width, height)
           VALUES ($1, $2, $3, $4, ST_GeomFromGeoJSON($5)::geography, $6, $7, $8)
           RETURNING id`,
          [userId, id, m.type, m.capturedAt, point, m.source, m.width, m.height],
        );
        ids.push(inserted[0].id);
      }
      return { tripId: id, mediaIds: ids };
    });

    const saved = await this.trips.findOneByOrFail({ id: tripId });
    return { ...toSummary(saved), mediaIds };
  }

  async listTrips(userId: string): Promise<TripSummary[]> {
    const rows = await this.trips.find({
      where: { userId },
      order: { startedAt: 'DESC' },
    });
    return rows.map(toSummary);
  }
}
