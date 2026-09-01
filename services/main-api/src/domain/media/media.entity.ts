import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity.js';
import { Trip } from '../trip/trip.entity.js';
import type { GeoPoint, MediaCoordSource } from '@vobby/shared-types';

export type MediaType = 'photo' | 'video';

@Entity('media')
@Index('ix_media_trip_captured', ['tripId', 'capturedAt'])
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /** 미디어는 여행 소속으로만 업로드된다 (design §1) */
  @Column({ name: 'trip_id', type: 'uuid' })
  tripId!: string;

  @ManyToOne(() => Trip, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip!: Trip;

  @Column({ type: 'text' })
  type!: MediaType;

  @Column({ name: 'captured_at', type: 'timestamptz' })
  capturedAt!: Date;

  /** EXIF에 위경도가 없는 미디어 존재 — source로 출처 구분 */
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location!: GeoPoint | null;

  /** 좌표 출처 — 모바일 로컬 매칭 규약과 동일 (@vobby/shared-types) */
  @Column({ type: 'text' })
  source!: MediaCoordSource;

  @Column({ type: 'integer', nullable: true })
  width!: number | null;

  @Column({ type: 'integer', nullable: true })
  height!: number | null;

  /** 선별 업로드 전에는 키 없음 — 썸네일/메타 우선 전송 정책 */
  @Column({ name: 'storage_key', type: 'text', nullable: true })
  storageKey!: string | null;

  @Column({ name: 'thumbnail_key', type: 'text', nullable: true })
  thumbnailKey!: string | null;

  /** Vision AI 스코어링 결과 (마일스톤 3에서 기록) */
  @Column({ name: 'vision_score', type: 'jsonb', nullable: true })
  visionScore!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
