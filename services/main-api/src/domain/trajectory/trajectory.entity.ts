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
import type { GeoLineStringZM } from '../geo.types.js';

/** 활동 1회의 GPS 궤적. path에 시각(M)·고도(Z)를 내장한다 (design §0-1) */
@Entity('trajectories')
@Index('ix_trajectories_user_started', ['userId', 'startedAt'])
export class Trajectory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /** AI 자동 생성 활동 타이틀 (Intro 연출용) */
  @Column({ type: 'text', nullable: true })
  title!: string | null;

  @Column({
    type: 'geography',
    spatialFeatureType: 'LineStringZM',
    srid: 4326,
  })
  path!: GeoLineStringZM;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  @Column({ name: 'ended_at', type: 'timestamptz' })
  endedAt!: Date;

  /** Outro 통계 — 저장 시 계산해 확정 (재계산 비용 회피) */
  @Column({ name: 'distance_m', type: 'double precision' })
  distanceM!: number;

  @Column({ name: 'elevation_gain_m', type: 'double precision' })
  elevationGainM!: number;

  @Column({ name: 'duration_s', type: 'integer' })
  durationS!: number;

  @Column({ name: 'point_count', type: 'integer' })
  pointCount!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
