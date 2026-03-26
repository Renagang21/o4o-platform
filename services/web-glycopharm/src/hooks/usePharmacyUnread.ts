/**
 * usePharmacyUnread — 약국 안읽은 메시지 수 폴링 hook
 * WO-O4O-CARE-NOTIFICATION-V1
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { pharmacyApi } from '@/api/pharmacy';

interface PharmacyUnread {
  totalCount: number;
  byPatient: Map<string, number>;
}

export function usePharmacyUnread(intervalMs = 10_000): PharmacyUnread {
  const [totalCount, setTotalCount] = useState(0);
  const [byPatientList, setByPatientList] = useState<Array<{ patientId: string; count: number }>>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const fetch = async () => {
      try {
        const [countRes, byPatientRes] = await Promise.all([
          pharmacyApi.getPharmacyUnreadCount().catch(() => null),
          pharmacyApi.getPharmacyUnreadByPatient().catch(() => null),
        ]);
        if (!mountedRef.current) return;

        if (countRes && typeof countRes.count === 'number') {
          setTotalCount(countRes.count);
        }
        if (Array.isArray(byPatientRes)) {
          setByPatientList(byPatientRes);
        }
      } catch {
        // silent — keep previous values
      }
    };

    fetch();
    const id = setInterval(fetch, intervalMs);

    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  const byPatient = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of byPatientList) {
      map.set(item.patientId, item.count);
    }
    return map;
  }, [byPatientList]);

  return { totalCount, byPatient };
}
