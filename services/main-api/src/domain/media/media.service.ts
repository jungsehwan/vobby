import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { storageRoot } from '../../storage.js';
import { Media } from './media.entity.js';

/** multer 메모리 스토리지 결과 중 사용하는 부분만 — @types/multer 비의존 */
export interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private readonly media: Repository<Media>,
  ) {}

  /** 원본 저장 + storage_key 기록 — 같은 미디어 재업로드는 덮어쓰기 멱등 (design §0-2) */
  async saveFile(userId: string, mediaId: string, file: UploadedImage): Promise<void> {
    const row = await this.media.findOneBy({ id: mediaId, userId });
    if (!row) {
      // 타인 소유 여부를 구분해 노출하지 않는다
      throw new NotFoundException({ code: 'MEDIA_NOT_FOUND', message: '미디어가 없습니다' });
    }
    const ext = EXT_BY_MIME[file.mimetype];
    if (!ext) {
      throw new BadRequestException({
        code: 'MEDIA_UNSUPPORTED_TYPE',
        message: 'jpeg/png 이미지만 업로드할 수 있습니다',
      });
    }

    const storageKey = `media/${mediaId}.${ext}`;
    const path = join(storageRoot(), storageKey);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, file.buffer);
    await this.media.update({ id: mediaId }, { storageKey });
  }
}
