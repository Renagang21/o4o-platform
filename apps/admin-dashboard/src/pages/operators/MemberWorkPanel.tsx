import MemberReviewInformation from './MemberReviewInformation';
import { useState } from 'react';
import { authClient } from '@o4o/auth-client';
import { MEMBER_STATUS_LABELS } from '@o4o/types';
import MemberProfileForm from './MemberProfileForm';
import MemberLifecycleActions from './MemberLifecycleActions';
import type { MemberDetail, MemberWorkMode, Perform } from './member-workspace-model';
const REGISTRATION_STATE_LABELS: Record<string, string> = { pending: '승인 대기', rejected: '반려됨 — 보완 후 다시 처리 가능' };
export default function MemberWorkPanel({
  detail,
  actorId,
  busy,
  perform,
  onBusyChange,
  mode = 'detail',
  adminMode = false,
  onModeChange,
  onAccessLost,
}: Readonly<{
  onAccessLost: () => void;
  onModeChange: (mode: MemberWorkMode) => void;
  adminMode?: boolean;
  onBusyChange: (value: boolean) => void;
  mode?: MemberWorkMode;
  detail: MemberDetail;
  actorId: string;
  busy: boolean;
  perform: Perform;
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
      {/* 가입 승인·반려는 패널 맨 위에서 처리한다. 제출 정보는 그 아래에서 확인한다. */}
      {!editing && reviewable && actorId !== member.userId && (
        <section aria-label="가입 신청 처리" className="space-y-3 rounded border border-blue-200 bg-blue-50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold">가입 신청 처리</h4>
            <span className="text-sm text-slate-600">{REGISTRATION_STATE_LABELS[registration?.state ?? ''] ?? '확인 필요'}</span>
            <div className="ml-auto flex gap-2">
              <button type="button" disabled={busy} aria-pressed={decision === 'approve'} className={`rounded border px-3 py-1.5 ${decision === 'approve' ? 'border-blue-700 bg-blue-700 text-white' : 'bg-white'}`} onClick={() => { setDecision('approve'); setReason(''); }}>승인</button>
              <button type="button" disabled={busy} aria-pressed={decision === 'reject'} className={`rounded border px-3 py-1.5 ${decision === 'reject' ? 'border-red-600 bg-red-600 text-white' : 'bg-white'}`} onClick={() => { setDecision('reject'); setReason(''); }}>반려</button>
            </div>
          </div>
          {decision && (
            <form
              aria-label={decision === 'approve' ? '가입 승인' : '가입 반려'}
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (busy || !reason.trim()) return;
                const who = member.name || '선택한 회원';
                void perform(() =>
                  authClient.api.post(
                    `/member-registration/members/${encodeURIComponent(member.userId)}/${decision}`,
                    { version: member.version, reason: reason.trim() },
                  ),
                { close: true, done: decision === 'approve' ? `${who} 회원의 가입을 승인했습니다. 목록의 「회원 상태」에서 확인할 수 있습니다.` : `${who} 회원의 가입을 반려했습니다. 목록의 「회원 상태」가 반려로 바뀝니다.` });
              }}
            >
              <label className="block text-sm">
                {decision === 'approve' ? '승인 사유' : '반려 사유 (회원이 보완할 내용)'}
                <textarea
                  required
                  autoFocus
                  aria-label="처리 사유"
                  maxLength={2000}
                  rows={3}
                  className="mt-1 block w-full rounded border bg-white p-2"
                  disabled={busy}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              <div className="flex gap-2">
                <button type="submit" disabled={busy || !reason.trim()} className={`rounded px-3 py-1.5 text-white disabled:opacity-50 ${decision === 'approve' ? 'bg-blue-700' : 'bg-red-600'}`}>
                  {decision === 'approve' ? '가입 승인 처리' : '가입 반려 처리'}
                </button>
                <button type="button" disabled={busy} className="rounded border bg-white px-3 py-1.5" onClick={() => { setDecision(null); setReason(''); }}>취소</button>
              </div>
            </form>
          )}
        </section>
      )}
      {/* 계정 삭제는 목록의 「계정 삭제」(확인 창 → 바로 삭제)에서만 한다(#990). 이 패널은 이용 복구 · 약국 이전 · 폐업만 다룬다. */}
      {!readOnly && (mode === 'delete' || mode === 'terminate' || mode === 'restore') && (
        <MemberLifecycleActions
          adminMode={adminMode}
          initialAction={mode === 'terminate' || mode === 'restore' ? mode : !adminMode ? initialLifecycle : null}
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
