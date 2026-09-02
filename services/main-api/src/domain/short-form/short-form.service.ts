import { randomBytes } from 'node:crypto';
import type { ShortFormPublicView, ShortFormSummary } from '@vobby/shared-types';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { publicFileUrl } from '../../storage.js';
import { QueueService } from '../../queue/queue.service.js';
import { Trip } from '../trip/trip.entity.js';
import { ShortForm } from './short-form.entity.js';

export class ShortFormNotFoundException extends HttpException {
  constructor() {
    super(
      { code: 'SHORTFORM_NOT_FOUND', message: '존재하지 않는 영상입니다' },
      HttpStatus.NOT_FOUND,
    );
  }
}

/** 추측 불가 공개 키 — base64url 10자 (design §0-4) */
function newShareSlug(): string {
  return randomBytes(8).toString('base64url').slice(0, 10);
}

function toSummary(sf: ShortForm): ShortFormSummary {
  return {
    id: sf.id,
    tripId: sf.tripId,
    status: sf.status,
    shareSlug: sf.shareSlug!,
    videoUrl: publicFileUrl(sf.videoKey),
    thumbnailUrl: publicFileUrl(sf.thumbnailKey),
    errorMessage: sf.errorMessage,
  };
}

@Injectable()
export class ShortFormService {
  constructor(
    @InjectRepository(ShortForm)
    private readonly shortForms: Repository<ShortForm>,
    @InjectRepository(Trip)
    private readonly trips: Repository<Trip>,
    private readonly queue: QueueService,
  ) {}

  /**
   * 생성 요청 — 멱등 (design §2): 진행 중/완료 행은 그대로 반환(중복 잡 금지),
   * failed만 requested로 되돌려 재큐잉. 여행당 숏폼 1개(MVP).
   */
  async requestShortForm(userId: string, tripId: string): Promise<ShortFormSummary> {
    const trip = await this.trips.findOneBy({ id: tripId, userId });
    if (!trip) {
      throw new HttpException(
        { code: 'TRIP_NOT_FOUND', message: '여행을 찾을 수 없습니다' },
        HttpStatus.NOT_FOUND,
      );
    }

    let sf = await this.shortForms.findOneBy({ tripId, userId });
    if (sf && sf.status !== 'failed') {
      return toSummary(sf);
    }

    if (sf) {
      await this.shortForms.update(
        { id: sf.id },
        { status: 'requested', errorMessage: null },
      );
      sf.status = 'requested';
      sf.errorMessage = null;
    } else {
      // slug UNIQUE 충돌은 확률상 무시 가능하지만 계약이므로 재시도로 방어
      let lastError: unknown;
      for (let attempt = 0; attempt < 3 && !sf; attempt++) {
        try {
          sf = await this.shortForms.save(
            this.shortForms.create({
              userId,
              tripId,
              status: 'requested',
              shareSlug: newShareSlug(),
            }),
          );
        } catch (e) {
          lastError = e;
        }
      }
      if (!sf) throw lastError as Error;
    }

    await this.queue.enqueueGenerateShortForm(sf.id);
    return toSummary(sf);
  }

  async getSummary(userId: string, id: string): Promise<ShortFormSummary> {
    const sf = await this.shortForms.findOneBy({ id, userId });
    if (!sf) throw new ShortFormNotFoundException();
    return toSummary(sf);
  }

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
      videoUrl: publicFileUrl(shortForm.videoKey),
      thumbnailUrl: publicFileUrl(shortForm.thumbnailKey),
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
