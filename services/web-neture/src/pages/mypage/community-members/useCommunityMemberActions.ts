import { useEffect, useRef, useState } from 'react';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import {
  approveJoinRequest,
  changeCommunityMember,
  communityOperatorErrorMessage,
  rejectJoinRequest,
  type JoinRequestRow,
} from '../../../lib/api/communityOperator';
import {
  canRunMemberAction,
  memberActionNotice,
  memberReasonError,
  type MemberAction,
} from './memberWorkflow';

export function useCommunityMemberActions({
  slug,
  canRestrict,
  refresh,
  onChanged,
}: {
  slug: string;
  canRestrict: boolean;
  refresh: () => Promise<boolean>;
  onChanged: () => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<{
    row: JoinRequestRow;
    action: MemberAction;
    reason: string;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshWarning, setRefreshWarning] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const processing = useRef(false);
  const begin = useLatestRequest(slug);
  useEffect(() => {
    if (!canRestrict)
      setDraft((previous) =>
        previous && previous.action !== 'reject' ? null : previous,
      );
  }, [canRestrict]);

  const execute = async (
    row: JoinRequestRow,
    action: MemberAction,
    reason: string,
  ) => {
    if (processing.current || !canRunMemberAction(row, action, canRestrict))
      return;
    const invalid = memberReasonError(action, reason);
    if (invalid) {
      setError(invalid);
      return;
    }
    processing.current = true;
    const current = begin();
    setBusyId(row.id);
    setError(null);
    setNotice(null);
    setRefreshWarning(null);
    try {
      try {
        if (action === 'approve') await approveJoinRequest(slug, row.id);
        else if (action === 'reject')
          await rejectJoinRequest(slug, row.id, reason.trim() || null);
        else await changeCommunityMember(slug, row.id, action, reason.trim());
      } catch (e) {
        if (current())
          setError(
            communityOperatorErrorMessage(
              e,
              '회원 처리에 실패했습니다. 입력을 확인하고 다시 시도하세요.',
            ),
          );
        return;
      }
      if (!current()) return;
      setDraft(null);
      setNotice(memberActionNotice(row, action));
      // 저장과 재조회는 서로 다른 결과다. 재조회 실패 시 mutation을 재전송하지 않는다.
      const refreshed = await Promise.all([refresh(), onChanged()]);
      if (current() && refreshed.some((ok) => !ok))
        setRefreshWarning(
          '처리는 완료했지만 최신 목록을 확인하지 못했습니다. 다시 조회해 주세요.',
        );
    } finally {
      processing.current = false;
      if (current()) setBusyId(null);
    }
  };
  const retryRefresh = async () => {
    if (processing.current || draft) return;
    processing.current = true;
    const current = begin();
    setRefreshing(true);
    try {
      const results = await Promise.all([refresh(), onChanged()]);
      if (current() && results.every((ok) => ok)) setRefreshWarning(null);
    } finally {
      processing.current = false;
      if (current()) setRefreshing(false);
    }
  };
  const open = (row: JoinRequestRow, action: MemberAction) => {
    if (
      processing.current ||
      draft ||
      !canRunMemberAction(row, action, canRestrict)
    )
      return;
    if (action === 'approve') {
      void execute(row, action, '');
      return;
    }
    setError(null);
    setNotice(null);
    setRefreshWarning(null);
    setDraft({ row, action, reason: '' });
  };
  const cancel = () => {
    if (!processing.current) {
      setDraft(null);
      setError(null);
    }
  };
  const submit = () => {
    if (draft) void execute(draft.row, draft.action, draft.reason);
  };
  // 사용자가 목록 뷰(필터·검색·페이지)를 명시적으로 바꾸면 이전 대상의 처리 결과를 지운다.
  // 처리 직후 서버의 자동 페이지 보정은 이 경로를 거치지 않으므로 notice 가 보존된다.
  // refreshWarning 은 운영 목록 재조회 실패도 포함하므로 재조회 성공 전까지 유지한다.
  const clearFeedback = () => {
    if (processing.current) return;
    setError(null);
    setNotice(null);
  };
  const setReason = (reason: string) => {
    if (!processing.current)
      setDraft((prev) => (prev ? { ...prev, reason } : prev));
  };
  return {
    draft,
    busyId,
    error,
    notice,
    refreshWarning,
    open,
    cancel,
    submit,
    setReason,
    retryRefresh,
    clearFeedback,
    locked: busyId !== null || refreshing || draft !== null,
  };
}
