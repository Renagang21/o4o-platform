import { useCallback, useEffect, useRef, useState } from 'react';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import {
  approveCreationRequest,
  communityAdminErrorMessage,
  listCreationRequests,
  rejectCreationRequest,
  type CommunityCreationRequestRow,
} from '../../../lib/api/communityServiceAdmin';

/** 개설 심사의 저장 결과와 목록 조회 결과는 별도로 보존한다. */
export default function CreationRequestsPanel() {
  const [rows, setRows] = useState<CommunityCreationRequestRow[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejection, setRejection] = useState<{
    row: CommunityCreationRequestRow;
    reason: string;
  } | null>(null);
  const [failedTarget, setFailedTarget] = useState<string | null>(null);
  const processing = useRef(false);
  const beginList = useLatestRequest('creation');
  const beginAction = useLatestRequest('creation');
  const load = useCallback(async () => {
    const current = beginList();
    setRows(null);
    setListError(null);
    try {
      const list = await listCreationRequests();
      if (!current()) return false;
      setRows(list);
      return true;
    } catch (e) {
      if (current())
        setListError(
          communityAdminErrorMessage(
            e,
            '개설 신청 목록을 불러오지 못했습니다.',
          ),
        );
      return false;
    }
  }, [beginList]);
  useEffect(() => {
    void load();
  }, [load]);

  const process = async (
    row: CommunityCreationRequestRow,
    kind: 'approve' | 'reject',
    reason = '',
  ) => {
    if (processing.current) return;
    if (kind === 'reject' && !reason.trim()) {
      setActionError('거절 사유가 필요합니다.');
      return;
    }
    processing.current = true;
    const current = beginAction();
    setBusyId(row.id);
    setActionError(null);
    setFailedTarget(null);
    setNotice(null);
    try {
      try {
        if (kind === 'approve') {
          const result = await approveCreationRequest(row.id);
          if (!current()) return;
          setNotice(
            result?.outcome === 'slug_conflict'
              ? `주소(${row.desiredSlug})가 이미 사용 중이라 신청자에게 재신청을 요청했습니다.`
              : `「${row.name}」 커뮤니티를 개설했습니다.`,
          );
        } else {
          await rejectCreationRequest(row.id, reason.trim());
          if (!current()) return;
          setRejection(null);
          setNotice(`「${row.name}」 개설 신청을 거절했습니다.`);
        }
      } catch (e) {
        if (current()) {
          setFailedTarget(row.name);
          setActionError(
            communityAdminErrorMessage(
              e,
              kind === 'approve'
                ? '개설 승인에 실패했습니다.'
                : '개설 거절에 실패했습니다.',
            ),
          );
        }
        return;
      }
      await load();
    } finally {
      processing.current = false;
      if (current()) setBusyId(null);
    }
  };
  const locked = busyId !== null || rejection !== null;
  return (
    <section className="mt-6 text-sm">
      {notice && (
        <p role="status" className="mb-3 text-green-700">
          {notice}
        </p>
      )}
      {listError && (
        <div role="alert" className="mb-3 text-red-600">
          {notice && <p>처리는 완료했지만 최신 목록을 확인하지 못했습니다.</p>}
          <p>{listError}</p>
          <button
            type="button"
            className="min-h-11 rounded border px-3"
            disabled={locked}
            onClick={() => {
              void load();
            }}
          >
            다시 조회
          </button>
        </div>
      )}
      {actionError && !rejection && (
        <div role="alert" className="mb-3 text-red-600">
          <p>처리 대상: {failedTarget}</p>
          <p>{actionError}</p>
        </div>
      )}
      {rejection && (
        <div
          role="dialog"
          aria-labelledby="creation-rejection-title"
          className="mb-4 space-y-3 rounded border bg-slate-50 p-4"
        >
          <h2 id="creation-rejection-title" className="font-semibold">
            커뮤니티 개설 반려
          </h2>
          <p className="break-words">
            대상: {rejection.row.name} · {rejection.row.desiredSlug}
          </p>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void process(rejection.row, 'reject', rejection.reason);
            }}
          >
            <label className="block">
              거절 사유 (필수)
              <textarea
                aria-label="거절 사유"
                value={rejection.reason}
                disabled={busyId !== null}
                rows={3}
                className="mt-1 block w-full rounded border p-2"
                onChange={(e) =>
                  setRejection((previous) =>
                    previous ? { ...previous, reason: e.target.value } : null,
                  )
                }
              />
            </label>
            <p className="text-xs text-slate-500">
              개인정보는 입력하지 마세요.
            </p>
            {actionError && (
              <p role="alert" className="text-red-600">
                {actionError}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={busyId !== null}
                className="min-h-11 rounded bg-slate-900 px-4 text-white"
              >
                {busyId ? '처리 중…' : '반려 확인'}
              </button>
              <button
                type="button"
                disabled={busyId !== null}
                className="min-h-11 rounded border px-4"
                onClick={() => {
                  if (!processing.current) {
                    setRejection(null);
                    setActionError(null);
                  }
                }}
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}
      {rows === null && !listError && (
        <p className="text-slate-500">불러오는 중입니다…</p>
      )}
      {rows && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="py-2">이름</th>
                <th>주소</th>
                <th>신청일</th>
                <th className="text-right">처리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="py-2 text-slate-800">
                    {row.name}
                    {row.description && (
                      <div className="text-xs text-slate-500">
                        {row.description}
                      </div>
                    )}
                  </td>
                  <td className="text-slate-600">{row.desiredSlug}</td>
                  <td className="text-slate-600">
                    {new Date(row.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="whitespace-nowrap py-2 text-right">
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        void process(row, 'approve');
                      }}
                      className="min-h-11 rounded bg-slate-900 px-3 text-xs text-white disabled:opacity-50"
                    >
                      승인
                    </button>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        if (!processing.current) {
                          setRejection({ row, reason: '' });
                          setActionError(null);
                        }
                      }}
                      className="ml-2 min-h-11 rounded border px-3 text-xs disabled:opacity-50"
                    >
                      거절
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows?.length === 0 && !listError && (
        <p className="text-slate-500">심사 대기 중인 개설 신청이 없습니다.</p>
      )}
    </section>
  );
}
