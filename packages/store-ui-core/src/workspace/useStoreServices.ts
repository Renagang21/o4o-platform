/**
 * useStoreServices — My Services 조회 훅 (표시 전용)
 *
 * WO-O4O-STORE-WORKSPACE-INTEGRATION-AND-MY-SERVICES-V1 (§7)
 *
 * 조회 실패를 "가입 없음"으로 바꾸지 않는다 — error 로 노출하고 재시도만 제공한다
 * (web-neture home-entry 와 같은 원칙).
 */

import { useCallback, useEffect, useState } from 'react';
import type { StoreServiceResolution, StoreServicesApi } from '../api/createStoreServicesApi';

export interface UseStoreServicesState {
  loading: boolean;
  error: string | null;
  resolution: StoreServiceResolution | null;
  reload: () => void;
}

export function useStoreServices(
  api: Pick<StoreServicesApi, 'fetchStoreServices'>,
  organizationId?: string | null,
): UseStoreServicesState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolution, setResolution] = useState<StoreServiceResolution | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .fetchStoreServices(organizationId ?? null)
      .then((data) => {
        if (cancelled) return;
        setResolution(data);
      })
      .catch(() => {
        if (cancelled) return;
        setResolution(null);
        setError('이용 중인 서비스를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, organizationId, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { loading, error, resolution, reload };
}
