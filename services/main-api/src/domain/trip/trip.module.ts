import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trip } from './trip.entity.js';
import { TripController } from './trip.controller.js';
import { TripService } from './trip.service.js';

@Module({
  // JwtAuthGuard를 쓰는 모듈은 PassportModule.register 필수 (DESIGN §6 참조)
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([Trip]),
  ],
  controllers: [TripController],
  providers: [TripService],
})
export class TripModule {}
