import { CommunityMemberListControls } from '../../../components/community/CommunityMemberListControls';
import type { OperatedCommunity } from '../../../lib/api/communityOperator';
import { CommunityMemberTable } from './CommunityMemberTable';
import {
  MEMBER_ACTION_LABEL,
  MEMBER_ROLE_LABEL,
  MEMBER_STATUS_LABEL,
  type MemberAction,
} from './memberWorkflow';
import { useCommunityMemberActions } from './useCommunityMemberActions';
import { useCommunityMemberHistory } from './useCommunityMemberHistory';
import { useCommunityMemberList } from './useCommunityMemberList';

export function CommunityMembersPanel({
  community,
  onChanged,
}: Readonly<{
  community: OperatedCommunity;
  onChanged: () => Promise<boolean>;
}>) {
  const list = useCommunityMemberList(community.slug);
  const history = useCommunityMemberHistory(
    community.slug,
    `${list.scope}:${community.canRestrictMembers}`,
  );
  const actions = useCommunityMemberActions({
    slug: community.slug,
    canRestrict: community.canRestrictMembers,
    onChanged,
    refresh: () => {
      history.close();
      return list.reload();
    },
  });
  const draft = actions.draft;
  const busy = actions.busyId !== null;
  return (
    <section className="mt-4 text-sm">
      <CommunityMemberListControls
        q={list.q}
        status={list.status}
        pageSize={list.pageSize}
        pagination={list.pagination}
        busy={actions.locked}
        loading={list.rows === null}
        statuses={[
          { value: 'pending', label: '가입 대기' },
          { value: 'active', label: '활성' },
          { value: 'suspended', label: '정지' },
          { value: 'rejected', label: '반려' },
          { value: 'withdrawn', label: '탈퇴' },
        ]}
        onFilter={(next) => {
          if (!actions.locked) {
            history.close();
            list.changeFilter(next);
          }
        }}
        onPage={(next) => {
          if (!actions.locked) {
            history.close();
            list.changePage(next);
          }
        }}
      />

      {draft && (
        <div
          role="dialog"
          aria-labelledby="member-action-title"
          className="mt-4 space-y-3 rounded border bg-gray-50 p-4"
        >
          <h2 id="member-action-title" className="font-semibold">
            {MEMBER_ACTION_LABEL[draft.action]}
          </h2>
          <p>
            처리 대상: {draft.row.name ?? '회원'} ·{' '}
            {draft.row.emailMasked ?? '-'}
          </p>
          <p className="text-xs text-gray-600">
            현재 상태: {MEMBER_STATUS_LABEL[draft.row.status]} ·{' '}
            {MEMBER_ROLE_LABEL[draft.row.role]}
          </p>
          {draft.action === 'withdraw' && (
            <p>
              이 커뮤니티 가입만 종료합니다. 공통 계정과 다른 커뮤니티 가입은
              유지됩니다.
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              actions.submit();
            }}
            className="space-y-3"
          >
            <label className="block">
              처리 사유{draft.action === 'reject' ? ' (선택)' : ' (필수)'}
              <textarea
                aria-label="처리 사유"
                value={draft.reason}
                disabled={busy}
                maxLength={1000}
                rows={3}
                aria-describedby="member-reason-help"
                onChange={(e) => actions.setReason(e.target.value)}
                className="mt-1 block w-full rounded border p-2"
              />
            </label>
            <p id="member-reason-help" className="text-xs text-gray-500">
              1000자 이내로 작성하고 개인정보는 입력하지 마세요.
            </p>
            {actions.error && (
              <p role="alert" className="text-red-600">
                {actions.error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={busy}
                className="min-h-11 rounded bg-primary-600 px-4 text-white disabled:opacity-50"
              >
                {busy ? '처리 중…' : '처리 확인'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={actions.cancel}
                className="min-h-11 rounded border px-4 disabled:opacity-50"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {community.canRestrictMembers && history.target && (
        <div className="mt-3 rounded border p-3" aria-label="회원 변경 이력">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">
              {history.target.name ?? '회원'} 님의 변경 이력 (최근 50건)
            </h2>
            <button
              type="button"
              onClick={history.close}
              className="min-h-11 rounded border px-3"
            >
              이력 닫기
            </button>
          </div>
          <p className="text-xs text-gray-500">
            {history.target.emailMasked ?? '-'}
          </p>
          {history.error && (
            <>
              <p role="alert" className="mt-2 text-red-600">
                {history.error}
              </p>
              <button
                type="button"
                disabled={actions.locked}
                onClick={history.retry}
                className="min-h-11 rounded border px-3"
              >
                이력 다시 조회
              </button>
            </>
          )}
          {history.changes === null && !history.error && (
            <p role="status">변경 이력을 불러오는 중입니다…</p>
          )}
          {history.changes?.length === 0 && <p>변경 이력이 없습니다.</p>}
          {history.changes && history.changes.length > 0 && (
            <ul>
              {history.changes.map((change) => (
                <li key={change.id} className="mt-3 break-words text-xs">
                  <p>
                    {new Date(change.created_at).toLocaleString('ko-KR')} ·{' '}
                    {change.actor_name ?? '시스템'} ·{' '}
                    {MEMBER_ACTION_LABEL[change.action as MemberAction] ??
                      change.action}
                  </p>
                  <p>
                    역할:{' '}
                    {MEMBER_ROLE_LABEL[change.before_role ?? ''] ??
                      change.before_role ??
                      '-'}{' '}
                    →{' '}
                    {MEMBER_ROLE_LABEL[change.after_role] ?? change.after_role}
                  </p>
                  <p>
                    상태:{' '}
                    {MEMBER_STATUS_LABEL[change.before_status ?? ''] ??
                      change.before_status ??
                      '-'}{' '}
                    →{' '}
                    {MEMBER_STATUS_LABEL[change.after_status] ??
                      change.after_status}
                  </p>
                  {change.reason && (
                    <p className="whitespace-pre-wrap">{change.reason}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {actions.notice && (
        <p role="status" className="mt-2 text-green-700">
          {actions.notice}
        </p>
      )}
      {actions.refreshWarning && (
        <p role="alert" className="mt-2 text-amber-700">
          {actions.refreshWarning}
        </p>
      )}
      {actions.error && !draft && (
        <p role="alert" className="mt-2 text-red-600">
          {actions.error}
        </p>
      )}
      {list.error && (
        <div>
          <p role="alert" className="mt-2 text-red-600">
            {list.error}
          </p>
          <button
            type="button"
            disabled={actions.locked}
            onClick={() => {
              void list.reload();
            }}
            className="min-h-11 rounded border px-3"
          >
            회원 목록 다시 조회
          </button>
        </div>
      )}
      {actions.refreshWarning && (
        <button
          type="button"
          disabled={actions.locked}
          onClick={() => {
            void actions.retryRefresh();
          }}
          className="min-h-11 rounded border px-3"
        >
          최신 목록 다시 조회
        </button>
      )}
      {list.rows === null && !list.error && (
        <p className="mt-3 text-gray-500">불러오는 중입니다…</p>
      )}
      {list.rows && list.rows.length > 0 && (
        <CommunityMemberTable
          rows={list.rows}
          locked={actions.locked}
          canRestrict={community.canRestrictMembers}
          onAction={actions.open}
          onHistory={(row) => {
            void history.open(row);
          }}
        />
      )}
      {list.rows?.length === 0 && (
        <p className="mt-3 text-gray-500">검색 조건에 맞는 회원이 없습니다.</p>
      )}
    </section>
  );
}
