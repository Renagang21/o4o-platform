/**
 * useUnreadCount — 안읽은 메시지 수 폴링 hook
 * WO-O4O-CARE-NOTIFICATION-V1
 */

import { useState, useEffect, useRef } from 'react';
import { patientApi } from '@/api/patient';

export function useUnreadCount(intervalMs = 10_000): number {
  const [count, setCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const fetch = async () => {
      try {
        const res = await patientApi.getUnreadCount();
        if (mountedRef.current && res.success && res.data) {
          setCount(res.data.count ?? 0);
        }
      } catch {
        // silent — keep previous count
      }
    };

    fetch();
    const id = setInterval(fetch, intervalMs);

    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return count;
}
