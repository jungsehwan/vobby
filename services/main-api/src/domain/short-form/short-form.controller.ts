import { Controller, Get, Param } from '@nestjs/common';
import { ShortFormService } from './short-form.service.js';

@Controller('v1/short-forms')
export class ShortFormController {
  constructor(private readonly shortFormService: ShortFormService) {}

  /** 공개 엔드포인트 — 공유 URL 뷰어가 로그인 없이 호출 */
  @Get('by-slug/:slug')
  getBySlug(@Param('slug') slug: string) {
    return this.shortFormService.getPublicViewBySlug(slug);
  }
}
