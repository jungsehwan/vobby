import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './database/data-source.js';
import { AuthModule } from './domain/auth/auth.module.js';
import { FilesModule } from './domain/files/files.module.js';
import { MediaModule } from './domain/media/media.module.js';
import { UsersModule } from './domain/user/users.module.js';
import { QueueModule } from './queue/queue.module.js';
import { ShortFormModule } from './domain/short-form/short-form.module.js';
import { TripModule } from './domain/trip/trip.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(dataSourceOptions),
    UsersModule,
    AuthModule,
    QueueModule,
    ShortFormModule,
    TripModule,
    MediaModule,
    FilesModule,
  ],
})
export class AppModule {}
