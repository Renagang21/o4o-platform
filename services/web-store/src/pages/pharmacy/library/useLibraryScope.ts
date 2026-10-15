import { useCallback, useEffect, useRef } from 'react';
import { useStoreOrganizationId } from '../../../hooks/useStoreOrganizationId';
import { getActiveStoreOrganizationId } from '../../../lib/storeOrganizationHeader';
import { getActiveServiceKey } from '../../../lib/serviceContext';

/** Mounted library views own requests and selection for exactly one store/service. */
export function useLibraryScope() {
  const { organizationId } = useStoreOrganizationId();
  const serviceKey = getActiveServiceKey();
  const scope = `${organizationId}:${serviceKey}`;
  const current = useRef(scope);
  current.current = scope;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const isCurrent = useCallback(() => mounted.current && current.current === scope &&
    !!organizationId && getActiveStoreOrganizationId() === organizationId &&
    getActiveServiceKey() === serviceKey, [scope, organizationId, serviceKey]);
  return { scope, organizationId, isCurrent };
}
