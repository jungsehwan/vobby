import { useCallback, useEffect, useRef, useState } from 'react';
import type { ShortFormSummary } from '@vobby/shared-types';
import {
  getShortForm,
  isInProgress,
  notifyShortFormDone,
  requestShortForm,
} from './short-form.service';

const POLL_INTERVAL_MS = 3000;

/** 생성 요청 + 완료까지 상태 폴링 — 화면에서 직접 인터벌 관리 금지 (DESIGN §4) */
export function useShortForm() {
  const [shortForm, setShortForm] = useState<ShortFormSummary | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notifiedRef = useRef(false);

  const request = useCallback(async (serverTripId: string) => {
    setError(null);
    setRequesting(true);
    notifiedRef.current = false;
    try {
      setShortForm(await requestShortForm(serverTripId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRequesting(false);
    }
  }, []);

  useEffect(() => {
    if (!shortForm || !isInProgress(shortForm.status)) {
      if (shortForm?.status === 'done' && !notifiedRef.current) {
        notifiedRef.current = true;
        // 알림 실패는 UX 부가 기능 — 화면 상태 표시가 진실 소스
        notifyShortFormDone().catch(() => undefined);
      }
      return;
    }
    const timer = setInterval(() => {
      getShortForm(shortForm.id)
        .then(setShortForm)
        .catch((e: unknown) =>
          setError(e instanceof Error ? e.message : String(e)),
        );
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [shortForm]);

  return { shortForm, requesting, error, request };
}
