import { clusterTrips } from './clustering';
import { getAllAssetMeta, rewriteTrips } from './trips-db';
import { scanGallery, type GalleryScanResult } from './gallery-scan.service';

export interface RebuildResult extends GalleryScanResult {
  tripCount: number;
}

/** 스캔 → 클러스터링 → 파생 테이블 재작성 (전 과정 멱등) */
export async function scanAndRebuild(
  onProgress?: (scannedPages: number) => void,
): Promise<RebuildResult> {
  const scan = await scanGallery(onProgress);
  const { trips, media } = clusterTrips(getAllAssetMeta());
  rewriteTrips(trips, media);
  return { ...scan, tripCount: trips.length };
}
