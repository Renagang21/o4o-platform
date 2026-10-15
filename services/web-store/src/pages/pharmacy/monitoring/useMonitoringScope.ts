import { useLayoutEffect, useRef } from 'react';
import { useUnifiedStore } from '../../../contexts/StoreContext';
import { getActiveStoreOrganizationId } from '../../../lib/storeOrganizationHeader';

/** The outer page keys its controller by this scope, including service changes. */
export function useMonitoringScope() {
  const { status, organizationId, effectiveServiceKey } = useUnifiedStore();
  return { key: `${organizationId ?? ''}:${effectiveServiceKey ?? ''}`, organizationId,
    ready: status === 'ready' && !!organizationId && !!effectiveServiceKey };
}

export function useMonitoringOwner(organizationId: string) {
  const mounted = useRef(true);
  useLayoutEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  return () => mounted.current && getActiveStoreOrganizationId() === organizationId;
}
