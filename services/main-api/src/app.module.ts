import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './database/data-source.js';
import { AuthModule } from './domain/auth/auth.module.js';
import { UsersModule } from './domain/user/users.module.js';
import { QueueModule } from './queue/queue.module.js';
import { ShortFormModule } from './domain/short-form/short-form.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(dataSourceOptions),
    UsersModule,
    AuthModule,
    QueueModule,
    ShortFormModule,
  ],
})
export class AppModule {}
