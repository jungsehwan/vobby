import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/jwt.strategy.js';
import { ShortFormService } from './short-form.service.js';

@Controller('v1/short-forms')
export class ShortFormController {
  constructor(private readonly shortFormService: ShortFormService) {}

  /** 공개 엔드포인트 — 공유 URL 뷰어가 로그인 없이 호출 */
  @Get('by-slug/:slug')
  getBySlug(@Param('slug') slug: string) {
    return this.shortFormService.getPublicViewBySlug(slug);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getStatus(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const { userId } = req.user as AuthenticatedUser;
    return this.shortFormService.getSummary(userId, id);
  }
}

/** 생성 요청은 여행 리소스 하위 — trip 소유 검증과 함께 (design §2) */
@Controller('v1/trips')
@UseGuards(JwtAuthGuard)
export class ShortFormRequestController {
  constructor(private readonly shortFormService: ShortFormService) {}

  @Post(':tripId/short-form')
  request(@Req() req: Request, @Param('tripId', ParseUUIDPipe) tripId: string) {
    const { userId } = req.user as AuthenticatedUser;
    return this.shortFormService.requestShortForm(userId, tripId);
  }
}
