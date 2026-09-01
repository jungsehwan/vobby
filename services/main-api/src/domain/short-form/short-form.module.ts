import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShortForm } from './short-form.entity.js';
import { ShortFormController } from './short-form.controller.js';
import { ShortFormService } from './short-form.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([ShortForm])],
  controllers: [ShortFormController],
  providers: [ShortFormService],
})
export class ShortFormModule {}
