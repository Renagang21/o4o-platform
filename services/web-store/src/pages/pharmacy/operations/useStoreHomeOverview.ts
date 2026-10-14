import { useCallback, useEffect, useState } from 'react';
import { useStoreOperationScope } from '../../../hooks/useStoreOperationScope';
import { useLatestStoreRequest } from '../hooks/useLatestStoreRequest';
import { emptyOverview, loadHomeOverview } from './homeOverview';

export function useStoreHomeOverview() {
  const { key, organizationId, isCurrent } = useStoreOperationScope();
  const request = useLatestStoreRequest(key);
  const [data, setData] = useState(emptyOverview), [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    if (!isCurrent()) { if (!organizationId) setLoading(false); return; }
    const current = request.begin();
    setLoading(true); setData(emptyOverview);
    const next = await loadHomeOverview(organizationId);
    if (current() && isCurrent()) { setData(next); setLoading(false); }
  }, [organizationId, isCurrent, request]);
  useEffect(() => { void reload(); }, [reload]);
  return { ...data, loading, reload, noStore: !organizationId };
}
