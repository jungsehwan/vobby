import * as MediaLibrary from 'expo-media-library/legacy';
import {
  getKnownAssetIds,
  upsertAssetMeta,
  type AssetMeta,
} from './trips-db';

const PAGE_SIZE = 100;

export type ScanPermission = 'granted' | 'denied';

export async function requestMediaPermission(): Promise<ScanPermission> {
  const res = await MediaLibrary.requestPermissionsAsync();
  return res.granted ? 'granted' : 'denied';
}

/** EXIF DateTimeOriginal("YYYY:MM:DD HH:MM:SS") → epoch초. 실패 시 null.
 *  EXIF에는 타임존이 없어 기기 TZ로 해석 — 촬영지 TZ가 다르면 오차 가능 (규격 한계) */
function parseExifDate(exif: Record<string, unknown> | undefined): number | null {
  const raw =
    (exif?.['DateTimeOriginal'] as string | undefined) ??
    (exif?.['{Exif}'] as { DateTimeOriginal?: string } | undefined)
      ?.DateTimeOriginal;
  if (!raw) return null;
  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(raw);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const t = new Date(+y, +mo - 1, +d, +h, +mi, +s).getTime();
  return Number.isNaN(t) ? null : Math.round(t / 1000);
}

export interface GalleryScanResult {
  total: number;
  added: number;
}

/** 갤러리 전체(사진)를 순회하며 asset_meta 캐시 갱신 — 신규 asset만 상세 조회 (design §0-1) */
export async function scanGallery(
  onProgress?: (scannedPages: number) => void,
): Promise<GalleryScanResult> {
  const known = getKnownAssetIds();
  const result: GalleryScanResult = { total: 0, added: 0 };
  let after: MediaLibrary.AssetRef | undefined;
  let pages = 0;

  for (;;) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.photo,
      first: PAGE_SIZE,
      after,
      sortBy: MediaLibrary.SortBy.creationTime,
    });

    for (const asset of page.assets) {
      result.total++;
      if (known.has(asset.id)) continue;
      const info = await MediaLibrary.getAssetInfoAsync(asset);
      const meta: AssetMeta = {
        asset_id: asset.id,
        captured_at:
          parseExifDate(info.exif as Record<string, unknown> | undefined) ??
          Math.round(asset.creationTime / 1000),
        lon: info.location?.longitude ?? null,
        lat: info.location?.latitude ?? null,
        width: asset.width ?? null,
        height: asset.height ?? null,
        uri: info.localUri ?? asset.uri,
      };
      upsertAssetMeta(meta);
      result.added++;
    }

    pages++;
    onProgress?.(pages);
    if (!page.hasNextPage) break;
    after = page.endCursor;
  }
  return result;
}
