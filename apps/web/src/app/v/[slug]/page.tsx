import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchShortForm } from '@/lib/api';

interface Props {
  params: Promise<{ slug: string }>;
}

function formatStats(distanceM: number | null, durationS: number, mediaCount: number): string {
  const parts = [
    distanceM !== null ? `약 ${(distanceM / 1000).toFixed(1)}km` : null,
    `${Math.round(durationS / 60)}분`,
    `사진 ${mediaCount}장`,
  ].filter(Boolean);
  return parts.join(' · ');
}

/** SNS 크롤러용 리치 미리보기 — SSR 필수 경로 (plan §5) */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await fetchShortForm(slug);
  if (result.kind !== 'found') {
    return { title: 'Vobby' };
  }
  const { shortForm } = result;
  const title = shortForm.title ? `${shortForm.title} | Vobby` : 'Vobby 여행 영상';
  const description = formatStats(
    shortForm.stats.distanceM,
    shortForm.stats.durationS,
    shortForm.stats.mediaCount,
  );
  return {
    title,
    description,
    openGraph: { title, description, type: 'video.other' },
  };
}

const STATUS_MESSAGE: Record<string, string> = {
  requested: '영상 생성을 준비하고 있어요.',
  analyzing: 'AI가 사진과 경로를 분석하고 있어요.',
  rendering: '영상을 만들고 있어요. 잠시 후 다시 확인해 주세요.',
  failed: '영상 생성에 실패했어요. 앱에서 다시 시도해 주세요.',
};

export default async function ViewerPage({ params }: Props) {
  const { slug } = await params;
  const result = await fetchShortForm(slug);

  if (result.kind === 'not-found') {
    notFound();
  }
  if (result.kind === 'api-error') {
    return (
      <main>
        <h1>Vobby</h1>
        <p className="error">
          일시적으로 영상 정보를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.
        </p>
      </main>
    );
  }

  const { shortForm } = result;
  return (
    <main>
      <h1>{shortForm.title ?? 'Vobby 여행 영상'}</h1>
      <div className="stats card">
        <div className="stat">
          <strong>
            {shortForm.stats.distanceM !== null
              ? `${(shortForm.stats.distanceM / 1000).toFixed(1)}km`
              : '-'}
          </strong>
          <span className="caption">이동 거리</span>
        </div>
        <div className="stat">
          <strong>{Math.round(shortForm.stats.durationS / 60)}분</strong>
          <span className="caption">여행 시간</span>
        </div>
        <div className="stat">
          <strong>{shortForm.stats.mediaCount}장</strong>
          <span className="caption">사진</span>
        </div>
      </div>

      {shortForm.status === 'done' && shortForm.videoKey ? (
        // 실제 재생은 마일스톤 4(렌더러)에서 — 스트리밍 URL 체계와 함께
        <div className="video-placeholder">영상 플레이어 준비 중</div>
      ) : (
        <div className="card">
          <p>{STATUS_MESSAGE[shortForm.status] ?? '처리 중입니다.'}</p>
        </div>
      )}

      <Link className="cta" href="/">
        나도 Vobby로 여행 영상 만들기
      </Link>
    </main>
  );
}
