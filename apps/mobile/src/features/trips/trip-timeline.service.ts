import { clusterTrips } from './clustering';
import { getAllAssetMeta, getAllLocationPoints, rewriteTrips } from './trips-db';
import { scanGallery, type GalleryScanResult } from './gallery-scan.service';

export interface RebuildResult extends GalleryScanResult {
  tripCount: number;
}

/** 스캔 없이 파생 테이블만 재계산 — 위치 이력 import 후 사용 */
export function rebuildTrips(): number {
  const { trips, media } = clusterTrips(getAllAssetMeta(), getAllLocationPoints());
  rewriteTrips(trips, media);
  return trips.length;
}

/** 스캔 → 클러스터링 → 파생 테이블 재작성 (전 과정 멱등) */
export async function scanAndRebuild(
  onProgress?: (scannedPages: number) => void,
): Promise<RebuildResult> {
  const scan = await scanGallery(onProgress);
  return { ...scan, tripCount: rebuildTrips() };
}
