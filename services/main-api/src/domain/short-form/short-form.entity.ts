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

import type { ShortFormStatus } from '@vobby/shared-types';

/** 상태 머신 타입은 와이어 계약(@vobby/shared-types) 소유 — CHECK 제약과 동기 유지 */
export type { ShortFormStatus };

@Entity('short_forms')
@Index('ix_short_forms_user_created', ['userId', 'createdAt'])
export class ShortForm {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'trip_id', type: 'uuid' })
  tripId!: string;

  @ManyToOne(() => Trip, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip!: Trip;

  @Column({ type: 'text', default: 'requested' })
  status!: ShortFormStatus;

  /** 스토리 엔진이 생성한 컷 편집 타임라인 (기획 Phase 3) */
  @Column({ type: 'jsonb', nullable: true })
  edl!: Record<string, unknown> | null;

  @Column({ name: 'video_key', type: 'text', nullable: true })
  videoKey!: string | null;

  @Column({ name: 'thumbnail_key', type: 'text', nullable: true })
  thumbnailKey!: string | null;

  @Column({ name: 'duration_s', type: 'integer', nullable: true })
  durationS!: number | null;

  /** 공유 URL 경로 조각 — /v/:slug */
  @Column({ name: 'share_slug', type: 'text', nullable: true, unique: true })
  shareSlug!: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
