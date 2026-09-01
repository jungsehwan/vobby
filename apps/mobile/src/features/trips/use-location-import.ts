import { useCallback, useState } from 'react';
import { listImportedFiles, listTrips, type ImportedFile } from './trips-db';
import {
  importLocationText,
  pickAndImport,
  type ImportResult,
} from './location-import.service';
import { sampleGoogleTimeline, sampleGpx } from './dev-fixtures';

export function useLocationImport() {
  const [files, setFiles] = useState<ImportedFile[]>(() => listImportedFiles());
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (work: () => Promise<ImportResult | null>) => {
    setError(null);
    setImporting(true);
    try {
      const result = await work();
      if (result) setLastResult(result);
      setFiles(listImportedFiles());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setImporting(false);
    }
  }, []);

  const pickFile = useCallback(() => run(pickAndImport), [run]);

  /** __DEV__ 전용 — 최신 여행 기간에 맞춘 샘플로 보강 검증 (design §0-4) */
  const importSamples = useCallback(
    () =>
      run(async () => {
        const latest = listTrips()[0];
        const endS = latest?.ended_at ?? Math.floor(Date.now() / 1000);
        const startS = latest?.started_at ?? endS - 4 * 3600;
        importLocationText('sample-busan.gpx', sampleGpx(startS, endS));
        return importLocationText(
          'sample-timeline.json',
          sampleGoogleTimeline(startS, endS),
        );
      }),
    [run],
  );

  return { files, importing, lastResult, error, pickFile, importSamples };
}
