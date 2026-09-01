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
import type { GeoLineStringZM } from '@vobby/shared-types';

/** 사진 EXIF·외부 이력으로 재구성된 여행 — 기록이 아니라 소싱 결과 (design §0-2) */
@Entity('trips')
@Index('ix_trips_user_started', ['userId', 'startedAt'])
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /** AI 자동 생성 여행 타이틀 */
  @Column({ type: 'text', nullable: true })
  title!: string | null;

  /** 사진 시각 범위 */
  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  @Column({ name: 'ended_at', type: 'timestamptz' })
  endedAt!: Date;

  /** GPS 사진의 시간순 좌표 시퀀스 근사 — GPS 사진 0장이면 NULL */
  @Column({
    type: 'geography',
    spatialFeatureType: 'LineStringZM',
    srid: 4326,
    nullable: true,
  })
  path!: GeoLineStringZM | null;

  @Column({ name: 'distance_m', type: 'double precision', nullable: true })
  distanceM!: number | null;

  /** 비정규화 — 목록 조회 최적화, 업로드 API가 관리 */
  @Column({ name: 'media_count', type: 'integer', default: 0 })
  mediaCount!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
