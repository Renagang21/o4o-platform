import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useStoreOperationScope } from '../../hooks/useStoreOperationScope';
import { neturePharmacyApi, type SemiFranchiseRow } from '../../api/neturePharmacy';

/** Business membership is independent of technical service enrollment and resource counts. */
export function useStoreBusinesses() {
  const { user } = useAuth();
  const { key, isCurrent } = useStoreOperationScope();
  const [revision, setRevision] = useState(0);
  const scope = `${user?.id}:${key}:${revision}`;
  const [result, setResult] = useState<{ scope: string; rows: SemiFranchiseRow[]; error?: boolean } | null>(null);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let cancelled = false;
    if (!isCurrent()) return;
    neturePharmacyApi.listSemiFranchises().then(rows => {
      if (!Array.isArray(rows) || rows.some(row => !row || typeof row.key !== 'string' || !row.key || typeof row.name !== 'string' ||
        (row.membershipStatus !== null && !['pending','active','rejected','suspended','terminated'].includes(row.membershipStatus)))) throw new Error('Invalid business list');
      if (!cancelled && isCurrent()) setResult({ scope, rows });
    }).catch(() => { if (!cancelled && isCurrent()) setResult({ scope, rows: [], error: true }); });
    return () => { cancelled = true; };
  }, [scope, isCurrent]);
  const current = result?.scope === scope ? result : null;
  const rows = current?.rows ?? [];
  return { rows, joined: rows.filter(row => row.membershipStatus === 'active'), loading: !current,
    error: current?.error === true, reload, isCurrent };
}
