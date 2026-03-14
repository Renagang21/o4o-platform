/**
 * useStoreCapabilities — Store Capability 기반 메뉴 필터링 hook
 * WO-O4O-CAPABILITY-MENU-INTEGRATION-V1
 *
 * 활성화된 Capability key Set을 반환.
 * API 실패 시 null → resolveStoreMenu이 전체 메뉴 표시 (graceful degradation).
 */

import { useState, useEffect } from 'react';
import { fetchStoreCapabilities } from '../api/storeHub';

export function useStoreCapabilities(): Set<string> | null {
  const [enabledCaps, setEnabledCaps] = useState<Set<string> | null>(null);

  useEffect(() => {
    fetchStoreCapabilities()
      .then((caps) => {
        setEnabledCaps(new Set(caps.filter((c) => c.enabled).map((c) => c.key)));
      })
      .catch(() => {
        setEnabledCaps(null);
      });
  }, []);

  return enabledCaps;
}
