import 'reflect-metadata';
import 'dotenv/config';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { User } from '../domain/user/user.entity.js';
import { Trajectory } from '../domain/trajectory/trajectory.entity.js';
import { Media } from '../domain/media/media.entity.js';
import { ShortForm } from '../domain/short-form/short-form.entity.js';
import { InitialSchema1788220800000 } from './migrations/1788220800000-InitialSchema.js';

// 미설정 시 pg가 기본값(localhost:5432 — 이 머신에선 타 프로젝트 PG15)으로
// 조용히 붙는 사고를 막기 위해 명시적으로 실패시킨다
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL 환경변수가 설정되지 않았습니다 (.env.example 참조)',
  );
}

// 앱(TypeOrmModule)과 마이그레이션 러너가 공유하는 단일 옵션.
// synchronize는 어떤 환경에서도 켜지 않는다 — 스키마 변경은 마이그레이션으로만 (AGENTS.md Data agent)
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: databaseUrl,
  entities: [User, Trajectory, Media, ShortForm],
  migrations: [InitialSchema1788220800000],
  synchronize: false,
  logging: ['error', 'warn', 'migration'],
};

export const AppDataSource = new DataSource(dataSourceOptions);
