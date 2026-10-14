import { useCallback, useEffect, useRef } from 'react';
import { useStoreOrganizationId } from './useStoreOrganizationId';
import { getActiveStoreOrganizationId } from '../lib/storeOrganizationHeader';
import { getActiveServiceKey } from '../lib/serviceContext';

/** A mounted home or publishing session belongs to one selected store and service. */
export function useStoreOperationScope() {
  const { organizationId } = useStoreOrganizationId();
  const serviceKey = getActiveServiceKey();
  const key = `${organizationId}:${serviceKey}`;
  const selected = useRef(key), mounted = useRef(true);
  selected.current = key;
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const isCurrent = useCallback(() => mounted.current && selected.current === key &&
    !!organizationId && getActiveStoreOrganizationId() === organizationId &&
    getActiveServiceKey() === serviceKey, [key, organizationId, serviceKey]);
  return { key, organizationId, isCurrent };
}
