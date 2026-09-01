import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { parseLocationFile } from './location-parsers';
import { rebuildTrips } from './trip-timeline.service';
import { replaceLocationPoints } from './trips-db';

/** 초대형 Takeout 방어 — 스트리밍 파싱 전까지 상한 (plan §5) */
export const MAX_IMPORT_BYTES = 50 * 1024 * 1024;

export interface ImportResult {
  fileName: string;
  pointCount: number;
  tripCount: number;
}

/** 파싱 → 파일 단위 교체 저장 → 재클러스터 (전 과정 멱등) */
export function importLocationText(fileName: string, text: string): ImportResult {
  const points = parseLocationFile(fileName, text);
  replaceLocationPoints(fileName, points);
  return { fileName, pointCount: points.length, tripCount: rebuildTrips() };
}

/** 파일 선택 → import. 사용자가 취소하면 null. */
export async function pickAndImport(): Promise<ImportResult | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/gpx+xml', 'application/json', 'application/octet-stream', 'text/xml'],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  const file = new File(asset.uri);
  if (file.size > MAX_IMPORT_BYTES) {
    throw new Error(
      `파일이 너무 큽니다 (${Math.round(file.size / 1024 / 1024)}MB > 50MB) — 기간을 나눠 내보내 주세요`,
    );
  }
  return importLocationText(asset.name, await file.text());
}
