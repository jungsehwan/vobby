import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueModule } from '../../queue/queue.module.js';
import { Trip } from '../trip/trip.entity.js';
import { ShortForm } from './short-form.entity.js';
import {
  ShortFormController,
  ShortFormRequestController,
} from './short-form.controller.js';
import { ShortFormService } from './short-form.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShortForm, Trip]),
    // JwtAuthGuard 사용 모듈 필수 (DESIGN §3)
    PassportModule.register({ defaultStrategy: 'jwt' }),
    QueueModule,
  ],
  controllers: [ShortFormController, ShortFormRequestController],
  providers: [ShortFormService],
})
export class ShortFormModule {}
