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
import { Trajectory } from '../trajectory/trajectory.entity.js';
import type { GeoPoint } from '@vobby/shared-types';

export type MediaType = 'photo' | 'video';

@Entity('media')
@Index('ix_media_trajectory_captured', ['trajectoryId', 'capturedAt'])
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /** Time-Sync 매칭 전에는 미연결 상태로 존재 (기획 Phase 1) */
  @Column({ name: 'trajectory_id', type: 'uuid', nullable: true })
  trajectoryId!: string | null;

  @ManyToOne(() => Trajectory, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'trajectory_id' })
  trajectory!: Trajectory | null;

  @Column({ type: 'text' })
  type!: MediaType;

  @Column({ name: 'captured_at', type: 'timestamptz' })
  capturedAt!: Date;

  /** EXIF에 위경도가 없는 미디어 존재 */
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location!: GeoPoint | null;

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
