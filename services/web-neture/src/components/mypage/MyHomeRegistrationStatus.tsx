/**
 * My Home 모아보기의 「가입 신청」 상태 — 2026-11-13 사용자 지시(My Home 개선 1).
 *
 * 가입 흐름(약관 동의 → 역할별 가입 신청 → 제출 → 첫 화면)이 끝난 뒤에도 본인이 심사 상태 · 반려 사유를
 * 확인하고 다시 제출할 곳을 둔다. 승인됐거나 이 가입 신청 절차를 거치지 않은 기존 계정에는 보이지 않는다.
 * 기존 GET /member-registration/self 를 그대로 읽는다(새 API 없음). 내용 확인 · 수정은 가입 신청 화면(/signup)에서 한다.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MEMBER_REGISTRATION_TYPES, type MemberRegistrationType } from '@o4o/types';
import { authClient } from '../../lib/apiClient';

type SelfRegistration = {
  requiresRegistration: boolean;
  canSubmit: boolean;
  registration: { type: MemberRegistrationType | null; state: 'pending' | 'approved' | 'rejected'; reason?: string | null } | null;
};

type View = { tone: 'info' | 'warn' | 'error'; title: string; body: string; reason?: string; action: string };

export function registrationStatusView(data: SelfRegistration | null): View | null {
  const reg = data?.registration;
  if (!data || !reg || reg.state === 'approved') return null;
  const typeLabel = reg.type ? MEMBER_REGISTRATION_TYPES[reg.type] : null;
  if (data.requiresRegistration || !reg.type)
    return { tone: 'warn', title: '가입 신청을 마쳐 주세요', body: '역할(약사 · 약국경영자 · 공급자 등)을 고르고 필요한 정보를 입력하면 심사가 시작됩니다.', action: '가입 신청하기' };
  if (reg.state === 'rejected')
    return { tone: 'error', title: '가입 신청이 반려되었습니다', body: `${typeLabel ?? '가입'} 신청을 고쳐서 다시 제출할 수 있습니다.`, reason: reg.reason ?? undefined, action: '고쳐서 다시 제출' };
  if (data.canSubmit)
    return { tone: 'warn', title: '가입 신청을 아직 제출하지 않았습니다', body: `${typeLabel ?? '가입'} 신청서를 확인하고 제출해 주시기 바랍니다.`, action: '이어서 작성' };
  return { tone: 'info', title: '가입 신청을 심사하고 있습니다', body: `${typeLabel ?? '가입'} 신청이 접수되었습니다. 승인되면 해당 업무를 이용할 수 있습니다.`, action: '제출 내용 보기' };
}

const TONE: Record<View['tone'], string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  warn: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-red-200 bg-red-50 text-red-900',
};

export function MyHomeRegistrationStatus({ accountId }: { accountId: string }) {
  const [data, setData] = useState<SelfRegistration | null>(null);
  useEffect(() => {
    let current = true;
    setData(null);
    // 조회 실패는 표시하지 않는다 — 보조 안내이며, 업무 권한은 각 서버가 다시 확인한다.
    authClient.api.get('/member-registration/self')
      .then(response => { if (current) setData(response.data?.data ?? null); })
      .catch(() => undefined);
    return () => { current = false; };
  }, [accountId]);
  const view = registrationStatusView(data);
  if (!view) return null;
  return (
    <section aria-label="가입 신청 상태" className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${TONE[view.tone]}`}>
      <div className="min-w-0">
        <h2 className="font-semibold">{view.title}</h2>
        <p className="mt-1 text-sm">{view.body}</p>
        {view.reason && <p className="mt-1 break-words text-sm">반려 사유: {view.reason}</p>}
      </div>
      <Link to="/signup" className="min-h-11 shrink-0 content-center rounded-lg bg-white px-4 text-sm font-semibold no-underline shadow-sm">
        {view.action} →
      </Link>
    </section>
  );
}
