import {
  BadRequestException,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/jwt.strategy.js';
import { MediaService, type UploadedImage } from './media.service.js';

export const MAX_MEDIA_FILE_BYTES = 20 * 1024 * 1024;

@Controller('v1/media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Put(':id/file')
  @HttpCode(204)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_MEDIA_FILE_BYTES } }),
  )
  async uploadFile(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: UploadedImage | undefined,
  ): Promise<void> {
    if (!file) {
      throw new BadRequestException({
        code: 'MEDIA_FILE_REQUIRED',
        message: "multipart 'file' 필드가 필요합니다",
      });
    }
    const { userId } = req.user as AuthenticatedUser;
    await this.mediaService.saveFile(userId, id, file);
  }
}
