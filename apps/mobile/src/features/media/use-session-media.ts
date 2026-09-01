import { useCallback, useEffect, useState } from 'react';
import { getSession, type RecordingSession } from '../recording/recording-db';
import { getSessionMedia, type SessionMedia } from './media-db';
import {
  requestMediaPermission,
  scanSession,
  type ScanResult,
} from './media-scan.service';

export function useSessionMedia(sessionId: string) {
  const [session, setSession] = useState<RecordingSession | null>(null);
  const [media, setMedia] = useState<SessionMedia[]>([]);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSession(getSession(sessionId));
    setMedia(getSessionMedia(sessionId));
  }, [sessionId]);

  const scan = useCallback(async () => {
    setError(null);
    const target = getSession(sessionId);
    if (!target) {
      setError('세션을 찾을 수 없습니다');
      return;
    }
    if ((await requestMediaPermission()) !== 'granted') {
      setError('사진 보관함 권한이 필요합니다. 설정에서 허용해 주세요.');
      return;
    }
    setScanning(true);
    try {
      setLastScan(await scanSession(target));
      setMedia(getSessionMedia(sessionId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setScanning(false);
    }
  }, [sessionId]);

  return { session, media, scanning, lastScan, error, scan };
}
