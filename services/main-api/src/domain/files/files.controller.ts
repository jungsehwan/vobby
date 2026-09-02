import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'node:path';
import { storageRoot } from '../../storage.js';

/** 렌더 산출물(uuid.mp4/jpg)만 허용 — 경로 조작·원본(media/) 접근 차단 (design §0-3) */
const RENDER_NAME = /^[0-9a-f-]{36}\.(mp4|jpg)$/;

@Controller('files')
export class FilesController {
  /** 공개 엔드포인트 — 공유 뷰어·앱 플레이어가 로그인 없이 스트림 */
  @Get('renders/:name')
  streamRender(@Param('name') name: string, @Res() res: Response): void {
    if (!RENDER_NAME.test(name)) {
      throw new NotFoundException({ code: 'FILE_NOT_FOUND', message: '파일이 없습니다' });
    }
    res.sendFile(join(storageRoot(), 'renders', name), (err) => {
      if (err && !res.headersSent) {
        res.status(404).json({ code: 'FILE_NOT_FOUND', message: '파일이 없습니다' });
      }
    });
  }
}
