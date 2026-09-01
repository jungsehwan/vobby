import type { ShortFormPublicView } from '@vobby/shared-types';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShortForm } from './short-form.entity.js';

export class ShortFormNotFoundException extends HttpException {
  constructor() {
    super(
      { code: 'SHORTFORM_NOT_FOUND', message: '존재하지 않는 영상입니다' },
      HttpStatus.NOT_FOUND,
    );
  }
}

@Injectable()
export class ShortFormService {
  constructor(
    @InjectRepository(ShortForm)
    private readonly shortForms: Repository<ShortForm>,
  ) {}

  /** 공유 뷰어용 — done이 아니어도 상태를 노출한다 (진행 안내용, design §2.1) */
  async getPublicViewBySlug(slug: string): Promise<ShortFormPublicView> {
    const shortForm = await this.shortForms.findOne({
      where: { shareSlug: slug },
      relations: { trip: true },
    });
    if (!shortForm) {
      throw new ShortFormNotFoundException();
    }
    const trip = shortForm.trip;
    return {
      shareSlug: slug,
      title: trip.title,
      status: shortForm.status,
      videoKey: shortForm.videoKey,
      thumbnailKey: shortForm.thumbnailKey,
      durationS: shortForm.durationS,
      stats: {
        distanceM: trip.distanceM,
        durationS: Math.round(
          (trip.endedAt.getTime() - trip.startedAt.getTime()) / 1000,
        ),
        mediaCount: trip.mediaCount,
      },
      createdAt: shortForm.createdAt.toISOString(),
    };
  }
}
