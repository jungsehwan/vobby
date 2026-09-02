import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Media } from './media.entity.js';
import { MediaController } from './media.controller.js';
import { MediaService } from './media.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Media]),
    // JwtAuthGuard 사용 모듈 필수 (DESIGN §3)
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
