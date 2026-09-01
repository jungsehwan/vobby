import { useCallback, useEffect, useState } from 'react';
import * as MediaLibrary from 'expo-media-library/legacy';
import { listTrips, type Trip } from './trips-db';
import { requestMediaPermission } from './gallery-scan.service';
import { scanAndRebuild, type RebuildResult } from './trip-timeline.service';

export function useTrips() {
  const [permission, setPermission] = useState<'granted' | 'denied' | 'unknown'>('unknown');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastResult, setLastResult] = useState<RebuildResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await MediaLibrary.getPermissionsAsync();
      setPermission(res.granted ? 'granted' : 'denied');
      setTrips(listTrips());
    })().catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const scan = useCallback(async () => {
    setError(null);
    if ((await requestMediaPermission()) !== 'granted') {
      setPermission('denied');
      setError('사진 보관함 권한이 필요합니다. 설정에서 허용해 주세요.');
      return;
    }
    setPermission('granted');
    setScanning(true);
    setProgress(0);
    try {
      setLastResult(await scanAndRebuild(setProgress));
      setTrips(listTrips());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setScanning(false);
    }
  }, []);

  return { permission, trips, scanning, progress, lastResult, error, scan };
}
