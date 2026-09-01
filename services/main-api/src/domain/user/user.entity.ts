import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

/** OAuth 제공자 — 확장 시 마이그레이션에서 CHECK 제약도 함께 교체 (design §0-3) */
export type AuthProvider = 'google' | 'kakao';

@Entity('users')
@Unique('uq_users_provider_uid', ['provider', 'providerUid'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  provider!: AuthProvider;

  @Column({ name: 'provider_uid', type: 'text' })
  providerUid!: string;

  /** Kakao는 이메일 미제공 케이스가 있어 nullable */
  @Column({ type: 'text', nullable: true })
  email!: string | null;

  @Column({ type: 'text' })
  nickname!: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
