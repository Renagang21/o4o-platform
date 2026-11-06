import MemberReviewInformation from './MemberReviewInformation';
import { useState } from 'react';
import { authClient } from '@o4o/auth-client';
import { MEMBER_STATUS_LABELS } from '@o4o/types';
import AccountErasureControls from '@/pages/platform/account-governance/AccountErasureControls';
import MemberProfileForm from './MemberProfileForm';
import MemberLifecycleActions from './MemberLifecycleActions';
import type { MemberDetail, MemberWorkMode } from './member-workspace-model';
export default function MemberWorkPanel({
  detail,
  actorId,
  busy,
  perform,
  onBusyChange,
  mode = 'detail',
  adminMode = false,
  onErasureResult,
  onModeChange,
  onAccessLost,
}: Readonly<{
  onAccessLost: () => void;
  onModeChange: (mode: MemberWorkMode) => void;
  onErasureResult?: (result: import('@/types/user').UserErasureResult) => void;
  adminMode?: boolean;
  onBusyChange: (value: boolean) => void;
  mode?: MemberWorkMode;
  detail: MemberDetail;
  actorId: string;
  busy: boolean;
  perform: (work: () => Promise<unknown>) => Promise<void>;
}>) {
  const { member, registration, permissions } = detail;
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(
      mode === 'reject' ? 'reject' : null,
    ),
    [reason, setReason] = useState('');
  const readOnly = member.operatorReadOnly && !adminMode;
  const editing = !readOnly && mode === 'edit' && permissions.edit;
  const reviewable = !readOnly && registration && registration.state !== 'approved';
  const initialLifecycle = ['suspended', 'withdrawn'].includes(
    member.serviceStatus ?? '',
  )
    ? 'restore'
    : 'terminate';
  return (
    <div className="space-y-4">
      {readOnly && <output className="block">전체 관리자 — 처리 대상 아님</output>}
      {adminMode &&
        mode === 'delete' &&
        permissions.erase &&
        actorId !== member.userId && (
          <section
            aria-label="계정·개인자료 완전삭제"
            className="rounded border border-red-300 bg-white p-4"
          >
            <h4 className="font-semibold">계정·개인자료 완전삭제</h4>
            <AccountErasureControls
              onResult={onErasureResult}
              onBusyChange={onBusyChange}
              accountId={actorId}
              userId={member.userId}
              onCompleted={() => {
                void perform(async () => undefined);
              }}
            />
          </section>
        )}
      {!readOnly && mode === 'delete' && (
        <MemberLifecycleActions
          adminMode={adminMode}
          initialAction={!adminMode ? initialLifecycle : null}
          detail={detail}
          actorId={actorId}
          busy={busy}
          perform={perform}
        />
      )}
      <p className="text-sm">
        회원 상태:{' '}
        {MEMBER_STATUS_LABELS[member.serviceStatus ?? ''] ?? '확인 필요'}
      </p>
      {!editing ? <MemberReviewInformation detail={detail} busy={busy} onBusyChange={onBusyChange} onAccessLost={onAccessLost} /> : <MemberProfileForm
        detail={detail}
        editing={editing}
        busy={busy}
        perform={perform}
        onCancel={() => onModeChange('detail')}
        onBusyChange={onBusyChange}
        onAccessLost={onAccessLost}
      />}
      {!editing && reviewable && actorId !== member.userId && (
        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setDecision('approve');
              setReason('');
            }}
          >
            가입 승인
          </button>
        </div>
      )}
      {!editing && decision && reviewable && (
        <form
          aria-label={decision === 'approve' ? '가입 승인' : '가입 반려'}
          className="space-y-3 rounded border bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (busy || !reason.trim()) return;
            void perform(() =>
              authClient.api.post(
                `/member-registration/members/${encodeURIComponent(member.userId)}/${decision}`,
                { version: member.version, reason: reason.trim() },
              ),
            );
          }}
        >
          <label className="block">
            처리 사유
            <textarea
              required
              maxLength={2000}
              className="block w-full rounded border p-2"
              disabled={busy}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <div className="flex gap-3">
            <button type="submit" disabled={busy || !reason.trim()}>
              {decision === 'approve' ? '가입 승인 처리' : '가입 반려 처리'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setDecision(null);
                setReason('');
              }}
            >
              취소
            </button>
          </div>
        </form>
      )}
      {detail.history.length > 0 && (
        <details>
          <summary>처리 이력</summary>
          <ul>
            {detail.history.map((item, index) => (
              <li key={`${item.createdAt}-${index}`}>
                {item.createdAt} · {item.action}
                {item.reason ? ` · ${item.reason}` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
