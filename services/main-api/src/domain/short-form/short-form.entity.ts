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

/** 렌더링 상태 머신 — 파이프라인 단계와 1:1 (기획 §2) */
export type ShortFormStatus =
  | 'requested'
  | 'analyzing'
  | 'rendering'
  | 'done'
  | 'failed';

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

  @Column({ name: 'trajectory_id', type: 'uuid' })
  trajectoryId!: string;

  @ManyToOne(() => Trajectory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trajectory_id' })
  trajectory!: Trajectory;

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
