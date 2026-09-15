/**
 * 공급자 서비스 이용 상태 조회 hook
 *
 * WO-O4O-NETURE-MAIN-ACCOUNT-AND-SUPPLIER-PARTNER-SERVICE-SEPARATION-V1
 * WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1: partner 축 은퇴
 *
 * 상태는 `GET /neture/home/entry` 의 `serviceStates` (서버 resolveNetureServiceStates,
 * 출처 = neture_suppliers) 에서만 읽는다. 이 hook 은 안내 · 화면 분기용이고
 * 실제 접근은 서버 guard 가 최종 판정한다.
 *
 * 조회 실패는 **미가입으로 취급하지 않는다** → `error` 로 노출하고 재시도만 제공한다.
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from './apiClient';
import { normalizeServiceStates, type NetureServiceStates } from './home-entry';

export interface UseNetureServiceStatesResult {
  states: NetureServiceStates | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useNetureServiceStates(enabled: boolean): UseNetureServiceStatesResult {
  const [states, setStates] = useState<NetureServiceStates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!enabled) {
      setStates(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await api.get('/neture/home/entry');
        const raw = res.data?.data?.serviceStates;
        if (!raw) throw new Error('bad response');
        if (cancelled) return;
        setStates(normalizeServiceStates(raw));
      } catch {
        if (cancelled) return;
        setStates(null);
        setError('서비스 이용 상태를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, tick]);

  return { states, loading, error, reload };
}
