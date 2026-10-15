import { useEffect, useState } from 'react';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import {
  communityOperatorErrorMessage,
  listCommunityMemberHistory,
  type CommunityMembershipChange,
  type JoinRequestRow,
} from '../../../lib/api/communityOperator';

export function useCommunityMemberHistory(slug: string, scope: string) {
  const [target, setTarget] = useState<JoinRequestRow | null>(null);
  const [changes, setChanges] = useState<CommunityMembershipChange[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const begin = useLatestRequest(scope);
  const close = () => {
    begin();
    setTarget(null);
    setChanges(null);
    setError(null);
  };
  useEffect(() => {
    setTarget(null);
    setChanges(null);
    setError(null);
  }, [scope]);
  const open = async (row: JoinRequestRow) => {
    const current = begin();
    setTarget(row);
    setChanges(null);
    setError(null);
    try {
      const result = await listCommunityMemberHistory(slug, row.id);
      if (current()) setChanges(result);
    } catch (e) {
      if (current())
        setError(
          communityOperatorErrorMessage(e, '변경 이력을 불러오지 못했습니다.'),
        );
    }
  };
  return {
    target,
    changes,
    error,
    close,
    open,
    retry: () => {
      if (target) void open(target);
    },
  };
}
